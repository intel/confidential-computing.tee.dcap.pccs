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
        super('./pckcrlController.js');
        this.ca = 'processor';
        this.encoding = undefined;
        this.crlData = {
            issuerChain: 'issuer-chain',
            pckcrl:      'pck-crl-content'
        };
        this.pckcrlService = {
            getPckCrl: sinon.stub()
        };
        this.serviceStubs = {
            '../services/pckcrlService.js': this.pckcrlService
        };
    }

    getRequest() {
        return {
            query: {
                ca:       this.ca,
                encoding: this.encoding
            }
        };
    }

    getPckCrlResponse() {
        return {
            [Constants.SGX_PCK_CRL_ISSUER_CHAIN]: this.crlData.issuerChain,
            pckcrl:                               this.crlData.pckcrl
        };
    }
}

describe('pckcrlController', () => {
    describe('Positive test cases', () => {
        it('positive processor ca', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.pckcrlService.getPckCrl.resolves(ctx.getPckCrlResponse());

            await target.getPckCrl(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.pckcrlService.getPckCrl.calledWith(Constants.CA_PROCESSOR, ctx.encoding)).to.be.true;
            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.header.calledWith(Constants.SGX_PCK_CRL_ISSUER_CHAIN, ctx.crlData.issuerChain)).to.be.true;
            expect(ctx.response.header.calledWith('Content-Type', 'application/x-pem-file')).to.be.true;
            expect(ctx.response.send.calledWith(ctx.crlData.pckcrl)).to.be.true;
        });

        it('positive platform ca', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.ca = 'platform';
            ctx.encoding = 'DER';
            ctx.pckcrlService.getPckCrl.resolves(ctx.getPckCrlResponse());

            await target.getPckCrl(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.pckcrlService.getPckCrl.calledWith(Constants.CA_PLATFORM, ctx.encoding)).to.be.true;
            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.header.calledWith(Constants.SGX_PCK_CRL_ISSUER_CHAIN, ctx.crlData.issuerChain)).to.be.true;
            expect(ctx.response.header.calledWith('Content-Type', 'application/pkix-crl')).to.be.true;
            expect(ctx.response.send.calledWith(ctx.crlData.pckcrl)).to.be.true;
        });
    });

    describe('Input validation', () => {
        it('invalid ca missing', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.ca = undefined;

            await assert.rejects(
                () => target.getPckCrl(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcrlService.getPckCrl.notCalled).to.be.true;
        });

        it('invalid ca value', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.ca = 'invalidCa';

            await assert.rejects(
                () => target.getPckCrl(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.pckcrlService.getPckCrl.notCalled).to.be.true;
        });
    });
});
