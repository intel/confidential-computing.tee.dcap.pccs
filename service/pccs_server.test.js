/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import esmock from 'esmock';
import sinon from 'sinon';
import request from 'supertest';
import { expect } from 'chai';

const MOUNT = '/sgx/certification/v4';
const ADMIN_TOKEN = 'test-admin-token';
const USER_TOKEN = 'test-user-token';

// Endpoints that must always require authentication, regardless of the path shape.
const PROTECTED_ROUTES = [
    { method: 'get', path: '/platforms', auth: 'admin', controller: ['platformsController', 'getPlatforms'] },
    { method: 'post', path: '/platforms', auth: 'user', controller: ['platformsController', 'postPlatforms'] },
    { method: 'put', path: '/platformcollateral', auth: 'admin', controller: ['platformCollateralController', 'putPlatformCollateral'] },
    { method: 'get', path: '/refresh', auth: 'admin', controller: ['refreshController', 'refreshCache'] },
    { method: 'post', path: '/refresh', auth: 'admin', controller: ['refreshController', 'refreshCache'] },
    { method: 'put', path: '/appraisalpolicy', auth: 'admin', controller: ['appraisalPolicyController', 'putAppraisalPolicy'] },
];

function makeHandler(name) {
    return sinon.spy((req, res) => res.status(200).send(name));
}

function makeControllerStubs() {
    return {
        platformsController:          { getPlatforms: makeHandler('getPlatforms'), postPlatforms: makeHandler('postPlatforms') },
        platformCollateralController: { putPlatformCollateral: makeHandler('putPlatformCollateral') },
        pckcertController:            { getPckCert: makeHandler('getPckCert') },
        pckcrlController:             { getPckCrl: makeHandler('getPckCrl') },
        tcbinfoController:            { getSgxTcbInfo: makeHandler('getSgxTcbInfo'), getTdxTcbInfo: makeHandler('getTdxTcbInfo') },
        identityController:           { getEcdsaQeIdentity: makeHandler('getEcdsaQeIdentity'), getQveIdentity: makeHandler('getQveIdentity'), getTdQeIdentity: makeHandler('getTdQeIdentity') },
        rootcacrlController:          { getRootCaCrl: makeHandler('getRootCaCrl') },
        refreshController:            { refreshCache: makeHandler('refreshCache') },
        crlController:                { getCrl: makeHandler('getCrl') },
        appraisalPolicyController:    { putAppraisalPolicy: makeHandler('putAppraisalPolicy'), getAppraisalPolicy: makeHandler('getAppraisalPolicy') },
    };
}

function makeAuthStub() {
    return {
        validateTokenHashes: sinon.spy(() => {}),
        validateAdmin:       sinon.spy((req, res, next) => {
            if (req.headers['admin-token'] === ADMIN_TOKEN) {
                return next();
            }
            return res.status(401).send('unauthorized');
        }),
        validateUser: sinon.spy((req, res, next) => {
            if (req.headers['user-token'] === USER_TOKEN) {
                return next();
            }
            return res.status(401).send('unauthorized');
        }),
    };
}

// Dependencies of pccs_server that must not run for real when imported by a test.
function makeServerDependencyMocks() {
    return {
        './utils/apputil.js': {
            getApiVersionFromUrl: () => 4,
            startupCheck:         () => true,
            databaseCheck:        async() => true, // resolves immediately so tests don't block on startup
        },
        'fs': {
            chmod:        () => {},
            readFileSync: () => 'test-pem',
        },
        'https':         { createServer: () => ({ listen: () => {} }) },
        'node-schedule': { 'default': { scheduleJob: () => ({}) } },
    };
}

describe('auth bypass regression (duplicate slashes)', () => {
    let app;
    let controllers;
    let authStub;

    before(async() => {
        controllers = makeControllerStubs();
        authStub = makeAuthStub();

        const serverModule = await esmock('./pccs_server.js', makeServerDependencyMocks(), {
            './controllers/index.js': controllers,
            './middleware/auth.js':   authStub,
        });
        app = serverModule.default;
    });

    beforeEach(() => {
        sinon.resetHistory();
    });

    after(() => {
        delete global.PCS_VERSION;
    });

    function credentialHeader(authType) {
        return authType === 'admin' ?
            { 'admin-token': ADMIN_TOKEN } :
            { 'user-token': USER_TOKEN };
    }

    function controllerSpyForRoute(route) {
        return controllers[route.controller[0]][route.controller[1]];
    }

    function authSpyForRoute(route) {
        return route.auth === 'admin' ? authStub.validateAdmin : authStub.validateUser;
    }

    PROTECTED_ROUTES.forEach((route) => {
        const normalPath = `${MOUNT}${route.path}`;
        const doubleSlashPath = `${MOUNT}/${route.path}`; // yields '.../v4//<route>'

        describe(`${route.method.toUpperCase()} ${route.path} (${route.auth} auth)`, () => {
            it('rejects the normal path without credentials', async() => {
                const res = await request(app)[route.method](normalPath);

                expect(res.status).to.equal(401);
                expect(controllerSpyForRoute(route).called).to.equal(false);
            });

            it('rejects the duplicate-slash path without credentials (no bypass)', async() => {
                const res = await request(app)[route.method](doubleSlashPath);

                expect(res.status).to.equal(401);
                expect(controllerSpyForRoute(route).called).to.equal(false);
                expect(authSpyForRoute(route).firstCall.args[0].originalUrl).to.equal(doubleSlashPath);
            });

            it('allows the duplicate-slash path when valid credentials are provided', async() => {
                const res = await request(app)[route.method](doubleSlashPath).set(credentialHeader(route.auth));

                expect(res.status).to.equal(200);
                expect(controllerSpyForRoute(route).calledOnce).to.equal(true);
            });
        });
    });
});
