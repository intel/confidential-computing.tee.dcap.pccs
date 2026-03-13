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

import { appraisalPolicyService } from '../services/index.js';
import PccsError from '../utils/PccsError.js';
import PccsStatus from '../constants/pccs_status_code.js';
import logger from '../utils/Logger.js';

export async function putAppraisalPolicy(req, res, next) {
    try {
        // call policy service
        const id = await appraisalPolicyService.putAppraisalPolicy(req.body);

        // send response
        res
            .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
            .send(id);
    } catch (err) {
        next(err);
    }
}

export async function getAppraisalPolicy(req, res, next) {
    try {
        const FMSPC_SIZE = 12;
        let fmspc = req.query.fmspc;
        if (!fmspc || fmspc.length !== FMSPC_SIZE) {
            logger.error(`fmspc is not valid : ${fmspc}`);
            throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
        }

        fmspc = fmspc.toUpperCase();

        const policies = await appraisalPolicyService.getDefaultAppraisalPolicies(fmspc);
        if (policies.length === 0) {
            logger.error(`No default appraisal policy found for fmspc : ${fmspc}`);
            throw new PccsError(PccsStatus.PCCS_STATUS_NO_CACHE_DATA);
        }

        // send response
        res
            .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
            .send(policies.map(policyRecord => policyRecord.policy).join(','));
    } catch (err) {
        next(err);
    }
}
