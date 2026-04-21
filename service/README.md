# Provisioning Certificate Caching Service (PCCS)

# Table of Contents

- [Introduction](#introduction)
- [How to install](#how-to-install)
    - [Prerequisites](#prerequisites)
    - [Install via Linux Debian package installer](#install-via-linux-debian-package-installer)
    - [Install via RPM package installer](#install-via-rpm-package-installer)
    - [Linux manual installation](#linux-manual-installation)
    - [Windows manual installation](#windows-manual-installation)
- [Configuration file (`config/default.json`)](#configuration-file-configdefaultjson)
- [Caching Fill Mode](#caching-fill-mode)
    - [LAZY mode](#lazy-mode)
    - [REQ mode](#req-mode)
    - [OFFLINE mode](#offline-mode)
- [Local service vs. Remote service](#local-service-vs-remote-service)
- [Manage the PCCS service](#manage-the-pccs-service)
- [Uninstall](#uninstall)
- [Further reading](#further-reading)

## Introduction

This is a lightweight Provisioning Certificate Caching Service implemented in Node.js for reference.
It retrieves PCK Certificates and other collaterals on-demand using the internet at runtime, and then caches them in local database.
The PCCS exposes similar HTTPS interfaces as [Intel® SGX and Intel® TDX Provisioning Certification Service](https://api.portal.trustedservices.intel.com/content/documentation.html#pcs).

## How to install

> [!NOTE]
> You may also want to refer to our [enabling documentation](https://cc-enabling.trustedservices.intel.com/intel-tdx-enabling-guide/02/infrastructure_setup/#provisioning-certificate-caching-service-pccs) for a streamlined installation instruction.

### Prerequisites

Install Node.js (Supported versions are `18.17.0` and later)

- For Debian and Ubuntu based distributions, please refer to https://github.com/nodesource/distributions
- To download and install, go to https://nodejs.org/en/download/

> [!NOTE]
> The next release will no longer support Node.js v18 which is already End-of-Life (EOL) and v20 which will reach End-of-Life (EOL) status soon.
> Future releases will only support Node.js LTS versions that are in Active LTS or Maintenance LTS status according to the official [Node.js release schedule](https://nodejs.org/en/about/previous-releases).

### Install via Linux Debian package installer

  ``` bash
  # If you have the package repository set-up
  sudo apt install sgx-dcap-pccs

  # Alternatively, if you have built from source or downloaded the package manually
  sudo apt install ./sgx-dcap-pccs*.deb
  ```

You will be prompted for configuration settings during the installation process.
If you would like to bypass the prompts and configure the PCCS at a later stage, make sure to set `DEBIAN_FRONTEND=noninteractive` before invoking `apt`.
You'll need to then call `/opt/intel/sgx-dcap-pccs/startup.sh debian` manually to finish up the interactive configuration, or manually edit the relevant configuration files.

> [!NOTE]
> If you have installed old `libsgx-dcap-pccs` releases with root privilege before, some folders may remain even after you uninstall it.  
> You can delete them manually with root privilege, for example, `~/.npm/`, etc.

### Install via RPM package installer

  ``` bash
  # If you have the package repository set-up
  sudo dnf install sgx-dcap-pccs

  # Alternatively, if you have built from source or downloaded the package manually
  sudo dnf install ./sgx-dcap-pccs*.rpm
  ```

After the RPM package was installed, go to the root directory of the PCCS (`/opt/intel/sgx-dcap-pccs/`) and run `install.sh` with account `pccs`:
   ``` bash
   sudo -u pccs ./install.sh
   ```

### Linux manual installation

1. Put all the files and sub folders in this directory to your preferred place with right permissions set to launch a web service.
2. Install dependencies if they are not already installed.  
   ```
   sudo apt install nodejs cracklib-runtime
   ```

3. From the root directory of your installation folder, run `./install.sh`.
4. If you want to run PCCS as a system service, run `sudo ./startup.sh`
5. To start the service and check its status, see section [Manage the PCCS service](#manage-the-pccs-service)

### Windows manual installation

1. Put all the files and sub folders in this directory to your preferred place with right permissions set to launch a web service.
2. (Optional) If the target machine connects to internet through a proxy server, configure proxy server first
   before continuing. 
   ``` batch
   npm config set http-proxy http://your-proxy-server:port
   npm config set https-proxy http://your-proxy-server:port
   npm config set proxy http://your-proxy-server:port
   ```

3. Update config file based on your environment, see section [Configuration file](#configuration-file-configdefaultjson).

4. Private key and public certificate

   The PCCS requires a private key and certificate pair to run as HTTPS server.
   For production environment you should use formally issued key and certificate.
   Please put the key files in `ssl_key` subdirectory.

   You can also generate an insecure key and certificate pair with following commands (only for debug purpose):

   ``` batch
   if not exist ssl_key mkdir ssl_key
   cd ssl_key
   openssl genrsa -out private.pem 2048
   openssl req -new -key private.pem -out csr.pem
   openssl x509 -req -days 365 -in csr.pem -signkey private.pem -out file.crt
   cd ..
   ```

5. From the root directory of your installation folder, run `install.bat`.
6. If you want to run PCCS as a system service, run `startup.bat` with administrator privilege.
7. To start the service and check its status, see section [Manage the PCCS service](#manage-the-pccs-service)

> [!NOTE]
> If a self-signed insecure key and certificate are used, you need to set `"use_secure_cert": false` when
configuring the default QPL library (see [QPL README](https://github.com/intel/SGXDataCenterAttestationPrimitives/blob/main/QuoteGeneration/qpl/README.md)).

## Configuration file *([`config/default.json`](./config/default.json))*

- **`HTTPS_PORT`** - The port you want the PCCS to listen on. The default listening port is `8081`.
- **`hosts`** - The hosts that will be accepted for connections. Default is localhost only. To accept all connections use `0.0.0.0`
- **`uri`** - The URL of Intel Provisioning Certificate Service. The default URL is `https://api.trustedservices.intel.com/sgx/certification/v4/`
- **`ApiKey`** - The PCCS uses this API key to request collaterals from Intel® SGX and Intel® TDX Provisioning Certification Service (Intel PCS).  
  User needs to subscribe first to obtain an API key.  
  For how to subscribe to Intel PCS and receive an API key, goto https://api.portal.trustedservices.intel.com/provisioning-certification and click on [_Subscribe_](https://api.portal.trustedservices.intel.com/products#product=liv-intel-software-guard-extensions-provisioning-certification-service).
- **`proxy`** - Specify the proxy server for internet connection, for example, `"http://192.168.1.1:80"`. Leave blank for no proxy or system proxy.
- **`RefreshSchedule`** - cron-style refresh schedule for the PCCS to refresh cached artifacts including CRL/TCB Info/QE Identity/QVE Identity.
  The default setting is `"0 0 1 * * *"`, which means refresh at 1:00 AM every day.
- **`UserTokenHash`** - Sha512 hash of the user token for the PCCS client user to register a platform. For example, PCK Cert ID retrieval tool will use the user token to send platform information to the PCCS.
- **`AdminTokenHash`** - Sha512 hash of the administrator token for the PCCS administrator to perform a manual refresh of cached artifacts.

> [!NOTE]
> For Windows you need to set the UserTokenHash and AdminTokenHash manually. For example, you can calculate SHA512 hash using the following PowerShell snippet:

  ``` powershell
  [BitConverter]::ToString(
    [System.Security.Cryptography.SHA512]::Create().ComputeHash(
        [System.Text.Encoding]::UTF8.GetBytes((Read-Host "Type the secret token (password) to hash"))
    )
  ).Replace('-', '').ToLower()
  ```

- **`CachingFillMode`** - The method used to fill the cache DB. Can be one of the following: `LAZY`/`REQ`/`OFFLINE`. For more details see the section [Caching Fill Mode](#caching-fill-mode).
- **`LogLevel`** - Log level. Use the same levels as npm: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`. Default is `info`.
- **`DB_CONFIG`** - You can choose `sqlite` or `mysql` and many other DBMSes. For `sqlite`, you don't need to change anything. For other DBMSes, you need to set database connection options correctly. Normally you need to change database, username, password, host and dialect to connect to your DBMS.  
> [!NOTE]
> It's recommended to delete the cache database first if you have installed a version older than 1.9 because the database is not compatible.

## Caching Fill Mode

When a new server platform is introduced to the data center or the cloud service provider that will require SGX remote attestation, the caching service will need to import the platform’s SGX attestation collateral retrieved from Intel.
This collateral will be used for both generating and verifying ECDSA quotes.
Currently, the PCCS supports three caching fill methods:

### `LAZY` mode
In this method of filling the cache, when the PCCS gets a retrieval request (PCK Cert, TCB etc.) at runtime, it looks for the collaterals in its database to see if they are already in the cache.  
If they do not exist, it will contact the Intel PCS to retrieve the collaterals.  
> [!NOTE]
> This mode only works when internet connection is available.

### `REQ` mode
In this method of filling the cache, the PCCS creates a platform database entry when the PCCS receives the platform registration requests during platform deployment/provisioning.  
The PCCS does not return any data to the caller but contacts the Intel PCS to retrieve the platform's collaterals if they are not in its cache.  
The PCCS saves the retrieved collateral in cache database for use during runtime.  
> [!NOTE]
> This mode requires the PCCS to have an Internet connection at deployment/provisioning time.  
> During runtime, the PCCS uses cache data only and does not contact Intel PCS.

### `OFFLINE` mode
In this method of filling the cache, the PCCS creates a platform database entry to save platform registration information sent by the [PCK Cert ID retrieval tool](https://github.com/intel/SGXDataCenterAttestationPrimitives/tree/main/tools/PCKRetrievalTool).  
Later, [PCCS Admin Tool](../PccsAdminTool) can be used on a PCCS-connected host in order to get and save the pending registration request to a JSON file.  
The file can be then manually transferred to an Internet-connected host with the [PCS Client Tool](https://github.com/intel/SgxDataCenterAttestationPrimitives/tree/main/tools/PcsClientTool) installed. PCS Client tool can fetch the platform collaterals from Intel PCS and save the result to an output file.  
The file with the collaterals can be then transferred back to a PCCS-connected host and [PCCS Admin Tool](../PccsAdminTool) can be used to upload them to the PCCS.  
> [!NOTE]
> In this mode the PCCS does not have access to the Intel PCS on the Internet.

## Local service vs. Remote service

You can run the PCCS on `localhost` for product development or setup it as a public remote service in datacenter.
Typical setup flow for **Local** Service mode (Ubuntu 22.04 as example):

1. Install Node.js via package manager (version 18.17 or later from official Node.js site).
2. Request an API key from Intel's Provisioning Certificate Service.
3. Install the PCCS through Debian package.

You can test the PCCS by running QuoteGeneration sample:

1. Set `"use_secure_cert": false` in `/etc/sgx_default_qcnl.conf`.
2. Build and run [QuoteGeneration sample](https://github.com/intel/SGXDataCenterAttestationPrimitives/tree/main/SampleCode/QuoteGenerationSample) and verify `CertType=5` quote is generated.

For **Remote** service mode, you must use a formal key and certificate pair. You should also change `'hosts'` to `0.0.0.0` to accept remote connections. Also make sure the firewall is not blocking your listening port.
In `/etc/sgx_default_qcnl.conf`, set `"use_secure_cert": true` (For Windows see the OS-specific note of [QPL README](https://github.com/intel/SGXDataCenterAttestationPrimitives/tree/main/QuoteGeneration/qpl#configuration)).

## Manage the PCCS service

- If the PCCS was installed as a system service using Debian or RPM package

1. Start/Stop/Restart PCCS:
   ``` bash
   sudo systemctl start pccs
   sudo systemctl stop pccs
   sudo systemctl restart pccs
   ```

2. Check status:
   ```bash
   sudo systemctl status pccs
   ```

- If the PCCS was installed as Windows service

1. Check `intelrsgxpckcertificatecachingservice.exe` service status in Task Manager (Services tab) or `Intel(R) SGX PCK Certificate Caching Service` service status in the Services management console (services.msc).
2. Start/Stop the service from Task Manager (Services tab) or Services management console (services.msc)
   or use the following commands in an administrator command prompt:
   ``` batch
   net start "Intel(R) SGX PCK Certificate Caching Service"
   net stop "Intel(R) SGX PCK Certificate Caching Service"
   ```
3. Read application logs stored in `*.log` files in `daemon/` folder in service installation directory
4. Service events can be found in Events Viewer in `Windows Logs` -> `Application` section by source `intelrsgxpckcertificatecachingservice.exe` or `Intel(R) SGX PCK Certificate Caching Service`

- If the PCCS was installed manually by current user, you can start it with the following command:
  ``` bash
  NODE_ENV=production node pccs_server.js
  ```
  or simply
  ```bash
  npm start
  ```
  executed inside installation directory.

  PCCS installed this way won't start automatically after machine restart. You need to start it manually after each reboot.

## Uninstall

* If the PCCS service was installed through Debian/RPM package, you can use Linux package manager to uninstall it.
* If the PCCS service was installed manually, you can run below script to uninstall it:
    * On Linux
      ```bash
      ./uninstall.sh
      ```
    * On Windows (run with administrator privilege)
      ```batch
      uninstall.bat 
      ```

## Further reading

1. The PCCS Design Guide is available at https://cc-enabling.trustedservices.intel.com/intel-sgx-tdx-pccs.
2. There's a `Dockerfile` available for running the PCCS as a container. See the [README](container/README.md) in `container` subdirectory.