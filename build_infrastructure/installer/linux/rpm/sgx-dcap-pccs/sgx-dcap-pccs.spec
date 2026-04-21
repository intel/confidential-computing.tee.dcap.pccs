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

%define _install_path @install_path@
%define _license_file COPYING

Name:           sgx-dcap-pccs
Version:        @version@
Release:        1%{?dist}
Summary:        Intel(R) Software Guard Extensions PCK Caching Service
Group:          Applications/Internet

# Note: NodeJS version constraint is deliberately lax, to allow for forward-compat
#       As of time of this writing, the Intel_SGX_SW_Installation_Guide_for_Linux.pdf declares support for: (18.17.0 to 18.19.1, 20.0.0 to 20.11.1, or 21.0.0 to 21.5.0)
#
# Note2: RedHat-based systems have the virtual nodejs package with epoch 1, so a naive 'nodejs >= 18.17.0' does not work due to '1:16.20.2' > '0:18.17.0'
#        Also, while 'nodejsXX' packages are more commonly in use, the NodeSource project provides backports at epoch 0 or 2, so the below may not be 100% robust if
#        there's a package like 2:1.1.0, but should be versatile enough to catch most issues and not create a false-negative scenario w/ a proper version not allowed.
#        For example, every nsolid package will saturate the nodejs >= 1:18.17.0 predicate which is why we exclude it there (but it still provides nodejs(engine) so would be allowed)
#
Requires:       ((nodejs(engine) >= 18.17.0) or (nodejs >= 1:18.17.0 unless nsolid) or ((nodejs >= 0:18.17.0 and nodejs < 1:) unless nsolid) or nodejs18 >= 18.17.0 or nodejs20 or nodejs22 or nodejs24)

Requires:       npm, cracklib

%if 0%{?sle_version} == 0
# On OpenSUSE cracklib comes with `cracklib-dict` as a required dep (and `cracklib-dict` is n/a). On other systems, it needs to be installed separate.
Requires:       cracklib-dicts
# 'startup.sh' is using 'adduser', which is provided by the shadow-utils package
Requires:       shadow-utils
%else
# OpenSUSE has 'shadow' package instead of 'shadow-utils' (also no adduser by default, so the script falls back to useradd)
Requires:       shadow
%endif

# If openssl is present, it allows to auto-generate self-signed TLS certificates for HTTPS support at install-time
Recommends:     openssl

# intel-tee-pccs-admin-tool is a recommended dependency (especially for managing pccs in REQ and OFFLINE modes).
#   While, in some deployments, it is installed on a different host from the PCCS system itself, it is considered
#   a weak dependency due to the practicality of having it also available on the localhost.
#   Note the reverse is not true: PCCS package is merely a *hint* for intel-tee-pccs-admin-tool.
Recommends:     intel-tee-pccs-admin-tool >= %{version}-%{release}

License:        BSD License
URL:            https://github.com/intel/confidential-computing.tee.dcap.pccs
Source0:        %{name}-%{version}.tar.gz
BuildArch:      noarch

%description
Intel(R) Software Guard Extensions PCK Caching Service

%prep
%setup -qc

%install
make DESTDIR=%{?buildroot} install
install -d %{?buildroot}%{_docdir}/%{name}
find linux/installer/common/sdk/output/package/licenses/ -type f -print0 | \
xargs -0 -n1 cat >> %{?buildroot}%{_docdir}/%{name}/%{_license_file}
find %{?buildroot} -type d -links 2 | \
sed -e "s#^%{?buildroot}##" | \
grep -v "^%{_libdir}" | \
grep -v "^%{_bindir}" | \
grep -v "^%{_sysconfdir}" | \
grep -v "^%{_install_path}" | \
sed -e "s#^#%dir #" > %{_specdir}/listfiles
for f in $(find %{?buildroot}); do
    if [ -d ${f} ]; then
        echo ${f} | \
        sed -e "s#^%{?buildroot}##" | \
        grep "^%{_install_path}" | \
        sed -e "s#^#%dir #" >> %{_specdir}/listfiles
    else
        echo ${f} | \
        sed -e "s#^%{?buildroot}##" >> %{_specdir}/listfiles
    fi
done
sed -i 's#^%{_install_path}/config/default.json#%config &#' %{_specdir}/listfiles

%files -f %{_specdir}/listfiles

%post
if [ -x %{_install_path}/startup.sh ]; then %{_install_path}/startup.sh; fi

%preun
if [ "$1" -eq 0 ] && [ -x %{_install_path}/uninstall.sh ]; then %{_install_path}/uninstall.sh; fi

%changelog
* Mon Mar 10 2020 SGX Team
- Initial Release
