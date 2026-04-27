#!/bin/bash
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

arg1=$1
argnum=$#
## Set mydir to the directory containing the script
mydir="${0%/*}"
configFile="$mydir"/config/default.json
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

export NODE_ENV=production

function version_ge() { test "$(printf '%s\n' "$@" | sort -V | head -n 1)" != "$1" || test "$1" = "$2"; }

# check nodejs version
function checkDependencies() {
    echo "Checking nodejs version ..."
    expected_node_v="v18.17.0"
    if command -v node > /dev/null 2>&1
    then
        cur_node_v=$(node -v)
        if version_ge $cur_node_v $expected_node_v; then
            echo "nodejs is installed, continue..."
        else
            echo -e "${RED}The minimum node.js version required is ${expected_node_v}. Installation aborted. ${NC} "
            exit 1
        fi
    else
        echo -e "${RED}Node.js not installed. Please install Node.js version ${expected_node_v} or later. ${NC} "
        exit 1
    fi

    echo "Checking cracklib-runtime ..."
    if ! command -v cracklib-check >/dev/null 2>&1
    then
        echo -e "${RED}cracklib-runtime not installed. Please install cracklib-runtime first and then retry. ${NC} "
        exit 1
    fi
}

function promptDbMigration() {
    echo -e "${YELLOW}Warning: If you are upgrading PCCS from an old release, the existing cache database will be migrated automatically. ${NC} "
    echo -e "${YELLOW}         It's strongly recommended to backup your existing cache database first and then continue the installation. ${NC} "
    while :
    do
        read -p "Do you want to install PCCS now and run database schema migrations? (Y/N) :" auto_update_db
        if [[ "$auto_update_db" == "Y" || "$auto_update_db" == "y" ]]
        then
            break
        elif [[ "$auto_update_db" == "N" || "$auto_update_db" == "n" ]]
        then
            echo "Installation cancelled. Make sure you have a backup of the cache database."
            echo "When you are ready, please re-trigger the configuration process."
            exit 1
        elif [ ! -t 0 ] # non-interactive terminal
        then
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done
}

checkDependencies
promptDbMigration

#Ask for proxy server
echo "Check proxy server configuration for internet connection... "
if [ "$http_proxy" == "" ]
then
    read -p "Enter your http proxy server address, e.g. http://proxy-server:port (Press ENTER if there is no proxy server) :" http_proxy 
fi
if [ "$https_proxy" == "" ]
then
    read -p "Enter your https proxy server address, e.g. http://proxy-server:port (Press ENTER if there is no proxy server) :" https_proxy 
fi

cd `dirname $0`
npm config set proxy $http_proxy
npm config set https-proxy $https_proxy
npm config set engine-strict true
npm install
NPM_INSTALL_RESULT=$?
if [[ $NPM_INSTALL_RESULT -ne 0 ]]
then
    exit $NPM_INSTALL_RESULT
fi

npm audit --audit-level high
NPM_AUDIT_RESULT=$?
if [[ $NPM_AUDIT_RESULT -ne 0 ]]
then
    while :
    do
        if [ -t 0 ]; # Ask questions only when terminal is interactive
        then
            echo ""
            echo "There are some known vulnerabilities in the dependencies of this package."
            echo "Select one of the options to proceed:"
            echo "  1. Continue the installation with tested versions of dependencies accepting their known vulnerabilities."
            echo "  2. Run 'npm audit fix' to automatically update vulnerable dependencies to latest compatible versions."
            echo "  3. Run 'npm audit fix --force' to automatically update vulnerable dependencies ignoring compatibility checks. This may break installed service."
            echo "  4. Abort the installation and wait for a future release of dependencies with resolved vulnerabilities."
            read -p "Choose an option? (1-4) :" option
            case $option in
                1)
                    break ;;
                2)
                    echo "Running 'npm audit fix'"
                    npm audit fix
                    NPM_AUDIT_FIX_RESULT=$?
                    if [[ $NPM_AUDIT_FIX_RESULT -eq 0 ]]
                    then
                        break
                    else
                        echo ""
                        echo "Some vulnerabilities could not be fixed automatically."
                    fi ;;
                3)
                    echo "Running 'npm audit fix --force'"
                    npm audit fix --force
                    NPM_AUDIT_FIX_FORCE_RESULT=$?
                    if [[ $NPM_AUDIT_FIX_FORCE_RESULT -eq 0 ]]
                    then
                        break
                    else
                        echo ""
                        echo "Some vulnerabilities could not be fixed automatically."
                    fi ;;
                4)
                    exit 1 ;;
                *)
                    echo ""
                    echo "Select number between 1 and 4." ;;
            esac
        else # non-interactive terminal
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done
fi


