export const icon = (name: string, cls = '') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
export const layout = `
<a class="skip-link" href="#workspace">Skip to editor</a>
<header class="app-header">
  <button class="icon-button mobile-menu" id="menu-toggle" aria-label="Toggle exercise list">${icon('panel-left')}</button>
  <a class="brand" href="#" aria-label="Weblings home"><span class="brand-mark"><svg viewBox="0 0 32 32"><path d="m6 10 4 13 6-9 6 9 4-13"/></svg></span><span>weblings<span class="brand-dot">.</span></span></a>
  <div class="header-divider"></div><span class="workspace-label">YOUR RUST WORKSPACE</span>
  <nav class="mode-nav" aria-label="Workspace mode"><button id="mode-rustlings" class="active">${icon('sprout')} Rustlings</button><button id="mode-playground">${icon('square-terminal')} Playground</button></nav>
  <div class="header-actions"><a class="source-link" href="https://github.com/AngelOnFira/weblings" target="_blank" rel="noopener">${icon('github')}<span>Source</span>${icon('arrow-up-right', 'tiny')}</a><span class="small-divider"></span><button class="icon-button" id="shortcuts" aria-label="Keyboard shortcuts">${icon('keyboard')}</button><button class="icon-button" id="settings" aria-label="Editor settings">${icon('settings-2')}</button></div>
</header>
<div class="app-body">
  <aside class="sidebar" id="sidebar" aria-label="Rustlings exercises">
    <div class="path-heading"><span>THE RUST PATH</span>${icon('route')}</div>
    <div class="progress-label"><strong id="progress-number">0 <span>/ 94 completed</span></strong><span id="progress-percent">0%</span></div>
    <div class="progress-track"><div id="progress-bar"></div></div>
    <label class="search-box">${icon('search')}<input id="exercise-search" type="search" placeholder="Find an exercise…" aria-label="Find an exercise"/><kbd>/</kbd></label>
    <div class="exercise-tree" id="exercise-tree"></div>
    <div class="sidebar-bottom"><div class="little-sprout">${icon('sprout')}</div><p>Small steps.<br/><strong>Real understanding.</strong></p><span class="sidebar-bottom-arrow">↗</span></div>
  </aside>
  <main id="workspace" class="workspace">
    <div class="workspace-top"><div class="breadcrumbs">${icon('folder-open')}<span id="breadcrumb-topic">Introduction</span><span class="slash">/</span><strong id="breadcrumb-file">intro2.rs</strong></div><button class="text-button" id="guide-toggle" aria-pressed="true">${icon('book-open')}<span>Exercise guide</span></button></div>
    <section class="exercise-heading"><div><div class="eyebrow"><span id="exercise-eyebrow">LET’S START SMALL</span><span class="heading-dash"></span><span id="exercise-order">EXERCISE 02</span></div><h1 id="exercise-title">Make your first fix.</h1><p id="exercise-description">A little code, a curious mind. You’ve got everything you need.</p></div><div class="heading-art" aria-hidden="true"><svg viewBox="0 0 100 80"><path class="art-orbit" d="M12 54C-8 16 74-6 91 27S36 91 12 54Z"/><path d="m33 29-14 13 14 13m34-26 14 13-14 13M56 23 44 61"/><circle cx="85" cy="14" r="3"/><path class="art-star" d="M14 9v10m-5-5h10"/></svg></div></section>
    <div class="workbench">
      <div class="code-and-terminal">
        <section class="editor-panel" aria-label="Code editor">
          <div class="editor-toolbar"><div class="file-tab">${icon('file-code-2')}<strong id="editor-file">intro2.rs</strong><span id="saved-dot" class="saved-dot" title="Saved in this browser"></span></div><div class="editor-actions"><button class="icon-button" id="reset-code" aria-label="Reset current code">${icon('rotate-ccw')}</button><button class="icon-button" id="download-code" aria-label="Download Rust source">${icon('download')}</button><span class="small-divider"></span><button class="run-button" id="run-code">${icon('play')}<span>Run code</span><kbd>⌘ ↵</kbd></button></div></div>
          <div id="code-editor"></div>
          <div class="editor-status"><span id="save-status">${icon('check')} All changes saved locally</span><span><span id="cursor-position">Ln 1, Col 1</span><span class="status-separator">|</span>Rust <span class="rust-dot"></span></span></div>
        </section>
        <section class="terminal-panel" id="terminal-panel" aria-label="Interactive Rust terminal">
          <div class="terminal-toolbar"><div class="terminal-tabs"><button id="terminal-tab" class="active">${icon('terminal')} TERMINAL</button><button id="problems-tab">PROBLEMS <span id="problem-count">0</span></button></div><div class="terminal-tools"><span class="shell-label">browser / wasm</span><button class="icon-button" id="clear-terminal" aria-label="Clear terminal">${icon('eraser')}</button><button class="icon-button" id="expand-terminal" aria-label="Expand terminal" aria-pressed="false">${icon('maximize-2')}</button></div></div>
          <div class="terminal-content" id="terminal-content"><div id="terminal"></div></div><div id="problems" class="problems-content" hidden></div>
          <div class="terminal-footer"><span><span class="live-dot"></span><span id="terminal-status">Ready when you are</span></span><span>Type <button id="help-command">help</button> for commands <span class="footer-shortcut">· Ctrl C to stop</span></span></div>
        </section>
      </div>
      <aside class="guide" id="guide" aria-label="Exercise guide">
        <div class="guide-heading">${icon('notebook-pen')}<span>FIELD NOTES</span><span class="guide-number" id="guide-number">02</span></div>
        <span class="topic-tag" id="topic-tag">Getting started</span><h2 id="guide-title">Say hello<br/>to the compiler.</h2>
        <p id="guide-description">Every Rust journey starts with a little hello. Meet the compiler, make a small change, and see what happens.</p>
        <div class="guide-rule"></div>
        <h3>YOUR MISSION</h3><div class="mission-step"><span>1</span><p>Read the code and look for the <code>TODO</code>.</p></div><div class="mission-step"><span>2</span><p>Make a change. Run your code.</p></div><div class="mission-step"><span>3</span><p>Let the compiler point you in the right direction.</p></div>
        <div class="hint-card"><div>${icon('lightbulb')}<strong>A nudge, if you need it.</strong></div><p>No rush. Getting stuck is part of getting it.</p><button id="show-hint">Show a hint ${icon('arrow-right')}</button><p id="hint-text" hidden></p></div>
        <div class="guide-bottom"><span id="completion-label">${icon('circle-dashed')} Not completed yet</span><button id="next-exercise">Next exercise ${icon('arrow-right')}</button></div>
      </aside>
    </div>
  </main>
</div>
<footer class="global-status"><button id="engine-status" title="Click to retry if the compiler is unavailable"><span class="live-dot"></span><span id="engine-message">Preparing Rust compiler</span><span id="engine-progress">0%</span></button><div class="toolchain-progress"><div id="toolchain-bar"></div></div><span class="global-status-right"><span>${icon('shield-check')} Runs in your browser</span><span class="global-divider"></span><a href="https://github.com/AngelOnFira/weblings" target="_blank" rel="noopener">Powered by Weblings ${icon('arrow-up-right')}</a></span></footer>
<dialog id="modal"><div class="modal-inner"><div class="modal-heading"><h2 id="modal-title"></h2><button class="icon-button" id="close-modal" aria-label="Close dialog">${icon('x')}</button></div><div id="modal-content"></div></div></dialog>
<div class="toast" id="toast" role="status"></div>
`;
