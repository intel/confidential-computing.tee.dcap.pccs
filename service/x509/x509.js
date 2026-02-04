/*
 * Copyright (C) 2011-2026 Intel Corporation
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
 * OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as x509 from '@fidm/x509';
import * as asn1 from '@fidm/asn1';
import logger from '../utils/Logger.js';
import Constants from '../constants/index.js';

const SGX_EXTENSIONS_OID = '1.2.840.113741.1.13.1';
const TAG_OID = 6;
const SGX_EXTENSIONS_FMSPC_OID = '1.2.840.113741.1.13.1.4';
const SGX_EXTENSIONS_PCEID_OID = '1.2.840.113741.1.13.1.3';
const SGX_EXTENSIONS_PPID_OID = '1.2.840.113741.1.13.1.1';
const SGX_EXTENSIONS_TCB_OID = '1.2.840.113741.1.13.1.2';
const X509_EXTENSIONS_CDP_OID = '2.5.29.31';
const { Certificate } = x509;
const { ASN1 } = asn1;

class X509 {
  constructor() {
    if (!(this instanceof X509)) {
      return new X509();
    }

    this.fmspc = null;
    this.cdp_uri = null;
    this.ca = null;
    this.pceId = null;
    this.ppid = null;
    this.cpusvn = null;
    this.pcesvn = null;
    this.version = null;
  }
  parseCert(cert_buffer) {
    try {
      let cert = Certificate.fromPEM(cert_buffer);
      let issuerCN = cert.issuer.attributes[0].value;
      let extensions = cert.extensions;
      let sgx_extensions = null;
      let cdp_extensions = null;

      this.version = cert.version;

      // parse the issuer CN
      if (issuerCN.includes('Platform')) {
        this.ca = Constants.CA_PLATFORM;
      } else if (issuerCN.includes('Processor')) {
        this.ca = Constants.CA_PROCESSOR;
      }

      for (let i = 0; i < extensions.length; i++) {
        if (extensions[i].oid === SGX_EXTENSIONS_OID) {
          sgx_extensions = extensions[i].value;
        } else if (extensions[i].oid === X509_EXTENSIONS_CDP_OID) {
          cdp_extensions = extensions[i].value;
        }
      }

      if (sgx_extensions) {
        let asn1 = ASN1.fromDER(sgx_extensions);
        let sgx_ext_values = asn1.value;
        for (let i = 0; i < sgx_ext_values.length; i++) {
          let obj = sgx_ext_values[i];
          if (obj.value[0].tag !== TAG_OID) {
            continue;
          }
          if (obj.value[0].value === SGX_EXTENSIONS_FMSPC_OID) {
            this.fmspc = obj.value[1].value.toString('hex').toUpperCase();
          } else if (obj.value[0].value === SGX_EXTENSIONS_PCEID_OID) {
            this.pceId = obj.value[1].value.toString('hex').toUpperCase();
          } else if (obj.value[0].value === SGX_EXTENSIONS_PPID_OID) {
            this.ppid = obj.value[1].value.toString('hex').toUpperCase();
          } else if (obj.value[0].value === SGX_EXTENSIONS_TCB_OID) {
            this.cpusvn = obj.value[1].value[17].value[1].value.toString('hex').toUpperCase();
            this.pcesvn = obj.value[1].value[16].value[1].value; //int value
          }
        }
      }
      if (cdp_extensions) {
        let asn1 = ASN1.fromDER(cdp_extensions);
        let cdp_ext_values = asn1.value;
        this.cdp_uri = cdp_ext_values[0].value[0].value[0].value[0].value.toString();
      }

      return true;
    } catch (err) {
      logger.error('Failed to parse x509 cert : ' + err);
      return false;
    }
  }
}

export default X509;
