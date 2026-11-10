# Windows build
GitHub Actions on main compiles Sendme and HubShare on a Windows hosted runner, then uploads the unsigned NSIS installer artifact. Go to the Actions tab, select the latest successful run and download **HubShare-Windows-Installer**. The build uses GitHub's disk space, not yours.

For login, create a Firebase Web app, enable Email/Password authentication, and add GitHub Actions repository **Variables** named VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID. Re-run the build. These are client web configuration values, never service-account credentials.

Security: Firebase sign-in only gates the UI. Anyone with a live Sendme ticket can download the shared file. Do not use for sensitive data until peer-specific authentication is added. Installer is unsigned and the transfer has not yet been verified on two computers.
