/* Copyright(c) 2025 Intel Corporation
   SPDX-License-Identifier: BSD-3-Clause */

import { selectBestPckCert } from './pckCertSelection.js';
import { expect } from 'chai';
import sinon from 'sinon';
import X509 from '../x509/x509.js';
import Constants from '../constants/index.js';

const validTestData = {
    rawCpusvn: '03040202040100050000000000000000',
    rawPcesvn: '0F00',
    pceid:     '0000',
    tcbInfo:   {
        pceId:     '0000',
        fmspc:     '123456780000',
        tcbType:   0,
        tcbLevels: [
            {
                tcb: {
                    sgxtcbcomponents: [
                        { svn: 4 }, { svn: 4 }, { svn: 2 }, { svn: 2 }, { svn: 4 }, { svn: 1 }, { svn: 0 }, { svn: 3 },
                        { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }
                    ],
                    pcesvn: 11
                }
            },
            {
                tcb: {
                    sgxtcbcomponents: [
                        { svn: 3 }, { svn: 3 }, { svn: 2 }, { svn: 2 }, { svn: 4 }, { svn: 1 }, { svn: 0 }, { svn: 3 },
                        { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }
                    ],
                    pcesvn: 11
                }
            },
            {
                tcb: {
                    sgxtcbcomponents: [
                        { svn: 2 }, { svn: 2 }, { svn: 2 }, { svn: 2 }, { svn: 3 }, { svn: 1 }, { svn: 0 }, { svn: 3 },
                        { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }
                    ],
                    pcesvn: 5
                }
            },
            {
                tcb: {
                    sgxtcbcomponents: [
                        { svn: 1 }, { svn: 1 }, { svn: 2 }, { svn: 2 }, { svn: 1 }, { svn: 1 }, { svn: 0 }, { svn: 3 },
                        { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }, { svn: 0 }
                    ],
                    pcesvn: 4
                }
            }
        ]
    },
    pckCertData: [
        {
            tcbm:     '040402020401000700000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcDCCBBegAwIBAgIVAIIkZD86jNCNJbZWlp37r1jl0+M+MAoGCCqGSM49BAMC\nMHExIzAhBgNVBAMMGkludGVsIFNHWCBQQ0sgUHJvY2Vzc29yIENBMRowGAYDVQQK\nDBFJbnRlbCBDb3Jwb3JhdGlvbjEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNV\nBAgMAkNBMQswCQYDVQQGEwJVUzAeFw0yNjAxMTMxMjA4MzFaFw0zMzAxMTMxMjA4\nMzFaMHAxIjAgBgNVBAMMGUludGVsIFNHWCBQQ0sgQ2VydGlmaWNhdGUxGjAYBgNV\nBAoMEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkG\nA1UECAwCQ0ExCzAJBgNVBAYTAlVTMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\nIzQCvlfIxC7Yq0/BxGOLtGOxj3GlntXMaGRwBYnpdB1l6xCATaX+F0XSon0ITMIj\ndxzCi6do/F3t4iBsHEUQ+qOCAoswggKHMB8GA1UdIwQYMBaAFJ8Gl+9TIUTU+kx+\n6LqNs9Ml5JKQMFAGA1UdHwRJMEcwRaBDoEGGP2h0dHBzOi8vMTI3LjAuMC4xOjg0\nNDQvc2d4L2NlcnRpZmljYXRpb24vdjIvcGNrY3JsP2NhPXByb2Nlc3NvcjAdBgNV\nHQ4EFgQUUIUEl6vC8wYkn79H6MkSbEJtbs0wDgYDVR0PAQH/BAQDAgbAMAwGA1Ud\nEwEB/wQCMAAwggHTBgkqhkiG+E0BDQEEggHEMIIBwDAeBgoqhkiG+E0BDQEBBBAc\nfZDkNWx5KO7SMLMO6UPvMIIBYwYKKoZIhvhNAQ0BAjCCAVMwEAYLKoZIhvhNAQ0B\nAgECAQQwEAYLKoZIhvhNAQ0BAgICAQQwEAYLKoZIhvhNAQ0BAgMCAQIwEAYLKoZI\nhvhNAQ0BAgQCAQIwEAYLKoZIhvhNAQ0BAgUCAQQwEAYLKoZIhvhNAQ0BAgYCAQEw\nEAYLKoZIhvhNAQ0BAgcCAQAwEAYLKoZIhvhNAQ0BAggCAQcwEAYLKoZIhvhNAQ0B\nAgkCAQAwEAYLKoZIhvhNAQ0BAgoCAQAwEAYLKoZIhvhNAQ0BAgsCAQAwEAYLKoZI\nhvhNAQ0BAgwCAQAwEAYLKoZIhvhNAQ0BAg0CAQAwEAYLKoZIhvhNAQ0BAg4CAQAw\nEAYLKoZIhvhNAQ0BAg8CAQAwEAYLKoZIhvhNAQ0BAhACAQAwEAYLKoZIhvhNAQ0B\nAhECAQswHwYLKoZIhvhNAQ0BAhIEEAQEAgIEAQAHAAAAAAAAAAAwEAYKKoZIhvhN\nAQ0BAwQCAAAwFAYKKoZIhvhNAQ0BBAQGEjRWeAAAMA8GCiqGSIb4TQENAQUKAQAw\nCgYIKoZIzj0EAwIDRwAwRAIgMxY73Uo21qn8Wef740y40AJEGDyuN3qMsh+nUkDz\nszYCIFqWeP0OeW8IJYhxvUSRMs5377DpEA7OJ4DR3+0Smoic\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '040402020401000500000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcTCCBBagAwIBAgIUCk9x/UfUfzSNdcqS3pZWVxXxVXswCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARI\n4XAO7TitEeiZgsw5G0YjzYByUd+j1T0+utRp7Jmtnhpwh5lMvV3xlzbSayJVHv8d\nOOSJRxkSdyI7OV9Xd49fo4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBRCwZ42hM2upJNhPUZyFT0xynnShDAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBBDAQBgsqhkiG+E0BDQECAgIBBDAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBBDAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBBTAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBCzAfBgsqhkiG+E0BDQECEgQQBAQCAgQBAAUAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNJADBGAiEAy+kA/LW2g3TQo+myDtwXzUUG3OOBHtznNedSIaGY\n34ICIQC+QptP47JOvPW+RNO7Qk+hJ12fBH5BiMRUK6zkbgzUng==\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '040402020401000300000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcTCCBBegAwIBAgIVAK8zZwenaeW120JHIN/NGJRk4cCcMAoGCCqGSM49BAMC\nMHExIzAhBgNVBAMMGkludGVsIFNHWCBQQ0sgUHJvY2Vzc29yIENBMRowGAYDVQQK\nDBFJbnRlbCBDb3Jwb3JhdGlvbjEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNV\nBAgMAkNBMQswCQYDVQQGEwJVUzAeFw0yNjAxMTMxMjA4MzFaFw0zMzAxMTMxMjA4\nMzFaMHAxIjAgBgNVBAMMGUludGVsIFNHWCBQQ0sgQ2VydGlmaWNhdGUxGjAYBgNV\nBAoMEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkG\nA1UECAwCQ0ExCzAJBgNVBAYTAlVTMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\nzae+Mp9LAShySgqIVMPY3RHUVrKToRpg17CS4VEnsNJZEcF3EZI6hCBUDI3F7K/e\nUXC0q4VjgEf63oOXdDFMGaOCAoswggKHMB8GA1UdIwQYMBaAFJ8Gl+9TIUTU+kx+\n6LqNs9Ml5JKQMFAGA1UdHwRJMEcwRaBDoEGGP2h0dHBzOi8vMTI3LjAuMC4xOjg0\nNDQvc2d4L2NlcnRpZmljYXRpb24vdjIvcGNrY3JsP2NhPXByb2Nlc3NvcjAdBgNV\nHQ4EFgQUi/PG+2++n+uV4/JSrjEFdcZwUZQwDgYDVR0PAQH/BAQDAgbAMAwGA1Ud\nEwEB/wQCMAAwggHTBgkqhkiG+E0BDQEEggHEMIIBwDAeBgoqhkiG+E0BDQEBBBAc\nfZDkNWx5KO7SMLMO6UPvMIIBYwYKKoZIhvhNAQ0BAjCCAVMwEAYLKoZIhvhNAQ0B\nAgECAQQwEAYLKoZIhvhNAQ0BAgICAQQwEAYLKoZIhvhNAQ0BAgMCAQIwEAYLKoZI\nhvhNAQ0BAgQCAQIwEAYLKoZIhvhNAQ0BAgUCAQQwEAYLKoZIhvhNAQ0BAgYCAQEw\nEAYLKoZIhvhNAQ0BAgcCAQAwEAYLKoZIhvhNAQ0BAggCAQMwEAYLKoZIhvhNAQ0B\nAgkCAQAwEAYLKoZIhvhNAQ0BAgoCAQAwEAYLKoZIhvhNAQ0BAgsCAQAwEAYLKoZI\nhvhNAQ0BAgwCAQAwEAYLKoZIhvhNAQ0BAg0CAQAwEAYLKoZIhvhNAQ0BAg4CAQAw\nEAYLKoZIhvhNAQ0BAg8CAQAwEAYLKoZIhvhNAQ0BAhACAQAwEAYLKoZIhvhNAQ0B\nAhECAQswHwYLKoZIhvhNAQ0BAhIEEAQEAgIEAQADAAAAAAAAAAAwEAYKKoZIhvhN\nAQ0BAwQCAAAwFAYKKoZIhvhNAQ0BBAQGEjRWeAAAMA8GCiqGSIb4TQENAQUKAQAw\nCgYIKoZIzj0EAwIDSAAwRQIhANhdL3JtJnhaRkLN/BSVC79G6Htfi4mScTyT8AUg\nnymjAiBP6yal6hNx0slGhG4FVHhwvu9jh9EbfbuhiF9FiAfiag==\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '030302020401000500000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcDCCBBagAwIBAgIUGdA/EqdbF2t1eQYzPlZjdny8ScAwCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATe\nDFtGw0PZyDypJ4sinswL871wELo9np6Hk6CFDAvPWIhYBMoPvPGoKB4JKJ7cP5KI\nrshth11Q9wh9NtnfocxHo4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBT3nFQGClETyPzlE+67WdZkZPQVejAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBAzAQBgsqhkiG+E0BDQECAgIBAzAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBBDAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBBTAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBCzAfBgsqhkiG+E0BDQECEgQQAwMCAgQBAAUAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNIADBFAiBeswixUiotW8vSi/MvELN86rHPLOO0pTowEfKOXtrB\nsQIhAO0cLDJCka/y0hDUycx82qUjPAb0TXABN4RSA7CDSy8a\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '030302020401000300000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcTCCBBagAwIBAgIUUnrubmqITDGZ5GDpnE1j2Lgp6fAwCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATz\n7cSvYVpDyl77t/SYePJ6CowZvw3TRJkUy2FAj4I/SdAmhRyO8rKcRZQ5NSvaVeZh\nKL9QLX1iAbWCvH3IXhIKo4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBThHCszimymeGo5/Mty3VUyN7AzOTAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBAzAQBgsqhkiG+E0BDQECAgIBAzAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBBDAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBAzAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBCzAfBgsqhkiG+E0BDQECEgQQAwMCAgQBAAMAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNJADBGAiEA5ybTa17s5Z1w84XBb/SrKUwcyW2o8AMYA2pBupIk\nQkYCIQCCtAI4saYlpqZYvaoVnPaFwXXOmqwPsdsdkEv5NhPjJA==\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '020202020301000500000000000000000D00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEbzCCBBagAwIBAgIUU9nQaqN+fHk7prvhn186m2P63YwwCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQe\nLxHlXk/sVtSP6waibkff5gxtlwxpoMimwQgEvRbczDEW9UuUgjdRYK8goV9TBhIs\no1+KkpbecRLvaeBhFv8co4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBT0QWwB3lSRTDCNWbiw6IB9E06QvTAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBAjAQBgsqhkiG+E0BDQECAgIBAjAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBAzAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBBTAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBDTAfBgsqhkiG+E0BDQECEgQQAgICAgMBAAUAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNHADBEAiA1DWKGaOaNldR/w28QHo9a56vddNkxo5W5zQmumG4W\nDgIgeDYroWZncDxQKxP+0StnWWpcY/ro48DMluMsrxwVLYY=\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '020202020301000500000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcDCCBBagAwIBAgIUXKsIuCosRpGmiul18kgqz5WQCBYwCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAATx\nqLQW6ggnJrj3O5NyilLDN+KlL6tK5J/IncD8NaM90OiXWlkq3p64IJehSBJmtgjt\ny9/mki0zr9RNc+sHwxr7o4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBRe2CH0qWEWZ+NyRDmUODRYfJanVjAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBAjAQBgsqhkiG+E0BDQECAgIBAjAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBAzAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBBTAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBCzAfBgsqhkiG+E0BDQECEgQQAgICAgMBAAUAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNIADBFAiEApoo+wg6xmd8cceVm14nodys70twjRvNPx1+3KRYg\nh8ACIBUScMz1vaefvs6HwnD5zafap8kZ21sad7NSNYUyrFZD\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '020202020301000500000000000000000500',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEbzCCBBagAwIBAgIUEkk17tNZxdix6EFEJ+thHMD3IcwwCgYIKoZIzj0EAwIw\ncTEjMCEGA1UEAwwaSW50ZWwgU0dYIFBDSyBQcm9jZXNzb3IgQ0ExGjAYBgNVBAoM\nEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkGA1UE\nCAwCQ0ExCzAJBgNVBAYTAlVTMB4XDTI2MDExMzEyMDgzMVoXDTMzMDExMzEyMDgz\nMVowcDEiMCAGA1UEAwwZSW50ZWwgU0dYIFBDSyBDZXJ0aWZpY2F0ZTEaMBgGA1UE\nCgwRSW50ZWwgQ29ycG9yYXRpb24xFDASBgNVBAcMC1NhbnRhIENsYXJhMQswCQYD\nVQQIDAJDQTELMAkGA1UEBhMCVVMwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARY\n02oxALzWsBorvnw2pPgvNXb0Y504Hj0Rd3Glr6KCYGMF2coLf7ZE5vmYbBIDwU0d\ngEx0vNCqlBk4HcjHO+2uo4ICizCCAocwHwYDVR0jBBgwFoAUnwaX71MhRNT6TH7o\nuo2z0yXkkpAwUAYDVR0fBEkwRzBFoEOgQYY/aHR0cHM6Ly8xMjcuMC4wLjE6ODQ0\nNC9zZ3gvY2VydGlmaWNhdGlvbi92Mi9wY2tjcmw/Y2E9cHJvY2Vzc29yMB0GA1Ud\nDgQWBBQ2eT5uIdPECgcfy38jIFFExp0UoTAOBgNVHQ8BAf8EBAMCBsAwDAYDVR0T\nAQH/BAIwADCCAdMGCSqGSIb4TQENAQSCAcQwggHAMB4GCiqGSIb4TQENAQEEEBx9\nkOQ1bHko7tIwsw7pQ+8wggFjBgoqhkiG+E0BDQECMIIBUzAQBgsqhkiG+E0BDQEC\nAQIBAjAQBgsqhkiG+E0BDQECAgIBAjAQBgsqhkiG+E0BDQECAwIBAjAQBgsqhkiG\n+E0BDQECBAIBAjAQBgsqhkiG+E0BDQECBQIBAzAQBgsqhkiG+E0BDQECBgIBATAQ\nBgsqhkiG+E0BDQECBwIBADAQBgsqhkiG+E0BDQECCAIBBTAQBgsqhkiG+E0BDQEC\nCQIBADAQBgsqhkiG+E0BDQECCgIBADAQBgsqhkiG+E0BDQECCwIBADAQBgsqhkiG\n+E0BDQECDAIBADAQBgsqhkiG+E0BDQECDQIBADAQBgsqhkiG+E0BDQECDgIBADAQ\nBgsqhkiG+E0BDQECDwIBADAQBgsqhkiG+E0BDQECEAIBADAQBgsqhkiG+E0BDQEC\nEQIBBTAfBgsqhkiG+E0BDQECEgQQAgICAgMBAAUAAAAAAAAAADAQBgoqhkiG+E0B\nDQEDBAIAADAUBgoqhkiG+E0BDQEEBAYSNFZ4AAAwDwYKKoZIhvhNAQ0BBQoBADAK\nBggqhkjOPQQDAgNHADBEAiAfHLw4J+YBuTG0R/MogqFi8SFYtnEnyMtEW9KltwzR\nRgIgRfuD247gVDl4nzLzPePXRSFM8y+ecoeaJp0+kgWnEwY=\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '020202020301000300000000000000000B00',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcTCCBBegAwIBAgIVAI0aSxDBlZwuhoDmRiXSRdbm9u78MAoGCCqGSM49BAMC\nMHExIzAhBgNVBAMMGkludGVsIFNHWCBQQ0sgUHJvY2Vzc29yIENBMRowGAYDVQQK\nDBFJbnRlbCBDb3Jwb3JhdGlvbjEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNV\nBAgMAkNBMQswCQYDVQQGEwJVUzAeFw0yNjAxMTMxMjA4MzFaFw0zMzAxMTMxMjA4\nMzFaMHAxIjAgBgNVBAMMGUludGVsIFNHWCBQQ0sgQ2VydGlmaWNhdGUxGjAYBgNV\nBAoMEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkG\nA1UECAwCQ0ExCzAJBgNVBAYTAlVTMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\nK8NAs/AQmksxI3exL7+Ic5g3ibBZeegtEYOjmtZDkjp5Kk5wt6r29xAyCcb0c7kc\ndkGvp4Ky6vWu9pCjxCKC0qOCAoswggKHMB8GA1UdIwQYMBaAFJ8Gl+9TIUTU+kx+\n6LqNs9Ml5JKQMFAGA1UdHwRJMEcwRaBDoEGGP2h0dHBzOi8vMTI3LjAuMC4xOjg0\nNDQvc2d4L2NlcnRpZmljYXRpb24vdjIvcGNrY3JsP2NhPXByb2Nlc3NvcjAdBgNV\nHQ4EFgQUDFm/jgCR+ewgKN6iDKR95CEzM7kwDgYDVR0PAQH/BAQDAgbAMAwGA1Ud\nEwEB/wQCMAAwggHTBgkqhkiG+E0BDQEEggHEMIIBwDAeBgoqhkiG+E0BDQEBBBAc\nfZDkNWx5KO7SMLMO6UPvMIIBYwYKKoZIhvhNAQ0BAjCCAVMwEAYLKoZIhvhNAQ0B\nAgECAQIwEAYLKoZIhvhNAQ0BAgICAQIwEAYLKoZIhvhNAQ0BAgMCAQIwEAYLKoZI\nhvhNAQ0BAgQCAQIwEAYLKoZIhvhNAQ0BAgUCAQMwEAYLKoZIhvhNAQ0BAgYCAQEw\nEAYLKoZIhvhNAQ0BAgcCAQAwEAYLKoZIhvhNAQ0BAggCAQMwEAYLKoZIhvhNAQ0B\nAgkCAQAwEAYLKoZIhvhNAQ0BAgoCAQAwEAYLKoZIhvhNAQ0BAgsCAQAwEAYLKoZI\nhvhNAQ0BAgwCAQAwEAYLKoZIhvhNAQ0BAg0CAQAwEAYLKoZIhvhNAQ0BAg4CAQAw\nEAYLKoZIhvhNAQ0BAg8CAQAwEAYLKoZIhvhNAQ0BAhACAQAwEAYLKoZIhvhNAQ0B\nAhECAQswHwYLKoZIhvhNAQ0BAhIEEAICAgIDAQADAAAAAAAAAAAwEAYKKoZIhvhN\nAQ0BAwQCAAAwFAYKKoZIhvhNAQ0BBAQGEjRWeAAAMA8GCiqGSIb4TQENAQUKAQAw\nCgYIKoZIzj0EAwIDSAAwRQIhAMUVEpMmzjI/grqRYOSKsWhfHBzrkqrWNdd8j34A\nK8pIAiARCNhuI689th8hWF45DuwKnyVqh3jurCU6Wipx0jhHLg==\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '020202020301000300000000000000000500',
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEcTCCBBegAwIBAgIVAMqkxB0mxk4Rhk+4FNhlDgUo034PMAoGCCqGSM49BAMC\nMHExIzAhBgNVBAMMGkludGVsIFNHWCBQQ0sgUHJvY2Vzc29yIENBMRowGAYDVQQK\nDBFJbnRlbCBDb3Jwb3JhdGlvbjEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNV\nBAgMAkNBMQswCQYDVQQGEwJVUzAeFw0yNjAxMTMxMjA4MzFaFw0zMzAxMTMxMjA4\nMzFaMHAxIjAgBgNVBAMMGUludGVsIFNHWCBQQ0sgQ2VydGlmaWNhdGUxGjAYBgNV\nBAoMEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkG\nA1UECAwCQ0ExCzAJBgNVBAYTAlVTMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\nJ1aaCA+dA3tk9MK2H/sVjy+nQohWKwTsS3acx6bMQmcxaURiO4UKIJQVY3Ut1kSL\n9GdA5wY8pBmt38wjTcibTaOCAoswggKHMB8GA1UdIwQYMBaAFJ8Gl+9TIUTU+kx+\n6LqNs9Ml5JKQMFAGA1UdHwRJMEcwRaBDoEGGP2h0dHBzOi8vMTI3LjAuMC4xOjg0\nNDQvc2d4L2NlcnRpZmljYXRpb24vdjIvcGNrY3JsP2NhPXByb2Nlc3NvcjAdBgNV\nHQ4EFgQUSw45DxEYeKE/XY4w5hax6W4qe9UwDgYDVR0PAQH/BAQDAgbAMAwGA1Ud\nEwEB/wQCMAAwggHTBgkqhkiG+E0BDQEEggHEMIIBwDAeBgoqhkiG+E0BDQEBBBAc\nfZDkNWx5KO7SMLMO6UPvMIIBYwYKKoZIhvhNAQ0BAjCCAVMwEAYLKoZIhvhNAQ0B\nAgECAQIwEAYLKoZIhvhNAQ0BAgICAQIwEAYLKoZIhvhNAQ0BAgMCAQIwEAYLKoZI\nhvhNAQ0BAgQCAQIwEAYLKoZIhvhNAQ0BAgUCAQMwEAYLKoZIhvhNAQ0BAgYCAQEw\nEAYLKoZIhvhNAQ0BAgcCAQAwEAYLKoZIhvhNAQ0BAggCAQMwEAYLKoZIhvhNAQ0B\nAgkCAQAwEAYLKoZIhvhNAQ0BAgoCAQAwEAYLKoZIhvhNAQ0BAgsCAQAwEAYLKoZI\nhvhNAQ0BAgwCAQAwEAYLKoZIhvhNAQ0BAg0CAQAwEAYLKoZIhvhNAQ0BAg4CAQAw\nEAYLKoZIhvhNAQ0BAg8CAQAwEAYLKoZIhvhNAQ0BAhACAQAwEAYLKoZIhvhNAQ0B\nAhECAQUwHwYLKoZIhvhNAQ0BAhIEEAICAgIDAQADAAAAAAAAAAAwEAYKKoZIhvhN\nAQ0BAwQCAAAwFAYKKoZIhvhNAQ0BBAQGEjRWeAAAMA8GCiqGSIb4TQENAQUKAQAw\nCgYIKoZIzj0EAwIDSAAwRQIgNQ+szwXnsjWe3M8anj5gfZ0hRpCQ8A04HsC7rBku\ny8sCIQC8e1G/Wpf7yBBTjB1R33IOVYBFhSSFTLfE5HlPNgyx2A==\n-----END CERTIFICATE-----\n',
        },
        {
            tcbm:     '0202020203010003000000000000000F0100', //uncomparable with the rest
            pck_cert: '-----BEGIN CERTIFICATE-----\nMIIEfTCCBCSgAwIBAgIVAI1TRrwN0ZjGEM3jgRQDcVj+rXEUMAoGCCqGSM49BAMC\nMHExIzAhBgNVBAMMGkludGVsIFNHWCBQQ0sgUHJvY2Vzc29yIENBMRowGAYDVQQK\nDBFJbnRlbCBDb3Jwb3JhdGlvbjEUMBIGA1UEBwwLU2FudGEgQ2xhcmExCzAJBgNV\nBAgMAkNBMQswCQYDVQQGEwJVUzAeFw0yNjAxMTUxMzA3MzdaFw0zMzAxMTUxMzA3\nMzdaMHAxIjAgBgNVBAMMGUludGVsIFNHWCBQQ0sgQ2VydGlmaWNhdGUxGjAYBgNV\nBAoMEUludGVsIENvcnBvcmF0aW9uMRQwEgYDVQQHDAtTYW50YSBDbGFyYTELMAkG\nA1UECAwCQ0ExCzAJBgNVBAYTAlVTMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\nK2ikxsQM5yphyseHh996DOAdt9D+lS7+oqOKg5DfNefy3YupVL5JFZCM6QMwq0Qm\nOx+7uxouW8jomsFQRGspqaOCApgwggKUMB8GA1UdIwQYMBaAFJ8Gl+9TIUTU+kx+\n6LqNs9Ml5JKQMF0GA1UdHwRWMFQwUqBQoE6GTGh0dHBzOi8vMTI3LjAuMC4xOjg0\nNDQvc2d4L2NlcnRpZmljYXRpb24vdjQvcGNrY3JsP2NhPXByb2Nlc3NvciZlbmNv\nZGluZz1kZXIwHQYDVR0OBBYEFLio9qeCU7ySVPEhTvemQ65J711jMA4GA1UdDwEB\n/wQEAwIGwDAMBgNVHRMBAf8EAjAAMIIB0wYJKoZIhvhNAQ0BBIIBxDCCAcAwHgYK\nKoZIhvhNAQ0BAQQQHH2Q5DVseSju0jCzDulD7zCCAWMGCiqGSIb4TQENAQIwggFT\nMBAGCyqGSIb4TQENAQIBAgECMBAGCyqGSIb4TQENAQICAgECMBAGCyqGSIb4TQEN\nAQIDAgECMBAGCyqGSIb4TQENAQIEAgECMBAGCyqGSIb4TQENAQIFAgEDMBAGCyqG\nSIb4TQENAQIGAgEBMBAGCyqGSIb4TQENAQIHAgEAMBAGCyqGSIb4TQENAQIIAgED\nMBAGCyqGSIb4TQENAQIJAgEAMBAGCyqGSIb4TQENAQIKAgEAMBAGCyqGSIb4TQEN\nAQILAgEAMBAGCyqGSIb4TQENAQIMAgEAMBAGCyqGSIb4TQENAQINAgEAMBAGCyqG\nSIb4TQENAQIOAgEAMBAGCyqGSIb4TQENAQIPAgEAMBAGCyqGSIb4TQENAQIQAgEP\nMBAGCyqGSIb4TQENAQIRAgEBMB8GCyqGSIb4TQENAQISBBACAgICAwEAAwAAAAAA\nAAAPMBAGCiqGSIb4TQENAQMEAgAAMBQGCiqGSIb4TQENAQQEBhI0VngAADAPBgoq\nhkiG+E0BDQEFCgEAMAoGCCqGSM49BAMCA0cAMEQCIEOSGXBqLTKvN6IFXFnQdxKs\n22XbZDxNcwpRtYqCTvD8AiA57tu7HNrYec/HqliESl8DuTFlsrOmHp/GvfFsL8b8\nfw==\n-----END CERTIFICATE-----',
        }
    ]
};
const errorMessages = {
    parsingPckCertsFailed: 'Parsing PCK certificate from DB failed',
    noCertificateFound:    'No certificate found for given platform',
    ppidMismatch:          'PPIDs are not the same in every PCK certificate',
    emptyTcbLevels:        'Empty TCB Levels in in TCB Info',
    invalidTcbLevels:      'Invalid TCB levels',
    pceidMismatch:         (tcbPceId, platformPceId) => `PCEID in TCB Info (${tcbPceId}) is different than platform PCEID (${platformPceId})`,
    fmspcMismatch:         (certFmspc, tcbFmspc) => `FMSPC in cert (${certFmspc}) is different than in TCB info (${tcbFmspc})`,
    pceidCertMismatch:     (certPceId, platformPceId) => `PCEID in cert (${certPceId}) is different than platform PCEID (${platformPceId})`,
    versionMismatch:       (certVersion, expectedVersion) => `PCK certificate version (${certVersion}) is different than expected version (${expectedVersion})`,
    tcbTypeMismatch:       (tcbType) => `TCB_TYPE in TCB Info (${tcbType}) is different than 0`,
};

