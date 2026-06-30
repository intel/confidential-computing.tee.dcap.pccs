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
        super('./tcbinfoController.js');
        this.fmspc = 'abcdabcdabcd';
        this.update = undefined;
        this.version = 4;
        this.tcbinfo = { tcbInfo: 'data' };
        this.issuerChain = 'issuer-chain';
        this.tcbinfoService = {
            getTcbInfo: sinon.stub()
        };
        this.serviceStubs = {
            '../services/tcbinfoService.js': this.tcbinfoService
        };
    }

    getRequest() {
        const query = { fmspc: this.fmspc };
        if (this.update !== undefined) {
            query.update = this.update;
        }

        return {
            query,
            originalUrl: `/sgx/certification/v${this.version}/tcb`
        };
    }

    getExpectedTcbInfo() {
        return {
            [this.getExpectedIssuerChainName()]: this.issuerChain,
            tcbinfo:                             JSON.stringify(this.tcbinfo)
        };
    }

    getExpectedIssuerChainName() {
        return this.version === 3 ?
            Constants.SGX_TCB_INFO_ISSUER_CHAIN :
            Constants.TCB_INFO_ISSUER_CHAIN;
    }

    verifyPositiveResponse() {
        expect(this.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
        expect(this.response.header.calledWith(this.getExpectedIssuerChainName(), this.issuerChain)).to.be.true;
        expect(this.response.header.calledWith('Content-Type', 'application/json')).to.be.true;
        expect(this.response.send.calledWith(JSON.stringify(this.tcbinfo))).to.be.true;
    }
}

describe('tcbinfoController', () => {
    describe('Positive test cases', () => {
        it('positive SGX tcbinfo with default update and v4 issuer header', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.tcbinfoService.getTcbInfo.resolves(ctx.getExpectedTcbInfo());

            await target.getSgxTcbInfo(ctx.getRequest(), ctx.response, ctx.next);

            expect(
                ctx.tcbinfoService.getTcbInfo.calledWith(
                    Constants.PROD_TYPE_SGX,
                    ctx.fmspc.toUpperCase(),
                    4,
                    Constants.UPDATE_TYPE_STANDARD
                )
            ).to.be.true;
            ctx.verifyPositiveResponse();
        });

        it('positive TDX tcbinfo with EARLY update and v3 issuer header', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.version = 3;
            ctx.update = 'early';
            ctx.tcbinfoService.getTcbInfo.resolves(ctx.getExpectedTcbInfo());

            await target.getTdxTcbInfo(ctx.getRequest(), ctx.response, ctx.next);

            expect(
                ctx.tcbinfoService.getTcbInfo.calledWith(
                    Constants.PROD_TYPE_TDX,
                    ctx.fmspc.toUpperCase(),
                    3,
                    Constants.UPDATE_TYPE_EARLY
                )
            ).to.be.true;
            ctx.verifyPositiveResponse();
        });
    });

    describe('Input validation', () => {
        it('invalid fmspc', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.fmspc = 'invalidFmspc';

            await assert.rejects(
                () => target.getSgxTcbInfo(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.tcbinfoService.getTcbInfo.notCalled).to.be.true;
        });

        it('invalid update type', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.update = 'all';

            await assert.rejects(
                () => target.getSgxTcbInfo(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.tcbinfoService.getTcbInfo.notCalled).to.be.true;
        });
    });
});