while :
do
    read -p "Do you want to configure PCCS now? (Y/N) :" doconfig 
    if [[ "$doconfig" == "Y" || "$doconfig" == "y" ]] 
    then
        break
    elif [[ "$doconfig" == "N" || "$doconfig" == "n" ]] 
    then
        exit 0
    elif [ ! -t 0 ] # non-interactive terminal
    then
        echo "Non-interactive terminal detected."
        echo "User intervention is necessary to proceed."
        exit 1
    fi
done

#Ask for HTTPS port number
while :
do
    read -p "Set HTTPS listening port [8081] (1024-65535) :" port
    if [ -z $port ]; then 
        port=8081
        break
    elif [[ $port -lt 1024  ||  $port -gt 65535 ]] ; then
        echo -e "${YELLOW}The port number is out of range, please input again.${NC} "
    else
        sed "/\"HTTPS_PORT\"*/c\ \ \ \ \"HTTPS_PORT\" \: ${port}," -i ${configFile}
        break
    fi
done

#Ask whether service should be available locally or externally
while :
do
    read -p "Set the PCCS service to accept local connections only? [Y] (Y/N) :" local_only 
    if [[ -z $local_only  || "$local_only" == "Y" || "$local_only" == "y" ]] 
    then
        local_only="Y"
        sed "/\"hosts\"*/c\ \ \ \ \"hosts\" \: \"127.0.0.1\"," -i ${configFile}
        break
    elif [[ "$local_only" == "N" || "$local_only" == "n" ]] 
    then
        sed "/\"hosts\"*/c\ \ \ \ \"hosts\" \: \"0.0.0.0\"," -i ${configFile}
        break
    fi
done

#Ask for API key 
while :
do
    read -p "Set your Intel PCS API key (Press ENTER to skip) :" apikey 
    if [ -z $apikey ]
    then
        echo -e "${YELLOW}You didn't set Intel PCS API key. You can set it later in config/default.json. ${NC} "
        break
    elif [[ $apikey =~ ^[a-zA-Z0-9]{32}$ ]] && sed "/\"ApiKey\"*/c\ \ \ \ \"ApiKey\" \: \"${apikey}\"," -i ${configFile}
    then
        break
    else
        echo "Your API key is invalid. Please input again. "
    fi
done

if [ "$https_proxy" != "" ]
then
    sed "/\"proxy\"*/c\ \ \ \ \"proxy\" \: \"${https_proxy}\"," -i ${configFile}
fi

#Ask for CachingFillMode
while :
do
    read -p "Choose caching fill method : [LAZY] (LAZY/OFFLINE/REQ) :" caching_mode 
    if [[ -z $caching_mode  || "$caching_mode" == "LAZY" ]] 
    then
        caching_mode="LAZY"
        sed "/\"CachingFillMode\"*/c\ \ \ \ \"CachingFillMode\" \: \"${caching_mode}\"," -i ${configFile}
        break
    elif [[ "$caching_mode" == "OFFLINE" || "$caching_mode" == "REQ" ]] 
    then
        sed "/\"CachingFillMode\"*/c\ \ \ \ \"CachingFillMode\" \: \"${caching_mode}\"," -i ${configFile}
        break
    fi
done

