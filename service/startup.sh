#!/usr/bin/env bash
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


set -e

if test $(id -u) -ne 0; then
    echo "Root privilege is required."
    exit 1
fi

get_manual_command() {
    # Generate a command to run a command as a specific user (accounting for availability of 'su' or 'sudo')
    local cmd="$1"
    local user="${2:-$PCCS_USER}"
    if [ -x /bin/su ]; then
        echo "/bin/su - ${user} -c '${cmd}'"
    else
        echo "sudo -u ${user} bash -c \"${cmd}\""
    fi
}

# Check if terminal supports colors
if [ -t 1 ] && tput colors &>/dev/null; then
    YELLOW='\033[1;33m'
    RED='\033[1;31m'
    CYAN='\033[1;36m'
    GRAY='\033[1;30m'
    MAGENTA='\033[1;35m'
    RESET='\033[0m'
else
    YELLOW=''
    RED=''
    CYAN=''
    GRAY=''
    MAGENTA=''
    RESET=''
fi

PCCS_USER=pccs
PCCS_HOME=$(readlink -m $(dirname "$0"))
if [ "$1" == "debian" ]; then
    adduser --quiet --system $PCCS_USER --group --home $PCCS_HOME --no-create-home --shell /bin/bash
else
    if [ ! $(getent group $PCCS_USER) ]; then
        groupadd $PCCS_USER
    fi
    if ! id "$PCCS_USER" &>/dev/null; then
        if command -v adduser &>/dev/null; then
            adduser --system $PCCS_USER -g $PCCS_USER --home $PCCS_HOME --no-create-home --shell /bin/bash
        else
            useradd -r -g $PCCS_USER -d $PCCS_HOME -s /bin/bash $PCCS_USER
        fi
    fi
fi
chown -R $PCCS_USER:$PCCS_USER $PCCS_HOME
chmod 640 $PCCS_HOME/config/default.json
if [ "$1" == "debian" -a "${DEBIAN_FRONTEND}" != "noninteractive" ]
then
    /bin/su -c "$PCCS_HOME/install.sh" $PCCS_USER
else
    echo -e "$(cat <<EOF

${YELLOW}┌───────────────────────────────────────────────────────────────────────────────┐
│  ${RED}WARNING:${YELLOW} Non-interactive installation!                                       │
│           PCCS post-install configuration has been SKIPPED.                   │
└───────────────────────────────────────────────────────────────────────────────┘${RESET}
┋ You need to configure the service manually before 1st startup. For example, by running: 
┋    ${CYAN}$(get_manual_command "$PCCS_HOME/install.sh")${RESET}
┋
EOF
    )"
fi
#Install PCCS as system service
echo -n "Installing PCCS service ..."
if [ -d /run/systemd/system ]; then
    systemctl daemon-reload
    systemctl enable pccs
    if [ "$1" == "debian" ]; then 
        systemctl start pccs
    fi
elif [ -d /etc/init/ ]; then
    /sbin/initctl reload-configuration
else
    echo " failed."
    if grep -qE 'docker|lxc' /proc/1/cgroup; then
        echo -e "$(cat <<EOF

${GRAY}┌───────────────────────────────────────────────────────────────────────────────┐
│  ${MAGENTA}NOTICE:${GRAY} Running inside a container (without systemd or init).                │
│          PCCS service (daemon) startup has been SKIPPED.                      │
└───────────────────────────────────────────────────────────────────────────────┘${RESET}
┋ You can start PCCS manually by running: 
┋    ${CYAN}$(get_manual_command "cd ${PCCS_HOME} && NODE_ENV=production /usr/bin/node ./pccs_server.js")${RESET}
┋
EOF
        )"
    else
        # Non-Docker host without systemd or upstart (e.g., older Debian/Ubuntu - bail out)
        echo "Unsupported platform - neither systemctl nor initctl was found."
        exit 5
    fi    
fi
echo "finished."
echo "Installation completed successfully."
