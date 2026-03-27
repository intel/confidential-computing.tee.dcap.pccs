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

import Config from 'config';
import got from 'got';
import caw from 'caw';
import logger from '../utils/Logger.js';
import PccsError from '../utils/PccsError.js';
import PccsStatus from '../constants/pccs_status_code.js';
import Constants from '../constants/index.js';

const HTTP_TIMEOUT = 120000; // 120 seconds
const MAX_RETRY_COUNT = 6; // Max retry 6 times, approximate 64 seconds in total
let HttpsAgent;
if (Config.has('proxy') && Config.get('proxy')) {
    // use proxy settings in config file
    HttpsAgent = {
        https: caw(Config.get('proxy'), { protocol: 'https' }),
    };
} else {
    // use system proxy
    HttpsAgent = {
        https: caw({ protocol: 'https' }),
    };
}

function isEarlyAccessPortal(url) {
    if (url.startsWith('https://validation.api.trustedservices.intel.com/')) {
        return true;
    } else {
        return false;
    }
}

export function parseAndModifyUrl(url) {
    try {
        let parsedUrl;
        let queryString = '';

        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                parsedUrl = new URL(url);
                queryString = parsedUrl.search.slice(1);
            } catch (error) {
                logger.warn(`URL parsing error: ${error.message}`);
                return url;
            }
        } else {
            const [path, query] = url.split('?', 2);
            parsedUrl = { pathname: path, search: query ? `?${query}` : '' };
            queryString = query || '';
        }
        if (!queryString) {
            return url;
        }

        const paramsArray = queryString.split('&');
        const modifiedParamsArray = paramsArray.map(param => {
            const [key, value] = param.split('=');
            if (value && value.length > 50) {
                const modifiedValue = `${value.slice(0, 4)}...${value.slice(-4)}`;
                return `${key}=${modifiedValue}`;
            }
            return param;
        });

        const modifiedQueryString = modifiedParamsArray.join('&');
        parsedUrl.search = `?${modifiedQueryString}`;
        const modifiedUrl = parsedUrl.origin ? parsedUrl.origin + parsedUrl.pathname + parsedUrl.search : parsedUrl.pathname + parsedUrl.search;
        return modifiedUrl;
    } catch (error) {
        logger.warn(`URL modifying error: ${error.message}`);
        return null;
    }
}

async function doRequest(url, options) {
    try {
        // check for early access portal
        if (isEarlyAccessPortal(url)) {
            if (!options.headers) {
                options.headers = {};
            }
            options.headers['Ocp-Apim-Subscription-Key'] = Config.get('ApiKey');
        }

        // global opitons ( proxy, timeout, etc)
        options.timeout = HTTP_TIMEOUT;
        options.agent = HttpsAgent;
        options.retry = {
            limit:   MAX_RETRY_COUNT,
            methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE', 'POST'],
        };
        options.throwHttpErrors = false;

        const response = await got(url, options);
        const parsedUrl = parseAndModifyUrl(response.requestUrl);
        const warning = response.headers.warning ? `[Warning=${response.headers.warning}]` : '';
        logger.info(`[Request-ID=${response.headers['request-id']}][URL=${parsedUrl}] -> [Status=${response.statusCode}]${warning}`);

        logger.debug(`Request URL ${url}`);

        if (response.statusCode !== Constants.HTTP_SUCCESS) {
            if (response.statusCode === 400) {
                if (response.headers['error-code'] && response.headers['error-message']) {
                    logger.error(`[Error-Code=${response.headers['error-code']}][Error-Message=${response.headers['error-message']}]`);
                }
            }
        }

        return response;
    } catch (err) {
        logger.error(err);
        if (err.response && err.response.headers) {
            logger.info(`Request-ID is : ${err.response.headers['request-id']}`);
        }
        throw new PccsError(PccsStatus.PCCS_STATUS_PCS_ACCESS_FAILURE);
    }
}

function getTdxUrl(url) {
    return url.replace('/sgx/', '/tdx/');
}

