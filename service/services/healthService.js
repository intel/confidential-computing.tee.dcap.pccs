/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import logger from '../utils/Logger.js';
import { sequelize } from '../dao/models/index.js';

// Set once the boot sequence in pccs_server.js has completed. The process exits
// rather than serving traffic when initialization fails, so this is only ever
// false for the brief window before the HTTPS listener accepts connections.
let startupComplete = false;

export function markStartupComplete() {
    startupComplete = true;
}

export function isStartupComplete() {
    return startupComplete;
}

// Readiness check for the caching database. Deliberately does NOT go through
// apputil.databaseCheck(): that runs the umzug migrations, which must not be
// driven by an unauthenticated request arriving every few seconds.
//
// authenticate() alone is not enough -- it issues 'SELECT 1+1', which succeeds
// against a database whose storage is unreadable -- so follow it with a real
// read of the smallest table in the schema.
export async function checkDbReady() {
    const start = Date.now();
    try {
        await sequelize.authenticate();
        await sequelize.query('select 1 from pcs_version limit 1', {
            type: sequelize.QueryTypes.SELECT,
        });
        return { ready: true, latency: Date.now() - start };
    } catch (err) {
        // the driver message can name the database host, port and user, so it is
        // logged here and never returned: /healthz/ready is unauthenticated
        logger.error(`Caching database readiness check failed: ${err.message}`);
        return { ready: false, latency: Date.now() - start };
    }
}
