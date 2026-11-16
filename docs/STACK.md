# STACK

Versions are the latest on npm as of 2026-11-16 (`npm view`); exact-pin in `package.json`, re-verify at scaffold. Node 24 (present: 24.20.0); npm 11.

| Tech | Version | Why |
|---|---|---|
| Electron | 45.3.3 | Desktop shell, tray, Node-native CLI/PTY |
| electron-vite | 6.0.0 | Main/preload/renderer build |
| electron-builder | 26.18.0 | Win/Linux packaging (macOS later) |
| React / react-dom | 19.3.1 | UI |
| TypeScript | 6.0.3 | Types; 7.0.2 rejected: typescript-eslint supports <6.1 (decided at M0) |
| Vite | 8.3.8 | Renderer bundler |
| Tailwind CSS + @tailwindcss/vite | 4.3.5 | Styling, shadcn tokens |
| shadcn (CLI) + Radix | 4.23.0 | Components per REFERENCE §3 |
| React Router | 8.5.1 | Page routing (memory router) |
| TanStack Query | 5.107.1 | Async reads from main (units, specs) |
| Zustand | 5.1.0 | UI state (project, theme) |
| Recharts | 3.10.1 | shadcn Chart base |
| @dnd-kit/core | 6.3.1 | Board drag |
| @xterm/addon-fit | see package.json | Terminal resize (added M2) |
| @xterm/xterm | 6.0.0 | Embedded terminal UI |
| node-pty | 1.1.0 | PTY for agent launch (native; needs Electron rebuild, risk) |
| chokidar | 6.0.0 | File watching |
| better-sqlite3 | 13.2.0 | Local runs/events store (native; Electron rebuild) |
| zod | 4.6.7 | IPC + CLI JSON validation |
| Vitest | 5.1.0 | Unit/adapter tests |
| @testing-library/react | 16.3.3 | Component tests |
| Playwright | 1.65.1 | Electron e2e smoke |
| @axe-core/playwright | 4.14.0 | AC-004 WCAG scan (axe-core run in-page; Electron cannot open the extra page AxeBuilder needs) |
| ESLint | 10.15.0 | Lint |
| typescript-eslint | 8.72.2 | TS lint rules |
| @vitejs/plugin-react | 6.3.0 | React in Vite |
| @types/node, @types/react, @types/react-dom | 26.6.6, 19.3.0, 19.3.0 | Typings |
| clsx, tailwind-merge, class-variance-authority, radix-ui | 2.1.1, 3.7.0, 0.7.1, 1.8.1 | shadcn runtime deps |
| react-markdown + remark-gfm | 10.1.0, 4.0.1 | Read-only Markdown (no raw HTML), chosen at M1 |
| @fontsource/inter, @fontsource/jetbrains-mono | 5.3.0, 5.3.0 | Fonts bundled locally (no network) |
| lucide-react, cmdk, sonner | see package.json | shadcn component deps (icons, command palette, toasts) |

Markdown rendering library and diff helpers: not chosen; will ask before adding (scope rule 3).
