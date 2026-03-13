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

async function up(sequelize) {
    await sequelize.transaction(async() => {
        logger.info('DB Migration (Ver.3 -> 4) -- Start');

        // update pcs_version table
        logger.debug('DB Migration -- Update pcs_version table');
        let sql = 'UPDATE pcs_version SET db_version=4,api_version=4';
        await sequelize.query(sql);

        // create appraisal_policies table
        logger.debug('DB Migration -- create appraisal_policies');
        sql =
            'CREATE TABLE IF NOT EXISTS appraisal_policies (id VARCHAR(255) PRIMARY KEY, type INTEGER NOT NULL, policy TEXT NOT NULL, is_default INTEGER NOT NULL, ' +
            'fmspc VARCHAR(255) NOT NULL, created_time DATETIME NOT NULL, updated_time DATETIME NOT NULL)';
        await sequelize.query(sql);

        logger.info('DB Migration -- Done.');
    });
}

export default { up };
