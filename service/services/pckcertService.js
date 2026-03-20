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
import * as pckcertDao from '../dao/pckcertDao.js';
import * as platformTcbsDao from '../dao/platformTcbsDao.js';
import * as platformsDao from '../dao/platformsDao.js';
import * as fmspcTcbDao from '../dao/fmspcTcbDao.js';
import * as pckCertchainDao from '../dao/pckCertchainDao.js';
import { cachingModeManager } from './caching_modes/cachingModeManager.js';
import { selectBestPckCert } from '../pckCertSelection/pckCertSelection.js';
import logger from '../utils/Logger.js';

// If a new raw TCB was reported, needs to run PCK Cert Selection for this raw TCB
export async function pckCertSelection(
    qeid,
    cpusvn,
    pcesvn,
    pceid,
    enc_ppid,
    fmspc,
    ca
) {
    const pck_certs = await pckcertDao.getCerts(qeid, pceid);
    if (pck_certs === null) {
        throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
    }

    // Always use SGX tcb info for PCK cert selection
    let tcbinfo = await fmspcTcbDao.getTcbInfo(Constants.PROD_TYPE_SGX, fmspc, global.PCS_VERSION, Constants.UPDATE_TYPE_EARLY);
    if (tcbinfo === null) {
        tcbinfo = await fmspcTcbDao.getTcbInfo(Constants.PROD_TYPE_SGX, fmspc, global.PCS_VERSION, Constants.UPDATE_TYPE_STANDARD);
    }
    if (tcbinfo === null || tcbinfo.tcbinfo === null) {
        logger.error(`No TCB info for the fmspc : ${fmspc}`);
        throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
    }

    const tcbInfoObject = JSON.parse(tcbinfo.tcbinfo.toString('utf8')).tcbInfo;

    let selectedPckCert;
    try {
        selectedPckCert = selectBestPckCert(cpusvn, pcesvn, pceid, pck_certs, tcbInfoObject);
    } catch {
        throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
    }

    const certchain = await pckCertchainDao.getPckCertChain(ca);
    if (certchain === null) {
        logger.error(`No certchain for : ${ca}`);
        throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
    }

    const result = {
        cert: selectedPckCert.pck_cert
    };
    result[Constants.SGX_TCBM] = selectedPckCert.tcbm;
    result[Constants.SGX_FMSPC] = fmspc;
    result[Constants.SGX_PCK_CERTIFICATE_CA_TYPE] = ca;
    result[Constants.SGX_PCK_CERTIFICATE_ISSUER_CHAIN] = certchain.intmd_cert + certchain.root_cert;

    // create an entry for the new TCB level in platform_tcbs table
    await platformTcbsDao.upsertPlatformTcbs(
        qeid,
        pceid,
        cpusvn,
        pcesvn,
        selectedPckCert.tcbm
    );

    return result;
}

export async function getPckCert(qeid, cpusvn, pcesvn, pceid, enc_ppid) {
    let pckcert = null;

    const platform = await platformsDao.getPlatform(qeid, pceid);
    if (platform !== null) {
        // query pck cert from cache DB
        pckcert = await pckcertDao.getCert(qeid, cpusvn, pcesvn, pceid);
    }

    let result = {};
    if (pckcert === null) {
        if (platform === null) {
            result = await cachingModeManager.getPckCertFromPCS(
                qeid,
                cpusvn,
                pcesvn,
                pceid,
                enc_ppid,
                platform ? platform.platform_manifest : ''
            );
        } else {
            // Always treat presence of platform record as platform collateral is cached
            result = await pckCertSelection(
                qeid,
                cpusvn,
                pcesvn,
                pceid,
                enc_ppid,
                platform.fmspc,
                platform.ca
            );
        }
    } else {
        result[Constants.SGX_TCBM] = pckcert.tcbm;
        result[Constants.SGX_FMSPC] = platform.fmspc;
        result[Constants.SGX_PCK_CERTIFICATE_CA_TYPE] = platform.ca;
        result[Constants.SGX_PCK_CERTIFICATE_ISSUER_CHAIN] =
            pckcert.intmd_cert + pckcert.root_cert;
        result.cert = pckcert.pck_cert;
    }

    return result;
}
