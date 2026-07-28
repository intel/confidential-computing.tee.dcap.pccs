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

import { tcbinfoService, validatorService } from '../services/index.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';
import * as appUtil from '../utils/apputil.js';

async function getTcbInfo(req, res, next, type) {

    try {
        // validate request parameters
        const version = appUtil.getApiVersionFromUrl(req.originalUrl);
        const fmspc = validatorService.validateAndNormalizeFmspc(req.query.fmspc);
        const update_type = validatorService.validateAndNormalizeUpdateType(req.query.update);

        // call service
        const tcbinfoJson = await tcbinfoService.getTcbInfo(type, fmspc, version, update_type);
        const issuerChainName = appUtil.getTcbInfoIssuerChainName(version);

        // send response
        res
            .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
            .header(
                issuerChainName,
                tcbinfoJson[issuerChainName]
            )
            .header('Content-Type', 'application/json')
            .send(tcbinfoJson.tcbinfo);
    } catch (err) {
        next(err);
    }
}

export async function getSgxTcbInfo(req, res, next) {
    await getTcbInfo(req, res, next, Constants.PROD_TYPE_SGX);
}

export async function getTdxTcbInfo(req, res, next) {
    await getTcbInfo(req, res, next, Constants.PROD_TYPE_TDX);
}
