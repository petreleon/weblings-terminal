# Weblings Terminal

A Rust learning workspace with an interactive terminal, a syntax-aware editor, and the 94-exercise Rustlings collection from [Weblings](https://github.com/AngelOnFira/weblings).

Rust compiles and executes in a dedicated Web Worker using Weblings’ real WASM compiler and WASI runtime. There is no simulated compiler, server-side execution, or access to the computer’s shell.

## Run locally

```sh
npm install
npm run dev
```

Open the printed localhost URL. `npm run build` type-checks TypeScript and creates the static `dist/` site. `npm run preview` serves that build.

## Workspace

- Rustlings and a free-form playground.
- CodeMirror Rust editor with line numbers, undo, compiler diagnostics, and adjustable font size.
- xterm.js terminal with command history, completion, selection, and cancellation.
- `run`, `check`, `hint`, `next`, `open <name>`, `list`, `status`, `reset`, `clear`, and `help` commands.
- Real test harness execution for test exercises; compile-only checks do not mark them complete.
- Drafts, selected exercise, and completed exercises saved in browser localStorage.
- Responsive exercise navigation and guide; expandable terminal.
- Source downloads and original starter-code restoration with editor undo.

## Compiler and runtime limits

The first visit downloads `rustc.wasm` and `sysroot-wasip1.bundle` from `https://weblings.forest-anderson.ca/rustc/`. Their decoded sizes total approximately 159 MB; transfer size depends on upstream compression. Progress is visible in the bottom status bar. The Cache API stores both assets when available, so subsequent visits reuse them. Code never leaves the browser.

The application requires browser WebAssembly support and access to the upstream toolchain on an uncached visit. Browser storage limits or private browsing may prevent caching. Keep downloaded source backups when browser storage is unavailable.

The sandbox supports Rust’s bundled standard library, but no additional crates, OS networking, or OS threads. Clippy exercises are included as learning material but cannot be marked complete by rustc compilation alone. They require native `cargo clippy`. Thread exercises may also require native Rust. Stop a run with the Stop button or Ctrl+C. Jobs are terminated after 60 seconds.

## Attribution

The execution worker, vendored WASI shim, and exercise data were adapted from Weblings commit `d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633` by Forest Anderson. The compiler assets are hosted by the upstream project and are not included in this source repository.

- Weblings: `public/licenses/WEBLINGS.txt` (MIT).
- Rustlings: `public/licenses/RUSTLINGS.txt` (MIT).
- browser_wasi_shim: `public/licenses/BROWSER-WASI-SHIM.txt` (MIT).
- CodeMirror, xterm.js, and Lucide retain their package licenses in installed dependencies.

The worker continues to use its original Weblings message protocol. The terminal, interface, persistence, toolchain loader, cancellation, and editor integration are implemented in `src/`.
