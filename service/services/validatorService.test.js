/* Copyright(c) 2026 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import { expect } from 'chai';
import * as validatorService from './validatorService.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';

function assertThrowsInvalidRequest(fn) {
    expect(
        fn,
    ).to.throw().that.has.property('status', PccsStatus.PCCS_STATUS_INVALID_REQ[0]);
}

function getHexOfLength(length) {
    return 'ab'.repeat(length / 2);
}

function getNonHexOfLength(length) {
    return `${'a'.repeat(length - 1)}Z`;
}

describe('validatorService', () => {
    describe('hex validators', () => {
        const cases = [
            {
                name:           'validateAndNormalizeFmspc',
                validator:      validatorService.validateAndNormalizeFmspc,
                expectedLength: 12
            },
            {
                name:           'validateAndNormalizeCpusvn',
                validator:      validatorService.validateAndNormalizeCpusvn,
                expectedLength: 32
            },
            {
                name:           'validateAndNormalizePcesvn',
                validator:      validatorService.validateAndNormalizePcesvn,
                expectedLength: 4
            },
            {
                name:           'validateAndNormalizePceid',
                validator:      validatorService.validateAndNormalizePceid,
                expectedLength: 4
            },
            {
                name:           'validateAndNormalizeEncryptedPpid',
                validator:      validatorService.validateAndNormalizeEncryptedPpid,
                expectedLength: 768,
                allowsMissing:  true
            }
        ];

        cases.forEach(({ name, validator, expectedLength, allowsMissing }) => {
            it(`${name} succeeds for valid hex input`, () => {
                const validHex = getHexOfLength(expectedLength);
                expect(validator(validHex)).to.equal(validHex.toUpperCase());
            });

            if (!allowsMissing) {
                it(`${name} throws for missing input`, () => {
                    assertThrowsInvalidRequest(() => validator(undefined));
                });
            }

            it(`${name} throws for input shorter by one byte`, () => {
                const oneByteShorterHex = getHexOfLength(expectedLength - 2);
                assertThrowsInvalidRequest(() => validator(oneByteShorterHex));
            });

            it(`${name} throws for non-hex input`, () => {
                const nonHexSameLength = getNonHexOfLength(expectedLength);
                assertThrowsInvalidRequest(() => validator(nonHexSameLength));
            });
        });
    });

    describe('validateAndNormalizeEncryptedPpid', () => {
        it('returns undefined when encrypted ppid is undefined', () => {
            expect(validatorService.validateAndNormalizeEncryptedPpid(undefined)).to.equal(undefined);
        });

        it('returns null when encrypted ppid is null', () => {
            expect(validatorService.validateAndNormalizeEncryptedPpid(null)).to.equal(null);
        });
    });

    describe('validateAndNormalizeQeId', () => {
        it('normalizes lower-case qeid', () => {
            expect(validatorService.validateAndNormalizeQeId('qeid_abc')).to.equal('QEID_ABC');
        });

        it('throws for missing qeid', () => {
            assertThrowsInvalidRequest(() => validatorService.validateAndNormalizeQeId(''));
        });

        it('throws when qeid exceeds max size', () => {
            assertThrowsInvalidRequest(() => validatorService.validateAndNormalizeQeId('a'.repeat(261)));
        });
    });

    describe('validateAndNormalizeUpdateType', () => {
        it('defaults update type to STANDARD', () => {
            expect(validatorService.validateAndNormalizeUpdateType(undefined)).to.equal(Constants.UPDATE_TYPE_STANDARD);
        });

        it('normalizes lower-case update type', () => {
            expect(validatorService.validateAndNormalizeUpdateType('early')).to.equal(Constants.UPDATE_TYPE_EARLY);
        });

        it('allows ALL when explicitly enabled', () => {
            expect(validatorService.validateAndNormalizeUpdateType('all', true)).to.equal(Constants.UPDATE_TYPE_ALL);
        });

        it('throws for ALL when not enabled', () => {
            assertThrowsInvalidRequest(() => validatorService.validateAndNormalizeUpdateType('all', false));
        });

        it('throws for unknown update type', () => {
            assertThrowsInvalidRequest(() => validatorService.validateAndNormalizeUpdateType('invalid-value'));
        });
    });
});
