#!/usr/bin/env python3
# encoding: utf-8
#
# Copyright (C) 2011-2026 Intel Corporation
#
# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
# BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
# OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
# OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
# OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
# WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
# OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
# EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#
#
# SPDX-License-Identifier: BSD-3-Clause

import argparse
import requests
import os
import ssl
import sys
import json
import urllib3
from lib.intelsgx.credential import Credentials

PCCS_SERVICE_URL = 'https://localhost:8081/sgx/certification/v4'

def main():
    prog = os.environ.get("PCCS_ADMIN_TOOL_EXECUTABLE_WRAPPER", os.path.basename(os.path.realpath(sys.argv[0])))
    parser = argparse.ArgumentParser(description="Administrator tool for PCCS", prog=prog)
    #parser.add_argument('action', help='Choose your action')
    subparsers = parser.add_subparsers(dest="command")

    # Parent parser for common TLS options
    tls_parent = argparse.ArgumentParser(add_help=False)
    tls_verify_group = tls_parent.add_mutually_exclusive_group()
    tls_verify_group.add_argument("--no-pccs-cert-check", action="store_true", help="Disable verification of PCCS' TLS certificate (not recommended).")
    tls_verify_group.add_argument("--ca", type=str, help="Path to a CA certificate file, CA certificate bundle file, or a directory of certificates pre-processed by c_rehash, used to verify the PCCS' certificate.")
    #  subparser for get
    parser_get = subparsers.add_parser('get', parents=[tls_parent], formatter_class=argparse.RawTextHelpFormatter)
    # add optional arguments for get
    parser_get.add_argument("-u", "--url", help="The URL of the PCCS's GET platforms API; default: https://localhost:8081/sgx/certification/v4/platforms")
    parser_get.add_argument("-o", "--output_file", help="The output file name for platform list; default: platform_list.json")
    parser_get.add_argument("-s", "--source", help=
              "reg - Get platforms from registration table.(default)\n"
              "reg_na - Get platforms whose PCK certs are currently not available from registration table.\n"
            + "[FMSPC1,FMSPC2,...] - Get platforms from cache based on the fmspc values. [] to get all cached platforms.")
    parser_get.set_defaults(func=pccs_get)

    #  subparser for put
    description_put = (
    "This put command supports the following formats([] means optional):\n"
    "1. pccsadmin put [-u https://localhost:8081/sgx/certification/v4/platformcollateral] [-i collateral_file(*.json)]\n"
    "2. pccsadmin put -u https://localhost:8081/sgx/certification/v4/appraisalpolicy [-d] -f fmspc -i policy_file(*.jwt)"
    )
    parser_put = subparsers.add_parser('put', parents=[tls_parent], description=description_put, formatter_class=argparse.RawTextHelpFormatter)
    # add optional arguments for put
    parser_put.add_argument("-u", "--url", help="The URL of the PCCS's API; default: https://localhost:8081/sgx/certification/v4/platformcollateral")
    parser_put.add_argument("-i", "--input_file", help="The input file name for platform collaterals or appraisal policy;\
                            \nFor /platformcollateral API, default is platform_collaterals.json;\
                            \nFor /appraisalpolicy API, the filename of the jwt file must be provided explicitly.")
    parser_put.add_argument("-d", "--default", help="This policy will become the default policy for this FMSPC.", action="store_true")
    parser_put.add_argument('-f', '--fmspc', type=str, help="FMSPC value")
    parser_put.set_defaults(func=pccs_put)

    #  subparser for refresh
    parser_refresh = subparsers.add_parser('refresh', parents=[tls_parent])
    # add optional arguments for refresh
    parser_refresh.add_argument("-u", "--url", help="The URL of the PCCS's refresh API; default: https://localhost:8081/sgx/certification/v4/refresh")
    parser_refresh.add_argument("-f", "--fmspc", help="Only refresh certificates for specified FMSPCs. Format: [FMSPC1, FMSPC2, ..., FMSPCn]")
    parser_refresh.set_defaults(func=pccs_refresh)

    args = parser.parse_args()
    if len(args.__dict__) <= 1:
        # No arguments or subcommands were given.
        parser.print_help()
        parser.exit()

    # Check mandatory arguments for appraisalpolicy
    if args.command == 'put' and args.url and args.url.endswith("/appraisalpolicy"):
        if not args.fmspc or not args.input_file:
            parser.error("For putting appraisal policy, -f/--fmspc and -i/--input_file are mandatory.")

    # Check if no-pccs-cert-check flag was provided.
    if getattr(args, 'no_pccs_cert_check', False):
        # Inform the user that PCCS connections are unauthenticated for this session.
        print("WARNING: TLS certificate verification for PCCS connections is disabled. Connections are not authenticated.")
        
        # With verify=False, urllib3 would emit an InsecureRequestWarning to stderr on every individual HTTP request, producing repeated and noisy output.
        # The user has already explicitly opted in via --no-pccs-cert-check, so suppress the per-request warnings and replace them with the single notice above.
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    args.func(args)

