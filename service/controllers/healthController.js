/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import { healthService } from '../services/index.js';
import PccsStatus from '../constants/pccs_status_code.js';

export async function getLiveness(req, res, next) {
    try {
        res
            .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
            .send({
                status:    'UP',
                timestamp: new Date().toISOString(),
            });
    } catch (err) {
        next(err);
    }
}

export async function getReadiness(req, res, next) {
    try {
        // call service
        const db = await healthService.checkDbReady();

        // send response
        if (db.ready) {
            res
                .status(PccsStatus.PCCS_STATUS_SUCCESS[0])
                .send({
                    status:    'UP',
                    db:        'CONNECTED',
                    latency:   `${db.latency}ms`,
                    timestamp: new Date().toISOString(),
                });
        } else {
            res
                .status(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE[0])
                .send({
                    status:    'DOWN',
                    db:        'DISCONNECTED',
                    timestamp: new Date().toISOString(),
                });
        }
    } catch (err) {
        next(err);
    }
}

export async function getStartup(req, res, next) {
    try {
        // call service
        const started = healthService.isStartupComplete();

        // send response
        const statusCode = started ?
            PccsStatus.PCCS_STATUS_SUCCESS[0] :
            PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE[0];
        res
            .status(statusCode)
            .send({
                status:    started ? 'STARTED' : 'STARTING',
                timestamp: new Date().toISOString(),
            });
    } catch (err) {
        next(err);
    }
}
