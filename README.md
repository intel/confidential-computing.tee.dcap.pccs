# Intel&reg; SGX/TDX Provisioning Certificate Caching Service (Intel&reg; SGX/TDX PCCS)

## Introduction

This repository hosts two primary components:

| Name                 | Source location                    | Description                                                                  |
|----------------------|------------------------------------|------------------------------------------------------------------------------|
| ***PCCS Service***   | [`./service`](service)             | Node.js REST service for SGX collateral caching                              |
| ***PCCS AdminTool*** | [`./PccsAdminTool`](PccsAdminTool) | Utilities for managing the cached collateral, manual refresh and inspection  |

Together they support Intel&reg; SGX DCAP remote attestation by locally caching provisioning collateral consumed during quote generation *(PCK certificates, PCK certificate chains)* and verification *(TCB info, CRLs, QE/QvE identities, root CAs, appraisal policies)*, reducing latency and external dependencies.

PCCS also caches Intel SGX DCAP provisioning certification collateral (i.e., Platform Manifests), helping centralize the infrastructure set-up as well. For more information, refer to [its README](service/README.md).

For broader DCAP context *(Quote Generation / Verification stacks, QPL, QE/QvE identities)*, see the [DCAP project](https://github.com/intel/SGXDataCenterAttestationPrimitives)
and the [SGX project](https://github.com/intel/linux-sgx).

## License

This project is licensed under the BSD license. See [License.txt](License.txt) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Instructions

### Install Intel(R) SGX Provisioning Certificate Caching Service (PCCS)

Please follow the instructions in the [service/README.md](service/README.md) to install Intel(R) SGX Provisioning Certificate Caching Service (PCCS).

### Install Administrator tool for PCCS

Please follow the instructions in the [PccsAdminTool/readme.txt](PccsAdminTool/README.txt) to install Administrator tool for PCCS.

## Package downloads (Linux)

Pre-packaged installers of both the **PCCS Service** (`sgx-dcap-pccs`) and the **PCCS Admin Tool** (`intel-tee-pccs-admin-tool`) are included in the OS distribution-specific package (`sgx_{rpm|deb}_local_repo.tgz`) which can be downloaded from the DCAP download site:

* latest version: https://download.01.org/intel-sgx/latest/dcap-latest/linux/distro/
* specific version (i.e. `1.25`): https://download.01.org/intel-sgx/sgx-dcap/1.25/linux/distro/

Additionally, for Ubuntu the packages are available in the online repository hosted at https://download.01.org/intel-sgx/sgx_repo/ubuntu/ ([setup instructions](https://cc-enabling.trustedservices.intel.com/intel-tdx-enabling-guide/02/infrastructure_setup/#__tabbed_1_2)).
