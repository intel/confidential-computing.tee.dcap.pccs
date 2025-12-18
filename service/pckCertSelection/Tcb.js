/*
 * Copyright (C) 2025 Intel Corporation. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   * Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in
 *     the documentation and/or other materials provided with the
 *     distribution.
 *   * Neither the name of Intel Corporation nor the names of its
 *     contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import util from "util";
import _ from "lodash";

import { TcbInvalidFormatError, TcbNonComparableError } from '../utils/errors.js';

const CPUSVN_LEN = 16 * 2;
class Tcb {
    constructor(cpusvn, pcesvn) {
        if (cpusvn.length !== CPUSVN_LEN) {
            throw new TcbInvalidFormatError(util.format('Invalid CPUSVN length: %s, CPUSVN: %s', cpusvn.length, cpusvn));
        }
        if (!Number.isInteger(pcesvn)) {
            throw new TcbInvalidFormatError(util.format('Invalid PCESVN format - should be a number: %s', pcesvn.toString()));
        }

        this.cpusvn = cpusvn;
        this.pcesvn = pcesvn;
        this.tcbComponents = [...Buffer.from(cpusvn, 'hex')];
        this.tcbComponents.push(this.pcesvn);
    }

    isLeftTcbEquivalent(that) {
        // Return true when there is no component in this TCB greater than corresponding one in that component
        return _.zip(this.tcbComponents, that.tcbComponents).find(component => component[0] > component[1]) === undefined;
    }

    compare(that) {
        let componentsToCompare = _.zip(this.tcbComponents, that.tcbComponents);
        let leftLower, rightLower = false;
        componentsToCompare.forEach(component => {
            if (component[0] < component[1]) {
                leftLower = true;
            } else if (component[0] > component[1]) {
                rightLower = true;
            }
        });

        if (leftLower && rightLower) {
            throw new TcbNonComparableError(util.format('TCBs are not comparable'));
        }
        if (leftLower) {
            return -1;
        }
        if (rightLower) {
            return 1;
        }
        return 0;
    }
}

export default Tcb;