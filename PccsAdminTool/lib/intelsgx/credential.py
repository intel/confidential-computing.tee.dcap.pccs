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

try:
    import keyring
except:
    keyring = None
import getpass

class Credentials:
    APPNAME = 'PccsAdmin'
    KEY_ADMINTOKEN = 'ADMIN_TOKEN'

    def get_admin_token(self):
        admin_token = ""
        if keyring is not None:
            try:
                print("Please note: A prompt may appear asking for your keyring password to access stored credentials.")
                admin_token = keyring.get_password(self.APPNAME, self.KEY_ADMINTOKEN)
            except keyring.errors.KeyringError as ke:
                admin_token = ""
        
        while admin_token is None or admin_token == '':
            admin_token = getpass.getpass(prompt="Please input your administrator password for PCCS service:")
            # prompt saving password
            if admin_token != "":
                save_passwd = input("Would you like to remember password in OS keyring? (y/n)")
                if save_passwd.lower() == 'y':
                    self.set_admin_token(admin_token)

        return admin_token

    def set_admin_token(self, token):
        if keyring is not None:
            try:
                print("Please note: A prompt may appear asking for your keyring password to access stored credentials.")
                keyring.set_password(self.APPNAME, self.KEY_ADMINTOKEN, token)
            except keyring.errors.PasswordSetError as ke:
                print("Failed to store admin token.")
                return False
        return True
