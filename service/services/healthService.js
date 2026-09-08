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
