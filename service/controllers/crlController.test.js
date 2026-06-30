/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import ControllerTestContext from './ControllerTestContext.js';
import sinon from 'sinon';
import { expect } from 'chai';
import assert from 'assert/strict';
import PccsStatus from '../constants/pccs_status_code.js';

class TestContext extends ControllerTestContext {
    constructor() {
        super('./crlController.js');
        this.expectedCrl = 'crl';
        this.expectedHeaders = ['Content-Type', 'application/pkix-crl'];
        this.uri = 'https://certificates.trustedservices.intel.com/IntelSGXRootCA.crl';
        this.crlService = {
            getCrl: sinon.stub()
        };
        this.serviceStubs = {
            '../services/crlService.js': this.crlService
        };
        this.sequelizeStub = {
            transaction: sinon.stub().callsFake(async(callback) => await callback())
        };
        this.globalStubs = {
            '../dao/models/index.js': {
                sequelize: this.sequelizeStub
            }
        };
    }

    getRequest() {
        return {
            query: {
                uri: this.uri
            }
        };
    }
}

describe('crlController', () => {
    describe('Positive test cases', () => {
        it('positive rooturi', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.crlService.getCrl.resolves(ctx.expectedCrl);

            await target.getCrl(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.crlService.getCrl.calledWith(ctx.uri)).to.be.true;
            expect(ctx.response.header.calledWith(...ctx.expectedHeaders)).to.be.true;
            expect(ctx.response.send.calledWith(ctx.expectedCrl)).to.be.true;
        });

        it('positive intermediate uri', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.uri = 'https://api.trustedservices.intel.com/sgx/certification/v4/pckcrl?ca=processor';
            ctx.crlService.getCrl.resolves(ctx.expectedCrl);

            await target.getCrl(ctx.getRequest(), ctx.response, ctx.next);

            expect(ctx.crlService.getCrl.calledWith(ctx.uri)).to.be.true;
            expect(ctx.response.header.calledWith(...ctx.expectedHeaders)).to.be.true;
            expect(ctx.response.send.calledWith(ctx.expectedCrl)).to.be.true;
        });
    });

    describe('Input validation', () => {
        it('missing uri', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.uri = undefined;

            await assert.rejects(
                () => target.getCrl(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.crlService.getCrl.notCalled).to.be.true;
        });

        it('uri too long', async() => {
            const ctx = new TestContext();
            const target = await ctx.getTarget();
            ctx.uri = `https://${'a'.repeat(2050)}.com`;

            await assert.rejects(
                () => target.getCrl(ctx.getRequest(), ctx.response, ctx.next),
                (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
            );

            expect(ctx.crlService.getCrl.notCalled).to.be.true;
        });

        [
            'https://example.com/IntelSGXRootCA.crl', // host is not an allowed root CA domain
            'http://certificates.trustedservices.intel.com/IntelSGXRootCA.crl', // scheme must be https
            'https://certificates.trustedservices.intel.com/IntelSGXRootCAcrl', // missing dot after IntelSGXRootCA
            'https://certprx.adsdcsp.com/IntelSGXRootCA', // missing extension segment after IntelSGXRootCA.
            'https://certificates.adsdcsp.com/IntelSGXRootCA.crl', // adsdcsp certificates host is not allowed for root URI
            'https://api.trustedservices.intel.com/IntelSGXRootCA.crl', // api host is only valid for intermediate endpoint path
            'https://nonexistent.url/doEvil?url=https://certificates.trustedservices.intel.com/IntelSGXRootCA.crl' //correct uri at the end of incorect one
        ].forEach((invalidUri) => {
            it(`invalid root uri: ${invalidUri}`, async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.uri = invalidUri;

                await assert.rejects(
                    () => target.getCrl(ctx.getRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                expect(ctx.crlService.getCrl.notCalled).to.be.true;
            });
        });

        [
            'https://api.trustedservices.intel.com/sgx/certification/v0/pckcrl?ca=processor', // version must be v1 or greater
            'https://api.trustedservices.intel.com/sgx/certification/v04/pckcrl?ca=processor', // version cannot have leading zero
            'http://api.trustedservices.intel.com/sgx/certification/v4/pckcrl?ca=processor', // scheme must be https
            'https://api.trustedservices.intel.com/sgx/certification/v4/pckcrlca=processor', // missing required ? before query string
            'https://certprx.adsdcsp.com/sgx/certification/v4/pckcrl?ca=processor', // certprx host is root-only and not valid for intermediate path
            'https://api.adsdcsp.com/sgx/certification/v4/pckcrl?ca=processor', // adsdcsp intermediate host must match *.az.sgx(prod|np).adsdcsp.com
            'https://foo.az.sgxprod.trustedservices.intel.com/sgx/certification/v4/pckcrl?ca=processor', // sgxprod label is only valid under adsdcsp.com
            'https://nonexistent.url/doEvil?url=https://api.trustedservices.intel.com/sgx/certification/v4/pckcrl?ca=processor' //correct uri at the end of incorect one
        ].forEach((invalidUri) => {
            it(`invalid intermediate uri: ${invalidUri}`, async() => {
                const ctx = new TestContext();
                const target = await ctx.getTarget();
                ctx.uri = invalidUri;

                await assert.rejects(
                    () => target.getCrl(ctx.getRequest(), ctx.response, ctx.next),
                    (err) => err.status === PccsStatus.PCCS_STATUS_INVALID_REQ[0]
                );

                expect(ctx.crlService.getCrl.notCalled).to.be.true;
            });
        });
    });
});
