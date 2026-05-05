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
import sys
import json
from lib.intelsgx.credential import Credentials

PCCS_SERVICE_URL = 'https://localhost:8081/sgx/certification/v4'

def main():
    prog = os.environ.get("PCCS_ADMIN_TOOL_EXECUTABLE_WRAPPER", os.path.basename(os.path.realpath(sys.argv[0])))
    parser = argparse.ArgumentParser(description="Administrator tool for PCCS", prog=prog)
    #parser.add_argument('action', help='Choose your action')
    subparsers = parser.add_subparsers(dest="command")

    #  subparser for get
    parser_get = subparsers.add_parser('get', formatter_class=argparse.RawTextHelpFormatter)
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
    "2. pccsamdin put -u https://localhost:8081/sgx/certification/v4/appraisalpolicy [-d] -f fmspc -i policy_file(*.jwt)"
    )
    parser_put = subparsers.add_parser('put', description=description_put, formatter_class=argparse.RawTextHelpFormatter)
    # add optional arguments for put
    parser_put.add_argument("-u", "--url", help="The URL of the PCCS's API; default: https://localhost:8081/sgx/certification/v4/platformcollateral")
    parser_put.add_argument("-i", "--input_file", help="The input file name for platform collaterals or appraisal policy;\
                            \nFor /platformcollateral API, default is platform_collaterals.json;\
                            \nFor /appraisalpolicy API, the filename of the jwt file must be provided explicitly.")
    parser_put.add_argument("-d", "--default", help="This policy will become the default policy for this FMSPC.", action="store_true")
    parser_put.add_argument('-f', '--fmspc', type=str, help="FMSPC value")
    parser_put.set_defaults(func=pccs_put)

    #  subparser for refresh
    parser_refresh = subparsers.add_parser('refresh')
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

    def get_platforms(self):
        try:
            url = self.args.url or self.GET_URL
            output_file = self.args.output_file or self.OUTPUT_FILE
            if self.args.source:
                url += '?source=' + self.args.source

            token = self.credentials.get_admin_token()
            headers = {'user-agent': self.USER_AGENT, 'admin-token': token}
            params = {}
            response = requests.get(url=url, headers=headers, params=params, verify=False)

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
                response = requests.put(url=url, data=data, headers=headers, params=params, verify=False)

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
                response = requests.put(url=url, data=data_str, headers=headers, params=params, verify=False)
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
                
            response = requests.post(url=url, headers=headers, params=params, verify=False)
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

        except Exception as e:
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
