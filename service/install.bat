@ echo off

call mkdir logs

echo Install npm packages ......

set NODE_ENV=production

call npm install

call npm audit
if %errorlevel% equ 0 (
	goto continue_install
)
:ask_again
echo.
echo There are some known vulnerabilities in the dependencies of this package.
echo Select one of the options to proceed:
echo   1. Continue the installation with tested versions of dependencies accepting their known vulnerabilities.
echo   2. Run 'npm audit fix' to automatically update vulnerable dependencies to latest compatible versions.
echo   3. Run 'npm audit fix --force' to automatically update vulnerable dependencies ignoring compatibility checks. This may break installed service.
echo   4. Abort the installation and wait for a future release of dependencies with resolved vulnerabilities.
set /p "option=Choose an option? (1-4): "
REM Put set /p out of if or while because variables in a parenthesized codeblock are not updated until the codeblock is finished.
if "%option%"=="1" (
	goto continue_install
) else if "%option%"=="2" (
	echo Running 'npm audit fix'
	call npm audit fix
	if %errorlevel% equ 0 (
		goto continue_install
	)
	echo.
	echo Some vulnerabilities could not be fixed automatically.
	goto ask_again
) else if "%option%"=="3" (
	echo Running 'npm audit fix --force'
	call npm audit fix --force
	if %errorlevel% equ 0 (
		goto continue_install
	)
	echo.
	echo Some vulnerabilities could not be fixed automatically.
	goto ask_again
) else if "%option%"=="4" (
	echo Aborting installation.
	exit /b 1
) else (
	echo.
	echo Select number between 1 and 4.
	goto ask_again
)
:continue_install

call npm install node-windows@1.0.0-beta.8 -g

call npm link node-windows

call node pccs.winsvc.inst.cjs
