/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import logger from '../utils/Logger.js';

export default function v3EolWarning(req, res, next) {
    const warningMessage = 'PCS API version 3 is no longer available. Cached collateral downloaded from API version 3 is deprecated, will not be refreshed, and may expire. Please migrate to API version 4.';
    logger.warn(warningMessage);
    res.setHeader('Warning', `299 - "${warningMessage}"`);
    next();
}
