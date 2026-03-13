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

import { identityService } from '../services/index.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';
import * as appUtil from '../utils/apputil.js';
import logger from '../utils/Logger.js';
import PccsError from '../utils/PccsError.js';

async function getEnclaveIdentity(req, res, next, enclave_id) {
    try {
        const update_type = req.query.update ? req.query.update.toUpperCase() : Constants.UPDATE_TYPE_STANDARD;

        if (update_type !== Constants.UPDATE_TYPE_STANDARD && update_type !== Constants.UPDATE_TYPE_EARLY) {
            logger.error(`Invalid update type : ${update_type}`);
            throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
        }

        // call service
        const version = appUtil.getApiVersionFromUrl(req.originalUrl);
        const enclaveIdentityJson = await identityService.getEnclaveIdentity(
            enclave_id,
            version,
            update_type
        );

        // send response
        res
            .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
            .header(
                Constants.SGX_ENCLAVE_IDENTITY_ISSUER_CHAIN,
                enclaveIdentityJson[Constants.SGX_ENCLAVE_IDENTITY_ISSUER_CHAIN]
            )
            .header('Content-Type', 'application/json')
            .send(enclaveIdentityJson.identity);
    } catch (err) {
        next(err);
    }
}

export async function getEcdsaQeIdentity(req, res, next) {
    return getEnclaveIdentity(req, res, next, Constants.QE_IDENTITY_ID);
}

export async function getQveIdentity(req, res, next) {
    return getEnclaveIdentity(req, res, next, Constants.QVE_IDENTITY_ID);
}

export async function getTdQeIdentity(req, res, next) {
    return getEnclaveIdentity(req, res, next, Constants.TDQE_IDENTITY_ID);
}