/*
export async function getCert(enc_ppid, cpusvn, pcesvn, pceid) {
  const options = {
    searchParams: {
      encrypted_ppid: enc_ppid,
      cpusvn: cpusvn,
      pcesvn: pcesvn,
      pceid: pceid,
    },
    method: 'GET',
    headers: { 'Ocp-Apim-Subscription-Key': Config.get('ApiKey') },
  };

  return doRequest(Config.get('uri') + 'pckcert', options);
}
*/

export async function getCerts(encPpid, pceid) {
    const options = {
        searchParams: {
            encrypted_ppid: encPpid,
            pceid,
        },
        method:  'GET',
        headers: { 'Ocp-Apim-Subscription-Key': Config.get('ApiKey') },
    };

    return doRequest(`${Config.get('uri')}pckcerts`, options);
}

export async function getCertsWithManifest(platformManifest, pceid) {
    const options = {
        json: {
            platformManifest,
            pceid,
        },
        method:  'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': Config.get('ApiKey'),
            'Content-Type':              'application/json',
        },
    };

    return doRequest(`${Config.get('uri')}pckcerts`, options);
}

export async function getPckCrl(ca) {
    const options = {
        searchParams: {
            ca:       ca.toLowerCase(),
            encoding: 'der',
        },
        method: 'GET',
    };

    return doRequest(`${Config.get('uri')}pckcrl`, options);
}

export async function getTcb(type, fmspc, version, updateType) {
    if (type !== Constants.PROD_TYPE_SGX && type !== Constants.PROD_TYPE_TDX) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }

    if (updateType !== Constants.UPDATE_TYPE_STANDARD && updateType !== Constants.UPDATE_TYPE_EARLY) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }
    const update = updateType === Constants.UPDATE_TYPE_EARLY ? 'early' : 'standard';

    const options = {
        searchParams: {
            fmspc,
            update
        },
        method: 'GET',
    };

    let uri = `${Config.get('uri')}tcb`;
    if (type === Constants.PROD_TYPE_TDX) {
        uri = getTdxUrl(uri);
    }

    if (global.PCS_VERSION === 4 && version === 3) {
        // A little tricky here because we need to use the v3 PCS URL though v4 is configured
        uri = uri.replace('/v4/', '/v3/');
    }

    return doRequest(uri, options);
}

export async function getEnclaveIdentity(enclaveId, version, updateType) {
    if (
        enclaveId !== Constants.QE_IDENTITY_ID &&
        enclaveId !== Constants.QVE_IDENTITY_ID &&
        enclaveId !== Constants.TDQE_IDENTITY_ID
    ) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }
    if (updateType !== Constants.UPDATE_TYPE_STANDARD && updateType !== Constants.UPDATE_TYPE_EARLY) {
        throw new PccsError(PccsStatus.PCCS_STATUS_INTERNAL_ERROR);
    }
    const update = updateType === Constants.UPDATE_TYPE_EARLY ? 'early' : 'standard';

    const options = {
        searchParams: {
            update
        },
        method: 'GET',
    };

    let uri = `${Config.get('uri')}qe/identity`;
    if (enclaveId === Constants.QVE_IDENTITY_ID) {
        uri = `${Config.get('uri')}qve/identity`;
    } else if (enclaveId === Constants.TDQE_IDENTITY_ID) {
        uri = getTdxUrl(uri);
    }

    if (global.PCS_VERSION === 4 && version === 3) {
        // A little tricky here because we need to use the v3 PCS URL though v4 is configured
        uri = uri.replace('/v4/', '/v3/');
    }

    return doRequest(uri, options);
}

export async function getFileFromUrl(uri) {
    logger.debug(uri);

    const options = {
        agent:   HttpsAgent,
        timeout: HTTP_TIMEOUT,
    };

    try {
        return await got(uri, options).buffer();
    } catch (err) {
        logger.error('Failed to download file for the given uri.');
        throw err;
    }
}

export function getHeaderValue(headers, key) {
    return headers[key.toLowerCase()];
}
