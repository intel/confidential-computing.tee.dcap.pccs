/*
 * Copyright (C) 2011-2026 Intel Corporation
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */
import PccsError from '../utils/PccsError.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';
import logger from '../utils/Logger.js';
import X509 from '../x509/x509.js';
import * as pckcertDao from '../dao/pckcertDao.js';
import * as enclaveIdentityDao from '../dao/enclaveIdentityDao.js';
import * as pckcrlDao from '../dao/pckcrlDao.js';
import * as platformTcbsDao from '../dao/platformTcbsDao.js';
import * as platformsDao from '../dao/platformsDao.js';
import * as fmspcTcbDao from '../dao/fmspcTcbDao.js';
import * as pckCertchainDao from '../dao/pckCertchainDao.js';
import * as pcsCertificatesDao from '../dao/pcsCertificatesDao.js';
import * as crlCacheDao from '../dao/crlCacheDao.js';
import * as pcsClient from '../pcs_client/pcs_client.js';
import * as appUtil from '../utils/apputil.js';
import { sequelize } from '../dao/models/index.js';
import { cachingModeManager } from './caching_modes/cachingModeManager.js';
import { selectBestPckCert } from '../pckCertSelection/pckCertSelection.js';

// Refresh the enclave_identities table
async function refreshEnclaveIdentities() {
    let enclaveIdList;
    if (global.PCS_VERSION === 3) {
        enclaveIdList = [
            [Constants.QE_IDENTITY_ID, 3],
            [Constants.QVE_IDENTITY_ID, 3],
        ];
    } else if (global.PCS_VERSION === 4) {
        enclaveIdList = [
            [Constants.QE_IDENTITY_ID, 3],
            [Constants.QVE_IDENTITY_ID, 3],
            [Constants.QE_IDENTITY_ID, 4],
            [Constants.QVE_IDENTITY_ID, 4],
            [Constants.TDQE_IDENTITY_ID, 4],
        ];
    }
    const updateTypes = [Constants.UPDATE_TYPE_STANDARD, Constants.UPDATE_TYPE_EARLY];
    const pckServerResponses = await Promise.all(enclaveIdList
        .flatMap(enclaveId => updateTypes.map(updateType => [enclaveId, updateType]))
        .map(async([enclaveId, updateType]) => {
            const pckServerRes = await pcsClient.getEnclaveIdentity(
                enclaveId[0],
                enclaveId[1],
                updateType
            );
            if (pckServerRes.statusCode === Constants.HTTP_SUCCESS) {
                // Then refresh cache DB
                await enclaveIdentityDao.upsertEnclaveIdentity(
                    enclaveId[0],
                    pckServerRes.rawBody,
                    enclaveId[1],
                    updateType
                );
            } else {
                // Let it continue even though the collateral doesn't exist
                logger.debug("Couldn't get enclave identity for (id:%d,version:%d,type:%s)", enclaveId[0], enclaveId[1], updateType);
            }
            return pckServerRes;
        })
    );
    const somePositivePckServerResponse = pckServerResponses.find(pckServerRes => pckServerRes.statusCode === Constants.HTTP_SUCCESS);
    if (somePositivePckServerResponse === undefined) {
        return;
    }
    await pcsCertificatesDao.upsertEnclaveIdentityIssuerChain(
        pcsClient.getHeaderValue(
            somePositivePckServerResponse.headers,
            Constants.SGX_ENCLAVE_IDENTITY_ISSUER_CHAIN
        )
    );
}

