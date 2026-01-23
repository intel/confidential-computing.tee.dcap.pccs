#
# Copyright(c) 2025 Intel Corporation
# SPDX-License-Identifier: BSD-3-Clause
#

PCCS_VERSION ?= "9.9.9.9"
PCCS_ADMIN_TOOL_VERSION ?= $(PCCS_VERSION)

.PHONY: default deb rpm build test all
default: all

deb: deb_sgx_dcap_pccs_pkg deb_pccs_admin_tool_pkg
rpm: rpm_sgx_dcap_pccs_pkg rpm_pccs_admin_tool_pkg
all: build test
build: deb rpm
test:
	cd service && npm install && npm test && cd -

.PHONY: deb_sgx_dcap_pccs_pkg
deb_sgx_dcap_pccs_pkg:
	./build_infrastructure/installer/linux/deb/sgx-dcap-pccs/build.sh $(PCCS_VERSION)

.PHONY: deb_pccs_admin_tool_pkg
deb_pccs_admin_tool_pkg:
	./build_infrastructure/installer/linux/deb/intel-tee-pccs-admin-tool/build.sh $(PCCS_ADMIN_TOOL_VERSION)

.PHONY: rpm_sgx_dcap_pccs_pkg
rpm_sgx_dcap_pccs_pkg:
	./build_infrastructure/installer/linux/rpm/sgx-dcap-pccs/build.sh $(PCCS_VERSION)

.PHONY: rpm_pccs_admin_tool_pkg
rpm_pccs_admin_tool_pkg:
	./build_infrastructure/installer/linux/rpm/intel-tee-pccs-admin-tool/build.sh $(PCCS_ADMIN_TOOL_VERSION)

clean:
	./build_infrastructure/installer/linux/deb/sgx-dcap-pccs/clean.sh
	./build_infrastructure/installer/linux/rpm/sgx-dcap-pccs/clean.sh
	./build_infrastructure/installer/linux/deb/intel-tee-pccs-admin-tool/clean.sh
	./build_infrastructure/installer/linux/rpm/intel-tee-pccs-admin-tool/clean.sh