#Ask for administrator password
admintoken1=""
admintoken2=""
admin_pass_set=false
cracklib_limit=4
while [ "$admin_pass_set" == false ]
do
    while test "$admintoken1" == ""
    do
        read -s -p "Set PCCS server administrator password:" admintoken1
        printf "\n"
        if [ ! -t 0 ] # non-interactive terminal
        then
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done
    
    # check password strength
    result="$(cracklib-check <<<"$admintoken1")"
    okay="$(awk -F': ' '{ print $NF}' <<<"$result")"
    if [[ "$okay" != "OK" ]]; then
        if [ "$cracklib_limit" -gt 0 ]; then
            echo -e "${RED}The password is too weak. Please try again($cracklib_limit opportunities left).${NC}"
            admintoken1=""
            cracklib_limit=$(expr $cracklib_limit - 1)
            continue
        else
            echo "Installation aborted. Please try again."
            exit 1
        fi
    fi

    while test "$admintoken2" == ""
    do
        read -s -p "Re-enter administrator password:" admintoken2
        printf "\n"
        if [ ! -t 0 ] # non-interactive terminal
        then
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done

    if test "$admintoken1" != "$admintoken2"
    then
        echo "Passwords don't match."
        admintoken1=""
        admintoken2=""
        cracklib_limit=4
    else
        HASH="$(echo -n "$admintoken1" | sha512sum | tr -d '[:space:]-')"
        sed "/\"AdminTokenHash\"*/c\ \ \ \ \"AdminTokenHash\" \: \"${HASH}\"," -i ${configFile}
        admin_pass_set=true
    fi
done

#Ask for user password
cracklib_limit=4
usertoken1=""
usertoken2=""
user_pass_set=false
while [ "$user_pass_set" == false ]
do
    while test "$usertoken1" == ""
    do
        read -s -p "Set PCCS server user password:" usertoken1
        printf "\n"
        if [ ! -t 0 ] # non-interactive terminal
        then
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done

    # check password strength
    result="$(cracklib-check <<<"$usertoken1")"
    okay="$(awk -F': ' '{ print $NF}' <<<"$result")"
    if [[ "$okay" != "OK" ]]; then
        if [ "$cracklib_limit" -gt 0 ]; then
            echo -e "${RED}The password is too weak. Please try again($cracklib_limit opportunities left).${NC}"
            usertoken1=""
            cracklib_limit=$(expr $cracklib_limit - 1)
            continue
        else
            echo "Installation aborted. Please try again."
            exit 1
        fi
    fi

    while test "$usertoken2" == ""
    do
        read -s -p "Re-enter user password:" usertoken2
        printf "\n"
        if [ ! -t 0 ] # non-interactive terminal
        then
            echo "Non-interactive terminal detected."
            echo "User intervention is necessary to proceed."
            exit 1
        fi
    done

    if test "$usertoken1" != "$usertoken2"
    then
        echo "Passwords don't match."
        usertoken1=""
        usertoken2=""
        cracklib_limit=4
    else
        HASH="$(echo -n "$usertoken1" | sha512sum | tr -d '[:space:]-')"
        sed "/\"UserTokenHash\"*/c\ \ \ \ \"UserTokenHash\" \: \"${HASH}\"," -i ${configFile}
        user_pass_set=true
    fi
done

if command -v openssl > /dev/null 2>&1
then 
    genkey=""
    while [ "$genkey" == "" ]
    do
        read -p "Do you want to generate insecure HTTPS key and cert for PCCS service? [Y] (Y/N) :" genkey 
        if [[ -z "$genkey" ||  "$genkey" == "Y" || "$genkey" == "y" ]] 
        then
            if [ ! -d ssl_key  ];then
                mkdir ssl_key
            fi
            openssl genrsa -out ssl_key/private.pem 2048
            # Since this is an insecure self-signed certificate, the common name (CN)/subject customization does not play a role.
            openssl req -new -key ssl_key/private.pem -out ssl_key/csr.pem -subj "/CN=PCCS Server (self-signed certificate)"            
            openssl x509 -req -days 365 -in ssl_key/csr.pem -signkey ssl_key/private.pem -out ssl_key/file.crt
            break
        elif [[ "$genkey" == "N" || "$genkey" == "n" ]] 
        then
            break
        else
            genkey=""
        fi
    done
else
    echo -e "${YELLOW}You need to setup HTTPS key and cert for PCCS to work. For how-to please check README. ${NC} "
fi
