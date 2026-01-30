@ echo off
@rem
@rem Copyright (C) 2011-2026 Intel Corporation
@rem
@rem Redistribution and use in source and binary forms, with or without modification,
@rem are permitted provided that the following conditions are met:
@rem
@rem 1. Redistributions of source code must retain the above copyright notice,
@rem    this list of conditions and the following disclaimer.
@rem 2. Redistributions in binary form must reproduce the above copyright notice,
@rem    this list of conditions and the following disclaimer in the documentation
@rem    and/or other materials provided with the distribution.
@rem 3. Neither the name of the copyright holder nor the names of its contributors
@rem    may be used to endorse or promote products derived from this software
@rem    without specific prior written permission.
@rem
@rem THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
@rem AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
@rem THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
@rem ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS
@rem BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
@rem OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
@rem OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
@rem OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
@rem WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
@rem OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
@rem EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
@rem
@rem
@rem SPDX-License-Identifier: BSD-3-Clause

echo Uninstall npm packages ......

call node pccs.winsvc.uninst.cjs

@ call rd /s /q node_modules