// Refresh all PCK certs in the database
async function refreshAllPckcerts(fmspcArray) {
    const platformTcbs = await platformTcbsDao.getPlatformTcbs(fmspcArray);

    const platformTcbsGrouped = platformTcbs.reduce((acc, tcb) => { //TODO: replace with Object.groupBy when we support Node 21+
        const key = `${tcb.qe_id}_${tcb.pce_id}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(tcb);
        return acc;
    }, {});
    await Promise.all(Object.entries(platformTcbsGrouped).map(async kv => {
        const platformTcbs = kv[1];
        const qeId = platformTcbs[0].qe_id;
        const pceId = platformTcbs[0].pce_id;

        // new platform detected
        const platform = await platformsDao.getPlatform(
            qeId,
            pceId
        );
        // contact Intel PCS server to get PCK certs
        const pckServerCertsRes = platform.platform_manifest ?
            await pcsClient.getCertsWithManifest(
                platform.platform_manifest,
                pceId
            ) :
            await pcsClient.getCerts(
                platform.enc_ppid,
                pceId
            );

        // check HTTP status
        if (pckServerCertsRes.statusCode !== Constants.HTTP_SUCCESS) {
            throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
        }

        const pckCertChain = pcsClient.getHeaderValue(
            pckServerCertsRes.headers,
            Constants.SGX_PCK_CERTIFICATE_ISSUER_CHAIN
        );

        // Parse the response body
        const pckcerts = JSON.parse(pckServerCertsRes.body);
        if (pckcerts.length === 0) {
            logger.error("The response body doesn't include PCK certificates.");
            throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
        }

        // Get fmspc and ca type from response header
        const fmspc = pcsClient
            .getHeaderValue(pckServerCertsRes.headers, Constants.SGX_FMSPC)
            .toUpperCase();
        const caType = pcsClient
            .getHeaderValue(
                pckServerCertsRes.headers,
                Constants.SGX_PCK_CERTIFICATE_CA_TYPE
            )
            .toUpperCase();

        if (fmspc === null || caType === null) {
            logger.error("The response header doesn't include fmspc or ca.");
            throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
        }

        // get tcbinfo for this fmspc

        const pckServerTcbRes = await pcsClient.getTcb(Constants.PROD_TYPE_SGX, fmspc, global.PCS_VERSION, Constants.UPDATE_TYPE_EARLY);
        if (pckServerTcbRes.statusCode !== Constants.HTTP_SUCCESS) {
            throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
        }
        const tcbInfoObj = JSON.parse(pckServerTcbRes.body).tcbInfo;

        // flush and add PCK certs
        await pckcertDao.deleteCerts(qeId, pceId);
        await Promise.all(pckcerts.map(async pckcert => await pckcertDao.upsertPckCert(
            qeId,
            pceId,
            pckcert.tcbm,
            decodeURIComponent(pckcert.cert)
        )));

        await Promise.all(platformTcbs.map(async platformTcb => {
            // unescape certificates
            const decodedCerts = pckcerts.map(cert => ({
                tcbm:     cert.tcbm.toUpperCase(),
                pck_cert: decodeURIComponent(cert.cert)
            }));

            // get the best cert
            let selectedPckCert;
            try {
                selectedPckCert = selectBestPckCert(platformTcb.cpu_svn, platformTcb.pce_svn, platformTcb.pce_id, decodedCerts, tcbInfoObj);
            } catch {
                throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
            }

            await platformTcbsDao.upsertPlatformTcbs(
                platformTcb.qe_id,
                platformTcb.pce_id,
                platformTcb.cpu_svn,
                platformTcb.pce_svn,
                selectedPckCert.tcbm
            );
        }));

        if (pckCertChain) {
            // Update pckCertChain
            await pckCertchainDao.upsertPckCertchain(caType);
            // Update or insert SGX_PCK_CERTIFICATE_ISSUER_CHAIN
            await pcsCertificatesDao.upsertPckCertificateIssuerChain(
                caType,
                pckCertChain
            );
        }
    }));
}

// Refresh the crl record for the specified ca
async function refreshOneCrl(ca) {
    const pckServerRes = await pcsClient.getPckCrl(ca);
    if (pckServerRes.statusCode === Constants.HTTP_SUCCESS) {
        // Then refresh cache DB
        await pckcrlDao.upsertPckCrl(ca, pckServerRes.rawBody);
        await pcsCertificatesDao.upsertPckCrlCertchain(
            ca,
            pcsClient.getHeaderValue(
                pckServerRes.headers,
                Constants.SGX_PCK_CRL_ISSUER_CHAIN
            )
        );
    } else {
        throw new PccsError(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE);
    }
}

// Refresh all PCK CRLs
async function refreshPckCrls() {
    const pckcrls = await pckcrlDao.getAllPckCrls();
    await Promise.all(pckcrls.map(async pckcrl => await refreshOneCrl(pckcrl.ca)));
}

// Refresh root CA CRL
async function refreshRootcaCrl() {
    const rootca = await pcsCertificatesDao.getCertificateById(
        Constants.ROOT_CERT_ID
    );
    if (!rootca) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }

    const x509 = new X509();
    if (!x509.parseCert(decodeURIComponent(rootca.cert)) || !x509.cdpUri) {
        logger.error('Invalid PCS certificate.');
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }

    rootca.crl = await pcsClient.getFileFromUrl(x509.cdpUri);

    await pcsCertificatesDao.upsertPcsCertificates({
        id:  rootca.id,
        crl: rootca.crl,
    });
}

// Refresh crl_cache table
async function refreshCachedCrls() {
    const crlCaches = await crlCacheDao.getAllCrls();
    await Promise.all(crlCaches.map(async crlCache => {
        // refresh each crl
        const crl = await pcsClient.getFileFromUrl(crlCache.cdp_url);
        return await crlCacheDao.upsertCrl(crlCache.cdp_url, crl);
    }));
}

// Refresh the TCB info for the specified fmspc value
async function refreshOneTcb(fmspc, type, version, updateType) {
    const pckServerRes = await pcsClient.getTcb(type, fmspc, version, updateType);
    if (pckServerRes.statusCode === Constants.HTTP_SUCCESS) {
        // Then refresh cache DB
        await fmspcTcbDao.upsertFmspcTcb({
            type,
            fmspc,
            version,
            update_type: updateType,
            tcbinfo:     pckServerRes.rawBody,
        });
        // update or insert certificate chain
        await pcsCertificatesDao.upsertTcbInfoIssuerChain(
            pcsClient.getHeaderValue(
                pckServerRes.headers,
                appUtil.getTcbInfoIssuerChainName(version)
            )
        );
    } else {
        logger.error(`Failed to get tcbinfo for fmspc:${fmspc}`);
        throw new PccsError(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE);
    }
}

// Refresh all TCBs in the table
async function refreshAllTcbs() {
    // hotfix : delete type==null records
    await fmspcTcbDao.deleteInvalidTcbs();

    const tcbs = await fmspcTcbDao.getAllTcbs();
    await Promise.all(tcbs.map(async tcb => refreshOneTcb(tcb.fmspc, tcb.type, tcb.version, tcb.update_type)));
}

export async function refreshCache(type, fmspc) {
    if (!cachingModeManager.isRefreshable()) {
        throw new PccsError(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE);
    }

    if (type === 'certs') {
        await sequelize.transaction(async() => {
            await refreshAllPckcerts(fmspc);
        });
    } else {
        await sequelize.transaction(async() => {
            await refreshPckCrls();
            await refreshAllTcbs();
            await refreshEnclaveIdentities();
            await refreshRootcaCrl();
            await refreshCachedCrls();
        });
    }
}

// Schedule the refresh job in cron-style
// # ┌───────────── minute (0 - 59)
// # │ ┌───────────── hour (0 - 23)
// # │ │ ┌───────────── day of the month (1 - 31)
// # │ │ │ ┌───────────── month (1 - 12)
// # │ │ │ │ ┌───────────── day of the week (0 - 6) (Sunday to Saturday;
// # │ │ │ │ │                                   7 is also Sunday on some systems)
// # │ │ │ │ │
// # │ │ │ │ │
// # * * * * * command to execute
//

export async function scheduledRefresh() {
    try {
        if (!cachingModeManager.isRefreshable()) {
            return;
        }

        await sequelize.transaction(async() => {
            await refreshPckCrls();
            await refreshAllTcbs();
            await refreshEnclaveIdentities();
            await refreshRootcaCrl();
            await refreshCachedCrls();
        });

        logger.info('Scheduled cache refresh is completed successfully.');
    } catch {
        logger.error('Scheduled cache refresh failed.');
    }
}
