/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import logger from '../utils/Logger.js';
import PccsError from '../utils/PccsError.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';

function isHex(hexString, fieldName, expectedLength) {
    if (!hexString) {
        logger.error(`${fieldName} field is missing`);
        return false;
    }
    if (hexString.length !== expectedLength || !new RegExp(`^[0-9a-fA-F]{${expectedLength}}$`).test(hexString)) {
        logger.error(`${fieldName} field is not valid hex string : ${hexString}`);
        return false;
    }
    return true;
}

export function validateAndNormalizeFmspc(fmspc) {
    if (!isHex(fmspc, 'fmspc', 12)) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return fmspc.toUpperCase();
}

export function validateAndNormalizeCpusvn(cpusvn) {
    if (!isHex(cpusvn, 'cpusvn', 32)) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return cpusvn.toUpperCase();
}

export function validateAndNormalizePcesvn(pcesvn) {
    if (!isHex(pcesvn, 'pcesvn', 4)) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return pcesvn.toUpperCase();
}

export function validateAndNormalizePceid(pceid) {
    if (!isHex(pceid, 'pceid', 4)) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return pceid.toUpperCase();
}

export function validateAndNormalizeEncryptedPpid(encPpid) {
    // enc_ppid can be null
    if (encPpid === undefined || encPpid === null) {
        return encPpid;
    }
    if (!isHex(encPpid, 'encrypted ppid', 768)) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return encPpid.toUpperCase();
}

export function validateAndNormalizeQeId(qeid) {
    const QEID_MAX_SIZE = 260;
    if (!qeid) {
        logger.error(`qeid field is missing`);
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    if (qeid.length > QEID_MAX_SIZE) {
        logger.error(`qeid field is not valid length (max ${QEID_MAX_SIZE}) : ${qeid}`);
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return qeid.toUpperCase();
}

export function validateAndNormalizeUpdateType(update, canBeAll = false) {
    const updateType = update?.toUpperCase() ?? Constants.UPDATE_TYPE_STANDARD;
    const expectedTypes = [Constants.UPDATE_TYPE_STANDARD, Constants.UPDATE_TYPE_EARLY];
    if (canBeAll) {
        expectedTypes.push(Constants.UPDATE_TYPE_ALL);
    }

    if (!expectedTypes.includes(updateType)) {
        logger.error(`Invalid update type : ${updateType}`);
        throw new PccsError(PccsStatus.PCCS_STATUS_INVALID_REQ);
    }
    return updateType;
}
