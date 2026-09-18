#!/usr/bin/env bash
#
# Copyright(c) 2025 Intel Corporation
# SPDX-License-Identifier: BSD-3-Clause
#

set -euo pipefail
SCRIPT_DIR=$(dirname "$0")
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../../../" && pwd)"

LINUX_INSTALLER_DIR="${ROOT_DIR}/build_infrastructure/installer/linux"
LINUX_INSTALLER_COMMON_DIR="${LINUX_INSTALLER_DIR}/common"

INSTALL_PATH=${SCRIPT_DIR}/output

# Cleanup
rm -fr ${INSTALL_PATH}

# Get the configuration for this package
source ${SCRIPT_DIR}/installConfig

# Fetch the gen_source script
cp ${LINUX_INSTALLER_COMMON_DIR}/gen_source/gen_source.py ${SCRIPT_DIR}

# Fetch the shared license BOM so gen_source.py doesn't need to reach outside SCRIPT_DIR
mkdir -p "${SCRIPT_DIR}/BOMs"
cp "${LINUX_INSTALLER_COMMON_DIR}/licenses/BOM_license.txt" "${SCRIPT_DIR}/BOMs/BOM_license.txt"
# Copy the files according to the BOM
python ${SCRIPT_DIR}/gen_source.py --bom=BOMs/intel-tee-pccs-admin-tool.txt --installdir=pkgroot/intel-tee-pccs-admin-tool --deliverydir=${ROOT_DIR}
python ${SCRIPT_DIR}/gen_source.py --bom=BOMs/intel-tee-pccs-admin-tool-package.txt --cleanup=false --deliverydir=${ROOT_DIR}
python ${SCRIPT_DIR}/gen_source.py --bom=BOMs/BOM_license.txt --cleanup=false --deliverydir=${ROOT_DIR}

# Create the tarball
pushd ${INSTALL_PATH} &> /dev/null
tar -zcvf ${TARBALL_NAME} *
popd &> /dev/null
