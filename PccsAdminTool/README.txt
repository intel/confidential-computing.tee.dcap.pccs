Administrator tool for PCCS

Prerequisites
  Install python3 and pip3 first, then install required packages using pip3
    sudo apt install python3
    sudo apt install python3-pip
    pip3 install -r requirements.txt

Usage: ./pccsadmin.py [-h] {get,put,refresh} ...

positional arguments:
  {get,put,refresh}

optional arguments:
  -h, --help       show this help message and exit

1. Get registration data from PCCS service
  ./pccsadmin.py get [-h] [--no-pccs-cert-check | --ca CA] [-u URL] [-o OUTPUT_FILE] [-s SOURCE]

  optional arguments:
          -h, --help            show this help message and exit
          -u URL, --url URL     The URL of the PCCS's GET platforms API; default: https://localhost:8081/sgx/certification/v4/platforms
          -o OUTPUT_FILE, --output_file OUTPUT_FILE
                                The output file name for platform list; default: platform_list.json
          -s SOURCE, --source SOURCE
                                reg - Get platforms from registration table.(default)
                                reg_na - Get platforms whose PCK certs are currently not available from registration table.
                                [FMSPC1,FMSPC2,...] - Get platforms from cache based on the fmspc values. [] to get all cached platforms.
          --no-pccs-cert-check  Disable verification of PCCS' TLS certificate (not recommended).
          --ca CA               Path to a CA certificate file, CA certificate bundle file, or a directory of certificates pre-processed by c_rehash, used to verify the PCCS' certificate.

                                If neither --no-pccs-cert-check nor --ca is specified, the Python Requests module verifies against its default CA bundle.

2. Put platform collateral data or appraisal policy files to PCCS cache db
  ./pccsadmin.py put [-h] [--no-pccs-cert-check | --ca CA] [-u URL] [-i INPUT_FILE] [-d] [-f FMSPC]

  This put command supports the following formats([] means optional):
  1) pccsadmin put [-u https://localhost:8081/sgx/certification/v4/platformcollateral] [-i collateral_file(*.json)]
  2) pccsamdin put -u https://localhost:8081/sgx/certification/v4/appraisalpolicy [-d] -f fmspc -i policy_file(*.jwt)


  optional arguments:
          -h, --help            show this help message and exit
          -u URL, --url URL     The URL of the PCCS's PUT collateral API; default: https://localhost:8081/sgx/certification/v4/platformcollateral
          -i INPUT_FILE, --input_file INPUT_FILE
                                The input file name for platform collaterals or appraisal policy;
                                For /platformcollateral API, default is platform_collaterals.json;
                                For /appraisalpolicy API, the filename of the jwt file must be provided explicitly.
          -d, --default         This policy will become the default policy for this FMSPC.
          -f FMSPC, --fmspc FMSPC
                                FMSPC value
          --no-pccs-cert-check  Disable verification of PCCS' TLS certificate (not recommended).
          --ca CA               Path to a CA certificate file, CA certificate bundle file, or a directory of certificates pre-processed by c_rehash, used to verify the PCCS' certificate.

                                If neither --no-pccs-cert-check nor --ca is specified, the Python Requests module verifies against its default CA bundle.

3. Request PCCS to refresh certificates or collateral in cache database
  ./pccsadmin.py refresh [-h] [--no-pccs-cert-check | --ca CA] [-u URL] [-f fmspc]

  optional arguments:
          -h, --help            show this help message and exit
          -u URL, --url URL     The URL of the PCCS's refresh API; default: https://localhost:8081/sgx/certification/v4/refresh
          -f FMSPCs, --fmspc FMSPCs
                                If this argument is not provided, then it will require PCCS to refresh quote verification collateral.
                                all - Refresh all cached certificates.
                                FMSPC1,FMSPC2,... - Refresh certificates of specified fmspc values.
          --no-pccs-cert-check  Disable verification of PCCS' TLS certificate (not recommended).
          --ca CA               Path to a CA certificate file, CA certificate bundle file, or a directory of certificates pre-processed by c_rehash, used to verify the PCCS' certificate.

                                If neither --no-pccs-cert-check nor --ca is specified, the Python Requests module verifies against its default CA bundle.

Environment variables for TLS configuration:
  The Python Requests module (used internally) honours the following standard environment variables. They provide a persistent alternative to repeating --ca on every command and are especially useful in scripts or CI pipelines.

  REQUESTS_CA_BUNDLE   Path to a CA certificate bundle file or directory.
                       Equivalent to passing --ca <path> on every invocation.

  CURL_CA_BUNDLE       Fallback read by Requests when REQUESTS_CA_BUNDLE is not set.

  Note: --ca on the command line takes precedence over both environment variables.
        --no-pccs-cert-check disables verification regardless of any environment variable.
