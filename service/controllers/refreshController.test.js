/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import ControllerTestContext from './ControllerTestContext.js';
import sinon from 'sinon';
import { expect } from 'chai';
import assert from 'assert/strict';
import PccsStatus from '../constants/pccs_status_code.js';

class TestContext extends ControllerTestContext {
    constructor() {
        super('./refreshController.js');
        this.fmspc = 'abcdabcdabcd';
        this.type = undefined;
        this.refreshService = {
            refreshCache: sinon.stub()
        };
        this.serviceStubs = {
            '../services/refreshService.js': this.refreshService
        };
    }

    getRequest() {
        const query = { fmspc: this.fmspc };
        if (this.type !== undefined) {
            query.type = this.type;
        }

        return { query };
    }
}

describe('refreshController', () => {
    describe('Positive test cases', () => {
        it('positive refresh cache with default type', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.refreshService.refreshCache.resolves();

            await target.refreshCache(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.refreshService.refreshCache.calledWith(undefined, ctx.fmspc)).to.be.true;
            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.send.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[1])).to.be.true;
        });

        it('positive refresh certs type', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.type = 'certs';
            ctx.refreshService.refreshCache.resolves();

            await target.refreshCache(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.refreshService.refreshCache.calledWith('certs', ctx.fmspc.toUpperCase())).to.be.true;
            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.send.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[1])).to.be.true;
        });
    });

    describe('Input validation', () => {
        it('invalid fmspc', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.type = 'certs';
            ctx.fmspc = 'invalidFmspc';

            await assert.rejects(
                () => target.refreshCache(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.refreshService.refreshCache.notCalled).to.be.true;
        });

        it('invalid refresh type', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.type = 'all';

            await assert.rejects(
                () => target.refreshCache(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.refreshService.refreshCache.notCalled).to.be.true;
        });
    });
});
