/* Copyright(c) 2025 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import esmock from 'esmock';
import { expect } from 'chai';
import sinon from 'sinon';
import PccsError from '../utils/PccsError.js';

class TestContext {
    constructor() {
        this.req = {
            headers: {}
        };
        this.res = {};
        this.next = sinon.stub();
        this.Config = new Map();
        this.Config.set('UserTokenHash', '878ae65a92e86cac011a570d4c30a7eaec442b85ce8eca0c2952b5e3cc0628c2e79d889ad4d5c7c626986d452dd86374b6ffaa7cd8b67665bef2289a5c70b0a1');
        this.Config.set('AdminTokenHash', 'c7ad44cbad762a5da0a452f9e854fdc1e0e7a52a38015f23f3eab1d80b931dd472634dfac71cd34ebc35d16ab7fb8a90c81f975113d6c7538dc69dd8de9077ec');
    }
    async getTarget() {
        return await esmock('./auth.js', {
            config: { 'default': this.Config },
        });
    }
}

describe('auth', () => {

    [
        {
            testCase:        'validateUser',
            func:            target => target.validateUser,
            titleTokenName:  'user token',
            authHeaderName:  'user-token',
            authHeaderValue: 'abcde',
            configHashEntry: 'UserTokenHash',
        },
        {
            testCase:        'validateAdmin',
            func:            target => target.validateAdmin,
            titleTokenName:  'admin token',
            authHeaderName:  'admin-token',
            authHeaderValue: 'admin',
            configHashEntry: 'AdminTokenHash',
        }
    ].forEach(testData => {
        describe(testData.testCase, () => {
            it('should call next when authorized', async() => {
                const c = new TestContext();
                c.req.headers[testData.authHeaderName] = testData.authHeaderValue;
                const target = await c.getTarget();
                testData.func(target)(c.req, c.res, c.next);

                expect(c.next.calledOnce).to.be.true;
            });

            it(`should throw PCCS_STATUS_UNAUTHORIZED when ${testData.titleTokenName} not provided even when not set in config`, async() => {
                const c = new TestContext();
                c.req.headers[testData.authHeaderName] = '';
                c.Config.set(testData.configHashEntry, '');
                const target = await c.getTarget();

                expect(() => testData.func(target)(c.req, c.res, c.next)).to.throw(PccsError, /Authentication failed/);
                expect(c.next.notCalled).to.be.true;
            });

            it(`should throw PCCS_STATUS_UNAUTHORIZED when ${testData.titleTokenName} does not match`, async() => {
                const c = new TestContext();
                c.req.headers[testData.authHeaderName] = 'wrong';
                const target = await c.getTarget();

                expect(() => testData.func(target)(c.req, c.res, c.next)).to.throw(PccsError, /Authentication failed/);
                expect(c.next.notCalled).to.be.true;
            });
        });
    }
    );
});
