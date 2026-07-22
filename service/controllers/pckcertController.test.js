/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import ControllerTestContext from './ControllerTestContext.js';
import sinon from 'sinon';
import { expect } from 'chai';
import assert from 'assert/strict';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';

class TestContext extends ControllerTestContext {
    constructor() {
        super('./pckcertController.js');
        this.certData = {
            data: [
                { key: Constants.SGX_TCBM, value: 'tcbm' },
                { key: Constants.SGX_FMSPC, value: 'fmspc' },
                { key: Constants.SGX_PCK_CERTIFICATE_CA_TYPE, value: 'ca-type' },
                { key: Constants.SGX_PCK_CERTIFICATE_ISSUER_CHAIN, value: 'issuer-chain' }
            ],
            pemCert: 'pem-cert'
        };
        this.qeid = 'A'.repeat(32);
        this.cpusvn = 'B'.repeat(32);
        this.pcesvn = 'C'.repeat(4);
        this.pceid = 'D'.repeat(4);
        this.encrypted_ppid = 'E'.repeat(768);
        this.pckcertService = {
            getPckCert: sinon.stub()
        };
        this.serviceStubs = {
            '../services/pckcertService.js': this.pckcertService
        };
    }

    getRequest() {
        return {
            query: {
                qeid:           this.qeid,
                cpusvn:         this.cpusvn,
                pcesvn:         this.pcesvn,
                pceid:          this.pceid,
                encrypted_ppid: this.encrypted_ppid
            }
        };
    }

    getCert() {
        const cert = { cert: this.certData.pemCert };
        this.certData.data.forEach(({ key, value }) => {
            cert[key] = value;
        });
        return cert;
    }

    verifyCertHeaders(response) {
        this.certData.data.forEach(({ key, value }) => {
            expect(response.header.calledWith(key, value)).to.be.true;
        });
    }
}

describe('pckcertController', () => {
    describe('Positive test cases', () => {
        it('positive getPckCert', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.pckcertService.getPckCert.resolves(ctx.getCert());

            await target.getPckCert(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.pckcertService.getPckCert.calledWith(
                ctx.qeid,
                ctx.cpusvn,
                ctx.pcesvn,
                ctx.pceid,
                ctx.encrypted_ppid
            )).to.be.true;
            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            ctx.verifyCertHeaders(ctx.response);
            expect(ctx.response.header.calledWith('Content-Type', 'application/x-pem-file')).to.be.true;
            expect(ctx.response.send.calledWith(ctx.certData.pemCert)).to.be.true;
        });
    });

    describe('Input validation', () => {

        it('invalid qeid', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.qeid = 'invalidQeid'.repeat(24);

            await assert.rejects(
                () => target.getPckCert(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcertService.getPckCert.notCalled).to.be.true;
        });

        it('invalid cpusvn', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.cpusvn = 'invalidCpusvn';

            await assert.rejects(
                () => target.getPckCert(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcertService.getPckCert.notCalled).to.be.true;
        });

        it('invalid pcesvn', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.pcesvn = 'invalidPcesvn';

            await assert.rejects(
                () => target.getPckCert(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcertService.getPckCert.notCalled).to.be.true;
        });

        it('invalid pceid', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.pceid = 'invalidPceid';

            await assert.rejects(
                () => target.getPckCert(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcertService.getPckCert.notCalled).to.be.true;
        });

        it('invalid encrypted_ppid', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.encrypted_ppid = 'invalidEncryptedPpid';

            await assert.rejects(
                () => target.getPckCert(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcertService.getPckCert.notCalled).to.be.true;
        });
    });
});
