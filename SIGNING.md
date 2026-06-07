# Code signing (SignPath Foundation — free for OSS)

Aplomb's Windows installer isn't code-signed yet, so SmartScreen warns on download. SignPath Foundation
provides **free** Authenticode certificates + cloud signing to qualifying open-source projects. This repo is
public + MIT-licensed, so it's eligible.

## Status / prerequisites

- [x] Public repo
- [x] OSI license (MIT — see `LICENSE`)
- [x] Real README
- [x] CI build that produces the installer (`.github/workflows/release-sign.yml`, manual until enrolled)
- [ ] SignPath Foundation project approved
- [ ] `SIGNPATH_API_TOKEN` repo secret + org/project/policy slugs filled in the workflow

## Enroll (one-time, ~10 min + their review)

1. Go to **<https://signpath.org/apply>** (the Foundation / open-source program).
2. Sign in with **GitHub** and authorize SignPath for the `throttledph-coder/aplomb` repo.
3. Submit the application using the **answers below**.
4. Wait for approval (manual review, usually days). They create your **organization** + a **project**.

### Application answers (copy-paste)

| Field | Value |
|---|---|
| Project name | Aplomb |
| Repository | https://github.com/throttledph-coder/aplomb |
| License | MIT |
| Project website | https://aplomb.throttledph.workers.dev |
| Maintainer | Jonel Bibar (throttledph-coder) |
| Short description | Desktop interview-preparation app (Electron + React + TypeScript). Generates practice answers from a resume + job description, coaching reports, an application tracker, and live in-interview assistance. Distributed as a Windows installer via GitHub Releases. |
| What needs signing | The Windows NSIS installer `Aplomb-Windows-<version>-Setup.exe`, built in GitHub Actions by `electron-builder`. |
| Build system | GitHub Actions (`.github/workflows/release-sign.yml`) |

## After approval

1. SignPath dashboard → create a **signing policy** (e.g. slug `release-signing`) and an **artifact
   configuration** for the NSIS exe (e.g. slug `windows-installer`).
2. Copy your **Organization ID** + confirm the **project slug** (`aplomb`).
3. Repo → **Settings → Secrets and variables → Actions** → add `SIGNPATH_API_TOKEN` (from SignPath →
   user settings → API tokens).
4. Edit `.github/workflows/release-sign.yml`: replace `REPLACE_WITH_SIGNPATH_ORG_ID` and confirm the three
   slugs match what you created.
5. Run the workflow: **Actions → Release (signed) → Run workflow** → enter the version tag (e.g. `v0.13.6`).
   It builds, submits to SignPath, downloads the signed exe, and attaches it to that GitHub release.
6. Replace the unsigned asset on the release with the signed one (or cut the next version signed).

## Notes

- Even a fresh OV cert starts with low SmartScreen reputation; the warning fades as signed downloads
  accumulate. Only EV certs (never free) get instant zero-warning.
- Keep the repo public + MIT to retain free eligibility. Going private ends it.
