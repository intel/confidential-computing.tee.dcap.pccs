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
        super('./platformsController.js');
        this.body = [{ qe_id: 'qe1' }];
        this.update = undefined;
        this.source = undefined;
        this.platforms = [{ platform: 'p1' }, { platform: 'p2' }];
        this.platformsRegService = {
            registerPlatforms:         sinon.stub(),
            getRegisteredPlatforms:    sinon.stub(),
            deleteRegisteredPlatforms: sinon.stub(),
            getRegisteredNaPlatforms:  sinon.stub()
        };
        this.platformsService = {
            getCachedPlatforms: sinon.stub()
        };
        this.serviceStubs = {
            '../services/platformsRegService.js': this.platformsRegService,
            '../services/platformsService.js':    this.platformsService
        };
    }

    getPostRequest() {
        const query = {};
        if (this.update !== undefined) {
            query.update = this.update;
        }

        return {
            query,
            body: this.body
        };
    }

    getGetRequest() {
        const query = {};
        if (this.source !== undefined) {
            query.source = this.source;
        }

        return { query };
    }

    verifyGetPlatformsResponse(platforms) {
        expect(this.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
        expect(this.response.header.calledWith('platform-count', platforms.length)).to.be.true;
        expect(this.response.send.calledWith(platforms)).to.be.true;
    }

    /**
        * @param {Object} options
        * @param {boolean} [options.regCalled] Whether getRegisteredPlatforms should be called once.
        * @param {boolean} [options.regNaCalled] Whether getRegisteredNaPlatforms should be called once.
        * @param {string[]} [options.cachedCalledWith] Expected FMSPC list passed to getCachedPlatforms.
        * @param {number} [options.deleteRegisteredPlatformsCalledWith] Expected platform registration status passed to deleteRegisteredPlatforms.
     */
    verifyGetPlatformsMocks({ regCalled, regNaCalled, cachedCalledWith, deleteRegisteredPlatformsCalledWith }) {
        expect(
            regCalled ?
                this.platformsRegService.getRegisteredPlatforms.calledOnce :
                this.platformsRegService.getRegisteredPlatforms.notCalled
        ).to.be.true;

        expect(
            regNaCalled ?
                this.platformsRegService.getRegisteredNaPlatforms.calledOnce :
                this.platformsRegService.getRegisteredNaPlatforms.notCalled
        ).to.be.true;

        expect(
            cachedCalledWith !== undefined ?
                this.platformsService.getCachedPlatforms.calledWith(cachedCalledWith) :
                this.platformsService.getCachedPlatforms.notCalled
        ).to.be.true;

        expect(
            deleteRegisteredPlatformsCalledWith !== undefined ?
                this.platformsRegService.deleteRegisteredPlatforms.calledWith(deleteRegisteredPlatformsCalledWith) :
                this.platformsRegService.deleteRegisteredPlatforms.notCalled
        ).to.be.true;
    }
}

describe('platformsController', () => {
    describe('postPlatforms', () => {
        describe('Positive test cases', () => {
            it('positive with explicit ALL update type', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.update = 'all';
                ctx.platformsRegService.registerPlatforms.resolves();

                await target.postPlatforms(ctx.getPostRequest(), ctx.response, ctx.next);

                expect(ctx.platformsRegService.registerPlatforms.calledWith(ctx.body, Constants.UPDATE_TYPE_ALL)).to.be.true;
                expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
                expect(ctx.response.send.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[1])).to.be.true;
            });

            it('positive with default STANDARD update type', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.platformsRegService.registerPlatforms.resolves();

                await target.postPlatforms(ctx.getPostRequest(), ctx.response, ctx.next);

                expect(ctx.platformsRegService.registerPlatforms.calledWith(ctx.body, Constants.UPDATE_TYPE_STANDARD)).to.be.true;
                expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
                expect(ctx.response.send.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[1])).to.be.true;
            });
        });

        describe('Input validation', () => {
            it('invalid update type', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.update = 'invalidUpdate';

                await assert.rejects(
                    () => target.postPlatforms(ctx.getPostRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                expect(ctx.platformsRegService.registerPlatforms.notCalled).to.be.true;
            });
        });
    });

    describe('getPlatforms', () => {
        describe('Positive test cases', () => {
            it('positive default source uses registered platforms', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.platformsRegService.getRegisteredPlatforms.resolves(ctx.platforms);

                await target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next);

                ctx.verifyGetPlatformsMocks({ regCalled: true, deleteRegisteredPlatformsCalledWith: Constants.PLATF_REG_NEW });
                ctx.verifyGetPlatformsResponse(ctx.platforms);
            });

            it('positive reg source uses registered platforms', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = 'reg';
                ctx.platformsRegService.getRegisteredPlatforms.resolves(ctx.platforms);

                await target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next);

                ctx.verifyGetPlatformsMocks({ regCalled: true, deleteRegisteredPlatformsCalledWith: Constants.PLATF_REG_NEW });
                ctx.verifyGetPlatformsResponse(ctx.platforms);
            });

            it('positive reg_na source uses not-available platforms', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = 'reg_na';
                ctx.platformsRegService.getRegisteredNaPlatforms.resolves(ctx.platforms);

                await target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next);

                ctx.verifyGetPlatformsMocks({ regNaCalled: true, deleteRegisteredPlatformsCalledWith: Constants.PLATF_REG_NOT_AVAILABLE });
                ctx.verifyGetPlatformsResponse(ctx.platforms);
            });

            it('positive fmspc source list uses cached platforms', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[abcdabcdabcd,1234567890ab]';
                ctx.platformsService.getCachedPlatforms.resolves(ctx.platforms);

                await target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next);

                ctx.verifyGetPlatformsMocks({ cachedCalledWith: ['ABCDABCDABCD', '1234567890AB'] });
                ctx.verifyGetPlatformsResponse(ctx.platforms);
            });

            it('positive empty fmspc source list', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[]';
                ctx.platformsService.getCachedPlatforms.resolves([]);

                await target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next);

                ctx.verifyGetPlatformsMocks({ cachedCalledWith: [] });
                ctx.verifyGetPlatformsResponse([]);
            });
        });

        describe('Input validation', () => {
            it('invalid fmspc source format without brackets', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = 'abcdabcdabcd';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });

            it('invalid fmspc list too short', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });

            it('invalid fmspc list missing closing bracket', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[abcdabcdabcd,1234567890ab';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });

            it('invalid fmspc list separated by semicolon instead of comma', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[abcdabcdabcd;1234567890ab]';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });

            it('invalid fmspc value in source list', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[notHexFmspc]';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });

            it('invalid second fmspc in source list', async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.source = '[abcdabcdabcd,notHexFmspc]';

                await assert.rejects(
                    () => target.getPlatforms(ctx.getGetRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                ctx.verifyGetPlatformsMocks({ });
            });
        });
    });
});
