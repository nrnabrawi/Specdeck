# STACK

Versions are the latest on npm as of 2026-11-16 (`npm view`); exact-pin in `package.json`, re-verify at scaffold. Node 24 (present: 24.20.0); npm 11.

| Tech | Version | Why |
|---|---|---|
| Electron | 45.3.3 | Desktop shell, tray, Node-native CLI/PTY |
| electron-vite | 6.0.0 | Main/preload/renderer build |
| electron-builder | 26.18.0 | Win/Linux packaging (macOS later) |
| React / react-dom | 19.3.1 | UI |
| TypeScript | 7.0.2 | Types (fall back to 5.x if toolchain breaks; ask) |
| Vite | 8.3.8 | Renderer bundler |
| Tailwind CSS + @tailwindcss/vite | 4.3.5 | Styling, shadcn tokens |
| shadcn (CLI) + Radix | 4.23.0 | Components per REFERENCE §3 |
| React Router | 8.5.1 | Page routing (memory router) |
| TanStack Query | 5.107.1 | Async reads from main (units, specs) |
| Zustand | 5.1.0 | UI state (project, theme) |
| Recharts | 3.10.1 | shadcn Chart base |
| @dnd-kit/core | 6.3.1 | Board drag |
| @xterm/xterm | 6.0.0 | Embedded terminal UI |
| node-pty | 1.1.0 | PTY for agent launch (native; needs Electron rebuild, risk) |
| chokidar | 6.0.0 | File watching |
| better-sqlite3 | 13.2.0 | Local runs/events store (native; Electron rebuild) |
| zod | 4.6.7 | IPC + CLI JSON validation |
| Vitest | 5.1.0 | Unit/adapter tests |
| @testing-library/react | 16.3.3 | Component tests |
| Playwright | 1.65.1 | Electron e2e smoke |
| ESLint | 10.15.0 | Lint (+typescript-eslint) |
| Fonts: Inter, JetBrains Mono | - | Per design tokens |

Markdown rendering library and diff helpers: not chosen; will ask before adding (scope rule 3).
