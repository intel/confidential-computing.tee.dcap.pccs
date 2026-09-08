/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import ControllerTestContext from './ControllerTestContext.js';
import sinon from 'sinon';
import { expect } from 'chai';
import PccsStatus from '../constants/pccs_status_code.js';

class TestContext extends ControllerTestContext {
    constructor() {
        super('./healthController.js');
        this.healthService = {
            checkDbReady:      sinon.stub(),
            isStartupComplete: sinon.stub()
        };
        this.serviceStubs = {
            '../services/healthService.js': this.healthService
        };
    }

    getRequest() {
        return {};
    }
}

describe('healthController', () => {
    describe('getLiveness', () => {
        it('reports UP without consulting the caching database', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();

            await target.getLiveness(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.send.calledWith(sinon.match({ status: 'UP' }))).to.be.true;
            // a database outage must not restart the process, so nothing is queried here
            expect(ctx.healthService.checkDbReady.called).to.be.false;
        });
    });

    describe('getReadiness', () => {
        it('reports UP when the caching database is usable', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.healthService.checkDbReady.resolves({ ready: true, latency: 7 });

            await target.getReadiness(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.send.calledWith(sinon.match({
                status:  'UP',
                db:      'CONNECTED',
                latency: '7ms'
            }))).to.be.true;
        });

        it('reports DOWN when the caching database is not usable', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.healthService.checkDbReady.resolves({ ready: false, latency: 3 });

            await target.getReadiness(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE[0])).to.be.true;
            expect(ctx.response.send.calledWith(sinon.match({
                status: 'DOWN',
                db:     'DISCONNECTED'
            }))).to.be.true;
            expect(ctx.response.send.firstCall.args[0]).to.not.have.property('error');
        });
    });

    describe('getStartup', () => {
        it('reports STARTED once the boot sequence has completed', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.healthService.isStartupComplete.returns(true);

            await target.getStartup(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
            expect(ctx.response.send.calledWith(sinon.match({ status: 'STARTED' }))).to.be.true;
        });

        it('reports STARTING while the boot sequence is still running', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.healthService.isStartupComplete.returns(false);

            await target.getStartup(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SERVICE_UNAVAILABLE[0])).to.be.true;
            expect(ctx.response.send.calledWith(sinon.match({ status: 'STARTING' }))).to.be.true;
        });

        it('does not run the migration path to answer a probe', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.healthService.isStartupComplete.returns(true);

            await target.getStartup(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.healthService.checkDbReady.called).to.be.false;
        });
    });
});
