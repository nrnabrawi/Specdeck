# BACKLOG (parking lot)

Out-of-scope ideas, one line each. Not built until promoted into SPEC.md.

- Spec Kit `specify extension add <name>` (AC-082 add half): needs a name input; only list actions built in M3.
- Spec Kit `specify init` multi-agent: init command installs one integration (first agent); run it again per agent.
- Pause for the tray quick panel (AC-090): suspending a terminal agent is unverified on Windows; Stop covers v1. Left out in M6 (decided).
- Linux .deb installer: needs a project homepage URL in package.json (AppImage only for now).
- Installer icon and desktopName: app uses the default Electron icon.
- Dev-only packages (tailwind/lightningcss natives) ship inside the app because they sit in dependencies; move to devDependencies to shrink installers.
- Name check: npm package `specdeck` (OpenSpec dashboard, MIT, AidanFeess/specdeck) already exists.
- Installers paused (webapp first): CI no longer runs electron-builder; add back with --publish never. Windows: app execFile can't spawn npm .cmd shims (openspec.cmd) — fix before any Windows release.