describe('pckCertSelection', () => {
    describe('selectBestPckCert', () => {
        describe('Positive test cases', () => {
            it('should select highest TCB certificate when raw TCB matches exactly', () => {
                const rawCpusvn = '04040202040100070000000000000000'; // Exact match with the highest cert
                const rawPcesvn = '0B00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('040402020401000700000000000000000B00');
            });

            it('should select middle TCB certificate when raw TCB matches exactly', () => {
                const rawCpusvn = '03030202040100030000000000000000'; // Exact match with middle cert
                const rawPcesvn = '0B00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('030302020401000300000000000000000B00');
            });

            it('should select middle TCB certificate when raw TCB is between certs', () => {
                const rawCpusvn = '03040202040100030000000000000000'; // Higher than middle cert
                const rawPcesvn = '0B00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('030302020401000300000000000000000B00');
            });

            it('should select certificate for minimum TCB level', () => {
                const rawCpusvn = '02020202030100030000000000000000'; // Exact match with the lowest cert
                const rawPcesvn = '0500';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('020202020301000300000000000000000500');
            });

            it('should select certificate for matching TCB level but higher pcesvn', () => {
                const rawCpusvn = '02020202030100030000000000000000'; // Exact match with the lowest cert
                const rawPcesvn = '0F00'; // higher pcesvn

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('020202020301000300000000000000000B00');
            });

            it('should select certificate for high TCB level but low pcesvn - uncomparable TCB', () => {
                const rawCpusvn = '04040202040100070000000000000000'; // Higher than the highest cert
                const rawPcesvn = '0500'; // lower pcesvn then highest cert

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('020202020301000500000000000000000500');
            });

            it('should successfully select certificate when pcesvn is between certs', () => {
                const rawCpusvn = '03030202040100050000000000000000';
                const rawPcesvn = '0C00'; // between pcesvns

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('030302020401000500000000000000000B00');
            });
            it('should successfully select correct certificate when reversed pck order', () => {
                const reversedPckCertData = [...validTestData.pckCertData].reverse();
                const result = selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn, validTestData.pceid,
                    reversedPckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('030302020401000500000000000000000B00');
            });
            it('should select highest TCB certificate when raw TCB is higher then all certs', () => {
                const rawCpusvn = '05050505050500070000000000000000';
                const rawPcesvn = '0F00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('040402020401000700000000000000000B00');
            });
            it('should handle single certificate in list and multiple tcb info - not all TCBs has matching cert', () => {
                const singleCertData = [validTestData.pckCertData[0]];
                const rawCpusvn = '04040202040100070000000000000000';
                const rawPcesvn = '0B00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, singleCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('040402020401000700000000000000000B00');
            });
            it('should handle single tcb level in tcb info - some certs not matching provided tcb level', () => {
                const singleLevelTcbInfo = {
                    ...validTestData.tcbInfo,
                    tcbLevels: [validTestData.tcbInfo.tcbLevels[0]]
                };
                const rawCpusvn = '04040202040100070000000000000000';
                const rawPcesvn = '0B00';

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, singleLevelTcbInfo);
                expect(result.tcbm).to.equal('040402020401000700000000000000000B00');
            });

            it('should handle case insensitive pcesvn matching', () => {
                const rawPcesvn = '0b00'; // lowercase
                expect(() => selectBestPckCert(validTestData.rawCpusvn, rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo
                )).not.to.throw();
            });

            it('should match cert despite incomparable tcb info', () => {
                const rawCpusvn = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'; // Very high TCB
                const rawPcesvn = 'FFFF';
                const tcbInfo = {
                    pceId:     validTestData.tcbInfo.pceId,
                    fmspc:     validTestData.tcbInfo.fmspc,
                    tcbType:   validTestData.tcbInfo.tcbType,
                    tcbLevels: [
                        {
                            tcb: {
                                sgxtcbcomponents: Array(16).fill({ svn: 1 }), // uncomparable with certs and rawCpusvn
                                pcesvn:           1
                            }
                        }
                    ]
                };

                const result = selectBestPckCert(rawCpusvn, rawPcesvn, validTestData.pceid, validTestData.pckCertData, tcbInfo);

                expect(result.tcbm).to.equal('040402020401000700000000000000000B00');
            });

            it('should match to extra uncomparable cert', () => {
                const result = selectBestPckCert(
                    '0202020203010003000000000000000F', // extra uncomparable cert cpusvn
                    '0400', // lower pcesvn than all others, but higher than extra cert
                    validTestData.pceid,
                    validTestData.pckCertData,
                    validTestData.tcbInfo
                );
                expect(result.tcbm).to.equal('0202020203010003000000000000000F0100');
            });

            it('should handle case insensitive cpusvn matching', () => {
                const rawCpusvn = '0303020f040100030000000000000000'; // lowercase

                const result = selectBestPckCert(rawCpusvn, validTestData.rawPcesvn, validTestData.pceid,
                    validTestData.pckCertData, validTestData.tcbInfo);
                expect(result.tcbm).to.equal('030302020401000300000000000000000B00');
            });

            it('should select cert even if tcb levels are not comparable with each other and unsorted', () => {
                const rawCpusvn = '04040202040100030000000000000000';
                const tcbInfo = {
                    ...validTestData.tcbInfo,
                    tcbLevels: [
                        validTestData.tcbInfo.tcbLevels[1], // lower tcb level
                        { // non comparable tcb
                            tcb: {
                                sgxtcbcomponents: Array(16).fill({ svn: 9 }), // higher than both tcb level
                                pcesvn:           0 // lower than both tcb level
                            }
                        },
                        validTestData.tcbInfo.tcbLevels[0] // higher tcb level that is matching input data
                    ]
                };
                const result = selectBestPckCert(rawCpusvn, validTestData.rawPcesvn, validTestData.pceid,
                    validTestData.pckCertData, tcbInfo);
                expect(result.tcbm).to.equal('040402020401000300000000000000000B00');
            });
        });

        describe('Certificate Selection - Negative Cases', () => {
            it('should throw error for cpusvn below minimum level', () => {
                expect(() => selectBestPckCert(
                    '02020202030100020000000000000000',
                    '0500', validTestData.pceid,
                    validTestData.pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.noCertificateFound);
            });

            it('should throw error for pcesvn below minimum level', () => {
                expect(() => selectBestPckCert(
                    '02020202030100030000000000000000',
                    '0400', validTestData.pceid,
                    validTestData.pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.noCertificateFound);
            });

            it('should throw error for matching exact tcb level, but no matching certs', () => {
                expect(() => selectBestPckCert(
                    '01010202010100030000000000000000',
                    '0400', validTestData.pceid,
                    validTestData.pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.noCertificateFound);
            });

            it('should throw error when no pck certs', () => {
                const pckCertData = []; // Empty pck cert list
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.noCertificateFound);
            });
        });

        describe('Input Validation - Error Cases', () => {
            it('should throw error when invalid or empty tcb levels', () => {
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, {
                        ...validTestData.tcbInfo,
                        tcbLevels: [] // Empty tcb levels
                    }))
                    .to.throw(errorMessages.emptyTcbLevels);
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, {
                        ...validTestData.tcbInfo,
                        tcbLevels: [{ tcb: { sgxtcbcomponents: [], pcsvn: 5 } }] // Empty tcb components
                    }))
                    .to.throw(errorMessages.invalidTcbLevels);
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, {
                        ...validTestData.tcbInfo,
                        tcbLevels: [{ tcb: { ...validTestData.tcbInfo.tcbLevels[0].tcb, pcesvn: -5 } }] // incorrect pcesvn
                    }))
                    .to.throw(errorMessages.invalidTcbLevels);
            });

            it('should throw error when pck certs is not parsing', () => {
                const pckCertData = [
                    {
                        tcbm:     '020202020301000300000000000000000500',
                        pck_cert: '-----BEGIN CERTIFICATE-----\nINVALID_CERT\n-----END CERTIFICATE-----\n'
                    }
                ];
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.parsingPckCertsFailed);
            });

            it('should throw error when PCEID mismatch', () => {
                const pceid = 'AAAA'; // Different PCEID
                const tcbInfo = {
                    pceId: 'BBBB', // Different PCEID
                    ...validTestData.tcbInfo,
                };

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn, pceid,
                    validTestData.pckCertData, tcbInfo))
                    .to.throw(errorMessages.pceidMismatch(tcbInfo.pceId, pceid));
            });

            it('should throw error when FMSPC mismatch', () => {
                const tcbInfo = {
                    ...validTestData.tcbInfo,
                    fmspc: '876543210000', // Different FMSPC than in cert
                };

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, tcbInfo))
                    .to.throw(errorMessages.fmspcMismatch('123456780000', tcbInfo.fmspc));
            });

            it('should throw error when PCEID in cert differs from platform', () => {
                const pceid = 'AAAA'; // matches tcb info pceID but different from pceid in cert 0000
                const tcbInfo = {
                    ...validTestData.tcbInfo,
                    pceId: 'AAAA', // different PCEID than in certs
                };

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn, pceid,
                    validTestData.pckCertData, tcbInfo))
                    .to.throw(errorMessages.pceidCertMismatch('0000', 'AAAA'));
            });

            it('should throw tcbTypeMismatch error when tcbType is incorrect', () => {
                const tcbInfo = {
                    ...validTestData.tcbInfo,
                    tcbType: 1, // different from required tcbType "0"
                };

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, tcbInfo))
                    .to.throw(errorMessages.tcbTypeMismatch(1));
            });
        });

        describe('Certificate Validation - Mocked X509 Cases', () => {

            afterEach(() => {
                sinon.restore();
            });

            it('should throw error when certificate version is incorrect', () => {
                const { rawCpusvn, rawPcesvn, pceid, tcbInfo, pckCertData } = validTestData;

                sinon.stub(X509.prototype, 'parseCert').callsFake(function X509() {
                    this.ppid = 'PPID';
                    this.version = 1; // different from required version "3"
                    this.pceId = validTestData.pceid;
                    this.fmspc = validTestData.tcbInfo.fmspc;
                    this.cpusvn = validTestData.rawCpusvn;
                    this.pcesvn = 0;
                    return true;
                });

                expect(() => selectBestPckCert(rawCpusvn, rawPcesvn, pceid, pckCertData, tcbInfo))
                    .to.throw(errorMessages.versionMismatch('1', Constants.PCK_CERT_VERSION));
            });

            it('should throw error when PPIDs differ across certificates', () => {
                let counter = 1;

                sinon.stub(X509.prototype, 'parseCert').callsFake(function X509() {
                    this.ppid = `PPID${counter++}`; // different PPIDs in every cert
                    this.version = Constants.PCK_CERT_VERSION;
                    this.pceId = validTestData.pceid;
                    this.fmspc = validTestData.tcbInfo.fmspc;
                    this.cpusvn = validTestData.rawCpusvn;
                    this.pcesvn = 0;
                    return true;
                });

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData, validTestData.tcbInfo))
                    .to.throw(errorMessages.ppidMismatch);
            });

            it('should handle case insensitive pceid matching', () => {
                sinon.stub(X509.prototype, 'parseCert').callsFake(function X509() {
                    this.ppid = 'PPID';
                    this.version = Constants.PCK_CERT_VERSION;
                    this.pceId = '0A00';
                    this.fmspc = validTestData.tcbInfo.fmspc;
                    this.cpusvn = validTestData.rawCpusvn;
                    this.pcesvn = 14;
                    return true;
                });

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    '0a00', // lowercase
                    validTestData.pckCertData,
                    { ...validTestData.tcbInfo, pceId: '0A00' } // uppercase
                )).not.to.throw();

                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    '0A00', // uppercase
                    validTestData.pckCertData,
                    { ...validTestData.tcbInfo, pceId: '0a00' } // lowercase
                )).not.to.throw();
            });

            it('should handle case insensitive fmspc matching', () => {
                sinon.stub(X509.prototype, 'parseCert').callsFake(function X509() {
                    this.ppid = 'PPID';
                    this.version = Constants.PCK_CERT_VERSION;
                    this.pceId = validTestData.pceid;
                    this.fmspc = 'F000000000000'; // uppercase
                    this.cpusvn = validTestData.rawCpusvn;
                    this.pcesvn = 14;
                    return true;
                });
                expect(() => selectBestPckCert(validTestData.rawCpusvn, validTestData.rawPcesvn,
                    validTestData.pceid, validTestData.pckCertData,
                    { ...validTestData.tcbInfo, fmspc: 'f000000000000' } // lowercase
                )).not.to.throw();
            });
        });
    });
});
