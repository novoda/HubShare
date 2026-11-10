# HubShare

Windows-first peer-to-peer file sharing prototype using Tauri, Firebase Authentication, and Iroh Sendme. This is a development preview, not production-ready for confidential transfers.

A GitHub Actions workflow builds an unsigned Windows installer and uploads it as a workflow artifact. Firebase Web configuration must be set through GitHub Actions repository variables before login will work.

See `GITHUB_BUILD.md` for setup steps and security limitations.
