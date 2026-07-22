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
        super('./identityController.js');
        this.update = 'early';
        this.version = 4;
        this.identityPayload = '{"id":"qe"}';
        this.issuerChain = 'issuer-chain';
        this.identityService = {
            getEnclaveIdentity: sinon.stub()
        };
        this.serviceStubs = {
            '../services/identityService.js': this.identityService
        };
    }

    getRequest() {
        const query = {};
        if (this.update !== undefined) {
            query.update = this.update;
        }

        return {
            query,
            originalUrl: `/sgx/certification/v${this.version}/qe/identity`
        };
    }

    getExpectedIdentity() {
        return {
            [Constants.SGX_ENCLAVE_IDENTITY_ISSUER_CHAIN]: this.issuerChain,
            identity:                                      this.identityPayload
        };
    }
}

describe('identityController', () => {
    describe('Positive test cases', () => {

        [
            {
                label:         'getEcdsaQeIdentity',
                getIdentityFn: target => target.getEcdsaQeIdentity,
                enclaveId:     Constants.QE_IDENTITY_ID
            },
            {
                label:         'getQveIdentity',
                getIdentityFn: target => target.getQveIdentity,
                enclaveId:     Constants.QVE_IDENTITY_ID
            },
            {
                label:         'getTdQeIdentity',
                getIdentityFn: target => target.getTdQeIdentity,
                enclaveId:     Constants.TDQE_IDENTITY_ID
            }
        ].forEach(({ label, getIdentityFn, enclaveId }) => {
            it(`positive ${label}`, async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.identityService.getEnclaveIdentity.resolves(ctx.getExpectedIdentity());

                await getIdentityFn(target)(ctx.getRequest(), ctx.response, ctx.next);

                expect(ctx.identityService.getEnclaveIdentity.calledWith(enclaveId, ctx.version, 'EARLY')).to.be.true;
                expect(ctx.response.status.calledWith(PccsStatus.PCCS_STATUS_SUCCESS[0])).to.be.true;
                expect(
                    ctx.response.header.calledWith(Constants.SGX_ENCLAVE_IDENTITY_ISSUER_CHAIN, ctx.issuerChain)
                ).to.be.true;
                expect(ctx.response.header.calledWith('Content-Type', 'application/json')).to.be.true;
                expect(ctx.response.send.calledWith(ctx.identityPayload)).to.be.true;
            });
        });

        it('positive default update type', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.update = undefined;
            ctx.identityService.getEnclaveIdentity.resolves(ctx.getExpectedIdentity());

            await target.getEcdsaQeIdentity(ctx.getRequest(), ctx.response, ctx.next);

            expect(
                ctx.identityService.getEnclaveIdentity.calledWith(
                    Constants.QE_IDENTITY_ID,
                    ctx.version,
                    Constants.UPDATE_TYPE_STANDARD
                )
            ).to.be.true;
            expect(ctx.response.send.calledWith(ctx.identityPayload)).to.be.true;
        });
    });

    describe('Input validation', () => {
        it(`invalid update type: invalid update`, async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.update = 'invalidUpdate';

            await assert.rejects(
                () => target.getEcdsaQeIdentity(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.identityService.getEnclaveIdentity.notCalled).to.be.true;
        });
    });
});
