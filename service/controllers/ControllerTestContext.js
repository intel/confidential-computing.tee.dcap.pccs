/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import sinon from 'sinon';
import esmock from 'esmock';

export default class ControllerTestContext {
    constructor(controllerName) {
        this.response = new ResponseStub();
        this.controllerName = controllerName;
        this.serviceStubs = {}; //override me
        this.otherStubs = {}; //override me
    }

    next(err) {
        throw err;
    }

    async getTarget() {
        const services = await esmock('../services/index.js', this.serviceStubs);
        return await esmock(this.controllerName, {
            ...this.otherStubs,
            '../services/index.js': services
        });
    }
}

export class ResponseStub {
    status = sinon.spy(() => this);
    header = sinon.spy(() => this);
    send = sinon.stub();
}