class Utils:
    @staticmethod
    def check_expire_hours(value):
        try:
            int_value = int(value)
        except ValueError:
            raise argparse.ArgumentTypeError(f"{value} is not a valid integer")

        if 0 <= int_value <= 8760:
            return int_value
        else:
            raise argparse.ArgumentTypeError(f"{value} is not in the range [0, 8760]")

    @staticmethod
    def check_file_writable(filename):
        fullpath = os.path.join(os.getcwd(), filename)
        if os.path.isfile(fullpath):
            while True:
                overwrite = input('File %s already exists. Overwrite? (y/n) ' %(filename))
                if overwrite.lower() == "y":
                    break
                if overwrite.lower() == "n":
                    print("Aborted.")
                    return False
        return True

class PccsClient:
    BASE_URL = PCCS_SERVICE_URL
    GET_URL = BASE_URL + "/platforms"
    PUT_URL = BASE_URL + "/platformcollateral"
    REFRESH_URL = BASE_URL + "/refresh"
    OUTPUT_FILE = "platform_list.json"
    INPUT_FILE = "platform_collaterals.json"
    USER_AGENT = 'pccsadmin/0.1'
    CONTENT_TYPE = 'application/json'
    FMSPC = None

    def __init__(self, credentials, args):
        self.credentials = credentials
        self.args = args

    def _get_tls_verify(self):
        """Return the value to pass as `verify=` to requests.

        - --no-pccs-cert-check: returns False (i.e., disables certificate verification).
        - --ca <path>: validates the path is a loadable CA certificate file, CA certificate bundle file, or c_rehash certificate directory, then returns the path (i.e., requests module uses it instead of the system store).
        - neither: returns True (i.e., requests module verifies against its default CA bundle).
        """
        if getattr(self.args, 'no_pccs_cert_check', False):
            return False
        if getattr(self.args, 'ca', None):
            cert_path = self.args.ca
            try:
                if os.path.isdir(cert_path):
                    ssl.create_default_context(capath=cert_path)
                else:
                    ssl.create_default_context(cafile=cert_path)
            except FileNotFoundError:
                raise FileNotFoundError(
                    "TLS certificate not found at %s." % cert_path
                )
            except ssl.SSLError as e:
                raise ValueError(
                    "TLS certificate found at '%s' is invalid: %s" % (cert_path, e)
                ) from e
            print("Using '%s' for PCCS TLS certificate verification." % cert_path)
            return cert_path
        
        # Use Requests module's default CA bundle.
        return True

    def get_platforms(self):
        try:
            url = self.args.url or self.GET_URL
            output_file = self.args.output_file or self.OUTPUT_FILE
            if self.args.source:
                url += '?source=' + self.args.source

            token = self.credentials.get_admin_token()
            headers = {'user-agent': self.USER_AGENT, 'admin-token': token}
            params = {}
            response = requests.get(url=url, headers=headers, params=params, verify=self._get_tls_verify())

            if response.status_code == 200:
                self._write_output_file(output_file, response)
            elif response.status_code == 401:  # Authentication error
                try:
                    self.credentials.set_admin_token('')
                except:
                    # If keyring is unavailable, we don't want to trigger
                    # traceback, as the user may have declined to save
                    # the key in the keyring earlier
                    pass
                print("Authentication failed.")
            else:
                self._handle_error(response)

        except requests.exceptions.SSLError as e:
            self._handle_pccs_ssl_error(e, getattr(self.args, 'ca', None))
        except Exception as e:
            print(e)

    def upload_collaterals(self):
        try:
            url = self.args.url or self.PUT_URL
            input_file = self.args.input_file or self.INPUT_FILE

            token = self.credentials.get_admin_token()
            headers = {
                'user-agent': self.USER_AGENT,
                'Content-Type': self.CONTENT_TYPE,
                'admin-token': token
            }
            params = {}
            fullpath = os.path.join(os.getcwd(), input_file)
            with open(fullpath) as inputfile:
                data = inputfile.read()

            if url.endswith("/platformcollateral"):
                response = requests.put(url=url, data=data, headers=headers, params=params, verify=self._get_tls_verify())

                if response.status_code == 200:
                    print("Collaterals uploaded successfully.")
                elif response.status_code == 401:  # Authentication error
                    try:
                        self.credentials.set_admin_token('')
                    except:
                        # If keyring is unavailable, we don't want to trigger
                        # traceback, as the user may have declined to save
                        # the key in the keyring earlier
                        pass
                    print("Authentication failed.")
                else:
                    self._handle_error(response)
            elif url.endswith("/appraisalpolicy"):
                appraisal_policy = {
                    "policy": data,
                    "is_default": self.args.default,
                    "fmspc": self.args.fmspc,
                }
                # Convert the dictionary to a JSON string
                data_str = json.dumps(appraisal_policy)
                response = requests.put(url=url, data=data_str, headers=headers, params=params, verify=self._get_tls_verify())
                if response.status_code == 200:
                    print("Policy uploaded successfully with policy ID :" + response.text)
                elif response.status_code == 401:  # Authentication error
                    try:
                        self.credentials.set_admin_token('')
                    except:
                        # If keyring is unavailable, we don't want to trigger
                        # traceback, as the user may have declined to save
                        # the key in the keyring earlier
                        pass
                    print("Authentication failed.")
                else:
                    self._handle_error(response)
            else:
                print("Invalid URL.")

        except requests.exceptions.SSLError as e:
            self._handle_pccs_ssl_error(e, getattr(self.args, 'ca', None))
        except Exception as e:
            print(e)

    def refresh_cache_database(self):
        try:
            url = self.args.url or self.REFRESH_URL
            fmspc = self.args.fmspc or self.FMSPC
            # Get administrator token from keyring
            token = self.credentials.get_admin_token()
            # Prepare headers and params for request
            headers = {
                'user-agent': self.USER_AGENT,
                'admin-token': token
            }
            params = {}
            if fmspc == 'all':
                params = {'type': 'certs',
                        'fmspc':''}
            elif fmspc != None:
                params = {'type': 'certs',
                        'fmspc': fmspc}
            response = requests.post(url=url, headers=headers, params=params, verify=self._get_tls_verify())
            if response.status_code == 200:
                print("The cache database was refreshed successfully.")
            elif response.status_code == 401:  # Authentication error
                try:
                    self.credentials.set_admin_token('')
                except:
                    # If keyring is unavailable, we don't want to trigger
                    # traceback, as the user may have declined to save
                    # the key in the keyring earlier
                    pass
                print("Authentication failed.")
            else:
                self._handle_error(response)

        except requests.exceptions.SSLError as e:
            self._handle_pccs_ssl_error(e, getattr(self.args, 'ca', None))
        except Exception as e:
            print(e)

    @staticmethod
    def _handle_pccs_ssl_error(e, ca_path=None):
        # Check if the root cause is specifically a certificate verification error for the PCCS connection.
        # Walk both __cause__ (explicit: raise X from Y) and __context__ (implicit chaining).
        # Both must be followed because requests.exceptions.SSLError sets __cause__=None and attaches the underlying urllib3 exception via __context__ only. 
        # The ssl.SSLCertVerificationError is then reachable through __context__ deeper in the chain.
        # A set of visited exception ids guards against cycles.
        cause = e
        seen = set()
        while cause is not None and id(cause) not in seen:
            seen.add(id(cause))
            if isinstance(cause, ssl.SSLCertVerificationError):
                print("TLS certificate verification failed for PCCS connection: %s" % e)
                if ca_path:
                    print("The CA path '%s' was used but did not verify the PCCS server certificate." % ca_path)
                    print("Possible causes: wrong CA certificate, incomplete chain, or the PCCS server certificate was replaced.")
                    print("You may use --no-pccs-cert-check to skip TLS certificate verification (not recommended).")
                else:
                    print("Note: TLS certificate verification for PCCS connections is now enabled by default.")
                    print("If you were previously connecting without TLS flags, the PCCS certificate must now be trusted by the Requests Module default CA bundle, or you must supply one of:")
                    print("  --ca <path>           Specify a CA certificate file, CA certificate bundle file, or c_rehash certificate directory for verification.")
                    print("  --no-pccs-cert-check  Disable verification of PCCS' TLS certificate (not recommended).")
                return
            cause = getattr(cause, '__cause__', None) or getattr(cause, '__context__', None)
        # Not a cert verification error - just print the generic SSL error
        print(e)

    @staticmethod
    def _write_output_file(output_file, response):
        if Utils.check_file_writable(output_file):
            with open(output_file, "w") as ofile:
                json.dump(response.json(), ofile)
            print(output_file, " saved successfully.")

    @staticmethod
    def _handle_error(response):
        print("Failed to interact with the PCCS.")
        print("\tStatus code is : %d" % response.status_code)
        print("\tMessage : ", response.text)

def pccs_get(args):
    credentials = Credentials()
    client = PccsClient(credentials, args)
    client.get_platforms()

def pccs_put(args):
    credentials = Credentials()
    client = PccsClient(credentials, args)
    client.upload_collaterals()

def pccs_refresh(args):
    credentials = Credentials()
    client = PccsClient(credentials, args)
    client.refresh_cache_database()

if __name__ == "__main__":
    main()
