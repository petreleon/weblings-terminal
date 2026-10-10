import { refreshIcons } from './icons';
import { layout, icon } from './layout';
import { CodeEditor } from './editor';
import { RustEngine, type RustResult } from './engine';
import { WorkspaceTerminal, colors } from './terminal';
import { readState, saveState, playgroundSource, topicOf, topicName, topicDescriptions, escapeHtml, type Exercise } from './data';
import './style.css';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = layout;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const state = readState();
let exercises: Exercise[] = [];
let current: Exercise;
let applying = false;
let running = false;
let lastProblems: RustResult['diagnostics'] = [];
const expanded = new Set(['00_intro', '01_variables']);
const engine = new RustEngine();
const terminal = new WorkspaceTerminal($('terminal'));
const editor = new CodeEditor($('code-editor'), () => void terminal.execute('run'));
let toastTimer: ReturnType<typeof setTimeout>;

function toast(text: string) {
  $('toast').textContent = text; $('toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function persist() {
  const saved = saveState(state);
  $('save-status').innerHTML = `${icon(saved ? 'check' : 'alert-circle')} ${saved ? 'All changes saved locally' : 'Storage unavailable · download your code'}`;
  refreshIcons();
}
editor.onChange = source => {
  if (applying) return;
  if (state.mode === 'playground') state.playground = source; else if (current) state.drafts[current.name] = source;
  persist();
};
editor.onCursor = (line, column) => { $('cursor-position').textContent = `Ln ${line}, Col ${column}`; };

function renderTree() {
  const query = $('exercise-search') as HTMLInputElement;
  const needle = query.value.toLowerCase().trim();
  const groups = new Map<string, Exercise[]>();
  for (const ex of exercises) {
    if (needle && !`${ex.name} ${topicName(ex)}`.toLowerCase().includes(needle)) continue;
    groups.set(ex.dir, [...(groups.get(ex.dir) ?? []), ex]);
  }
  $('exercise-tree').innerHTML = [...groups].map(([dir, items]) => {
    const open = expanded.has(dir) || !!needle;
    const solved = items.filter(ex => state.done.includes(ex.name)).length;
    return `<div class="chapter ${open ? 'expanded' : ''}"><button class="chapter-toggle" data-dir="${dir}" aria-expanded="${open}">${icon(open ? 'chevron-down' : 'chevron-right')}<span>${topicName(items[0])}</span><small>${solved}/${items.length}</small></button><div class="chapter-exercises" ${open ? '' : 'hidden'}>${items.map(ex => `<button class="exercise-item ${state.mode === 'rustlings' && current?.name === ex.name ? 'active' : ''} ${state.done.includes(ex.name) ? 'completed' : ''}" data-exercise="${ex.name}" ${current?.name === ex.name ? 'aria-current="true"' : ''}>${icon(state.done.includes(ex.name) ? 'circle-check' : 'circle')}<span>${ex.name}</span>${current?.name === ex.name && state.mode === 'rustlings' ? '<span class="current-marker">←</span>' : ''}</button>`).join('')}</div></div>`;
  }).join('') || '<p class="empty-search">No exercises found.<br/>Try a topic like “variables”.</p>';
  const done = state.done.filter(name => exercises.some(ex => ex.name === name)).length;
  $('progress-number').innerHTML = `${done} <span>/ ${exercises.length} completed</span>`;
  const percent = Math.round(done / exercises.length * 100);
  $('progress-percent').textContent = `${percent}%`; $('progress-bar').style.width = `${percent}%`;
  refreshIcons();
}

function setExercise(ex: Exercise) {
  if (running) { toast('Stop the running program before changing exercises.'); return; }
  current = ex; state.selected = ex.name; expanded.add(ex.dir); state.mode = 'rustlings';
  renderWorkspace(); renderTree(); persist();
  $('sidebar').classList.remove('mobile-open');
}
function renderWorkspace() {
  const pg = state.mode === 'playground';
  const filename = pg ? 'main.rs' : `${current.name}.rs`;
  const topic = pg ? 'Playground' : topicName(current);
  $('mode-rustlings').classList.toggle('active', !pg); $('mode-playground').classList.toggle('active', pg);
  $('breadcrumb-topic').textContent = topic;
  $('breadcrumb-file').textContent = filename; $('editor-file').textContent = filename;
  $('exercise-eyebrow').textContent = pg ? 'ROOM TO EXPERIMENT' : topicOf(current) === 'intro' ? 'LET’S START SMALL' : topic.toUpperCase();
  $('exercise-order').textContent = pg ? 'NO RULES. JUST RUST.' : `EXERCISE ${String(current.order + 1).padStart(2, '0')}`;
  $('exercise-title').textContent = pg ? 'Follow your curiosity.' : current.name === 'intro2' ? 'Make your first fix.' : current.name === 'intro1' ? 'Hello, Rust. Hello, you.' : `${topic}, one step at a time.`;
  $('exercise-description').textContent = pg ? 'Try an idea. Break a thing. See what you discover.' : 'A little code, a curious mind. You’ve got everything you need.';
  $('topic-tag').textContent = pg ? 'Your own little laboratory' : topicOf(current) === 'intro' ? 'Getting started' : current.test ? 'Test your understanding' : 'Learn by doing';
  $('guide-number').textContent = pg ? '∞' : String(current.order + 1).padStart(2, '0');
  $('guide-title').innerHTML = pg ? 'What will you<br/>make today?' : current.name === 'intro2' ? 'Say hello<br/>to the compiler.' : `${escapeHtml(topic)}.<br/>Let’s figure it out.`;
  $('guide-description').textContent = pg ? 'An empty canvas with a real Rust compiler. Standard library included; external crates, networking, and OS threads are not available.' : topicDescriptions[topicOf(current)] ?? `Build your understanding of ${topic.toLowerCase()} with a small, hands-on challenge. Follow the TODOs and use the compiler’s feedback.`;
  $('hint-text').hidden = true; $('show-hint').innerHTML = `Show a hint ${icon('arrow-right')}`;
  $('show-hint').toggleAttribute('disabled', pg); $('next-exercise').toggleAttribute('disabled', pg || current.order === exercises.length - 1);
  $('run-code').querySelector('span')!.textContent = !pg && current.test ? 'Run tests' : 'Run code';
  $('completion-label').innerHTML = pg ? `${icon('sparkles')} Make it your own` : state.done.includes(current.name) ? `${icon('circle-check')} Exercise completed` : `${icon('circle-dashed')} Not completed yet`;
  $('completion-label').classList.toggle('is-complete', !pg && state.done.includes(current.name));
  applying = true; editor.source = pg ? state.playground : (state.drafts[current.name] ?? current.exercise); applying = false;
  lastProblems = []; renderProblems();
  terminal.directory = pg ? '~/playground' : '~/rustlings';
  refreshIcons();
}

function showTerminal() { $('terminal-content').hidden = false; $('problems').hidden = true; $('terminal-tab').classList.add('active'); $('problems-tab').classList.remove('active'); terminal.fit(); }
function renderProblems() {
  $('problem-count').textContent = String(lastProblems?.length ?? 0);
  $('problems').innerHTML = lastProblems?.length ? lastProblems.map((d, i) => `<button class="problem" data-problem="${i}">${icon(d.level === 'error' ? 'circle-x' : 'triangle-alert')}<span><strong>${escapeHtml(d.message)}</strong><small>${d.line ? `Line ${d.line}, column ${d.col ?? 1}` : 'Compiler diagnostic'}</small></span>${icon('arrow-up-right')}</button>`).join('') : `<div class="no-problems">${icon('circle-check')}<strong>No diagnostics to show.</strong><p>Run your code to check it with the compiler.</p></div>`;
  refreshIcons();
}

function showHint() {
  if (state.mode === 'playground') { toast('The playground is yours. Try help for available commands.'); return; }
  $('hint-text').textContent = current.hint || 'Read the TODO comments and the compiler diagnostics carefully.';
  $('hint-text').hidden = false; $('show-hint').innerHTML = `Hint revealed ${icon('check')}`; refreshIcons();
}

async function runCode(checkOnly = false, testsOverride?: boolean) {
  if (running) return;
  running = true; const source = editor.source; const pg = state.mode === 'playground'; const ex = current;
  const testMode = testsOverride ?? (!pg && ex.test);
  showTerminal();
  $('run-code').classList.add('is-running'); $('run-code').querySelector('span')!.textContent = 'Stop';
  $('terminal-status').textContent = 'Working on it…';
  terminal.message(`   ${checkOnly ? 'Checking' : testMode ? 'Testing' : 'Compiling'} ${pg ? 'main.rs' : `${ex.name}.rs`}`, 'green');
  const status = (text: string) => { $('terminal-status').textContent = text.replace('rustc.wasm', 'Rust'); };
  try {
    if (engine.state.phase !== 'ready') terminal.message('   Loading the compiler. Follow the download progress below.');
    let result: RustResult;
    if (!pg && ex.const_check) {
      result = await engine.execute('check', source, status, { isTest: ex.test, constCheck: ex.const_check });
      if (!result.ok) { displayResult(result, checkOnly, pg, ex, source); return; }
    }
    result = await engine.execute(checkOnly ? 'check' : testMode ? 'tests' : 'run', source, status, { isTest: !pg && ex.test });
    displayResult(result, checkOnly || (!pg && ex.test && !testMode), pg, ex, source);
  } finally {
    running = false; $('run-code').classList.remove('is-running');
    $('run-code').querySelector('span')!.textContent = !pg && ex.test ? 'Run tests' : 'Run code';
    $('terminal-status').textContent = 'Ready when you are';
  }
}
function displayResult(result: RustResult, checkOnly: boolean, pg: boolean, ex: Exercise, source: string) {
  const sourceChanged = editor.source !== source;
  lastProblems = sourceChanged ? [] : result.diagnostics ?? []; editor.diagnostics(lastProblems); renderProblems();
  for (const diagnostic of result.diagnostics ?? []) terminal.line(diagnostic.ansi ?? diagnostic.rendered);
  if (result.stdout) { terminal.line(); terminal.line(result.stdout); }
  if (result.stderr) terminal.message(result.stderr, 'red');
  if (result.output) terminal.line(result.output);
  if (result.text && !result.diagnostics?.length) terminal.line(result.text);
  const time = result.compileMs != null ? ` in ${(result.compileMs / 1000).toFixed(2)}s` : '';
  if (result.ok) {
    terminal.message(`   Finished${time}${checkOnly ? ' · type check passed' : result.passed != null ? ` · ${result.passed} tests passed` : ' · exit code 0'}`, 'green');
    if (sourceChanged) { terminal.message('   You edited the source during this run. Run again to check your latest code.', 'coral'); return; }
    if (!pg && topicOf(ex) === 'clippy') { terminal.message('   Compilation passed. This exercise needs native cargo clippy to verify its lints.', 'coral'); return; }
    if (!pg && !checkOnly) {
      if (!state.done.includes(ex.name)) state.done.push(ex.name);
      persist(); renderTree();
      $('completion-label').innerHTML = `${icon('circle-check')} Exercise completed`; $('completion-label').classList.add('is-complete'); refreshIcons();
      terminal.message(`   Nice work. Type next when you’re ready.`, 'coral');
    }
  } else {
    terminal.message(`   ${result.unsupported ? 'This exercise needs OS threads. Try it with native Rust.' : 'Not quite yet. Read the feedback, make a change, try again.'}`, 'coral');
    if (!pg && !sourceChanged) { state.done = state.done.filter(name => name !== ex.name); persist(); renderTree(); $('completion-label').innerHTML = `${icon('circle-dashed')} Not completed yet`; $('completion-label').classList.remove('is-complete'); refreshIcons(); }
  }
}

function nextExercise() {
  if (state.mode === 'playground') { toast('Switch to Rustlings to follow the learning path.'); return; }
  const next = exercises[exercises.indexOf(current) + 1];
  if (next) setExercise(next); else toast('You’ve reached the end of the path. Well done!');
}
function resetCode() {
  if (running) { toast('Stop the program before resetting your code.'); return; }
  editor.source = state.mode === 'playground' ? playgroundSource : current.exercise;
  toast('Starter code restored. Use ⌘ Z in the editor to undo.');
}
terminal.onCancel = () => engine.cancel();
terminal.onCommand = async command => {
  const [name, ...args] = command.split(/\s+/);
  switch (name.toLowerCase()) {
    case 'run': case 'r': await runCode(); break;
    case 'cargo': if (!['run', 'test', 'check'].includes(args[0])) { terminal.message('Use cargo run, cargo test, or cargo check. External crates are not available.', 'coral'); break; } await runCode(args[0] === 'check', args[0] === 'test'); break;
    case 'check': await runCode(true); break;
    case 'hint': case 'h': showHint(); terminal.message(state.mode === 'playground' ? 'Experiment with the standard library. Type help for commands.' : current.hint, 'white'); break;
    case 'next': case 'n': nextExercise(); terminal.message(`Opened ${current.name}.rs`, 'green'); break;
    case 'open': { const ex = exercises.find(ex => ex.name === args[0]?.replace('.rs', '')); if (ex) { setExercise(ex); terminal.message(`Opened ${ex.name}.rs`, 'green'); } else terminal.message('Exercise not found. Try: open variables1', 'coral'); break; }
    case 'list': case 'ls': for (const ex of exercises) terminal.line(` ${state.done.includes(ex.name) ? colors.green + '✓' : colors.dim + '○'} ${ex.name.padEnd(21)}${colors.dim}${topicName(ex)}${colors.reset}`); break;
    case 'clear': terminal.clear(); break;
    case 'reset': resetCode(); terminal.message('Starter code restored.', 'green'); break;
    case 'status': terminal.message(`${state.done.length}/${exercises.length} exercises completed · compiler ${engine.state.phase}`, 'green'); break;
    case 'help':
      terminal.message(' A few good commands', 'coral'); terminal.line();
      for (const [cmd, description] of [['run / r', 'Compile and run the current exercise or its tests'], ['check', 'Check types without running the program'], ['hint / h', 'Get a small nudge for the current exercise'], ['next / n', 'Go to the next exercise'], ['open <name>', 'Open an exercise, e.g. open variables1'], ['list', 'See all 94 exercises and your progress'], ['reset', 'Restore the current starter code'], ['clear', 'Clear this terminal'], ['status', 'Show your progress and compiler status']]) terminal.line(` ${colors.green}${cmd.padEnd(15)}${colors.reset}${description}`);
      terminal.line(); terminal.message(' ↑ / ↓ history  ·  Tab autocomplete  ·  Ctrl C stop  ·  Ctrl L clear'); break;
    default: terminal.message(`Unknown command: ${name}. Type help to see what’s available.`, 'coral');
  }
};

function modal(title: string, content: string) {
  $('modal-title').textContent = title; $('modal-content').innerHTML = content; refreshIcons(); ($('modal') as HTMLDialogElement).showModal();
}
$('exercise-tree').addEventListener('click', event => {
  const element = event.target as HTMLElement;
  const chapter = element.closest<HTMLButtonElement>('[data-dir]');
  if (chapter) { expanded.has(chapter.dataset.dir!) ? expanded.delete(chapter.dataset.dir!) : expanded.add(chapter.dataset.dir!); renderTree(); }
  const button = element.closest<HTMLButtonElement>('[data-exercise]');
  if (button) { const exercise = exercises.find(ex => ex.name === button.dataset.exercise); if (exercise) setExercise(exercise); }
});
$('exercise-search').addEventListener('input', renderTree);
$('run-code').onclick = () => running ? engine.cancel() : void terminal.execute('run');
$('reset-code').onclick = resetCode;
$('download-code').onclick = () => {
  const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([editor.source], { type: 'text/plain' }));
  a.href = url; a.download = state.mode === 'playground' ? 'main.rs' : `${current.name}.rs`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('show-hint').onclick = showHint; $('next-exercise').onclick = nextExercise;
$('terminal-tab').onclick = showTerminal;
$('problems-tab').onclick = () => { $('terminal-content').hidden = true; $('problems').hidden = false; $('terminal-tab').classList.remove('active'); $('problems-tab').classList.add('active'); };
$('problems').onclick = event => { const button = (event.target as HTMLElement).closest<HTMLElement>('[data-problem]'); if (button) editor.jump(lastProblems?.[Number(button.dataset.problem)].line ?? 1); };
$('clear-terminal').onclick = () => terminal.clear();
$('help-command').onclick = () => { showTerminal(); void terminal.execute('help'); terminal.focus(); };
$('expand-terminal').onclick = () => { const expanded = $('terminal-panel').classList.toggle('expanded'); $('expand-terminal').setAttribute('aria-pressed', String(expanded)); $('expand-terminal').setAttribute('aria-label', expanded ? 'Restore terminal size' : 'Expand terminal'); terminal.fit(); };
const narrowGuide = window.matchMedia('(max-width: 960px)');
function guideState() { $('guide-toggle').setAttribute('aria-pressed', String(narrowGuide.matches ? $('workspace').classList.contains('mobile-guide-open') : !$('workspace').classList.contains('hide-guide'))); }
narrowGuide.addEventListener('change', guideState); guideState();
$('guide-toggle').onclick = () => { $('workspace').classList.toggle(narrowGuide.matches ? 'mobile-guide-open' : 'hide-guide'); guideState(); };
$('mode-rustlings').onclick = () => setExercise(current);
$('mode-playground').onclick = () => { if (running) { toast('Stop the program before switching workspaces.'); return; } state.mode = 'playground'; renderWorkspace(); renderTree(); persist(); };
$('menu-toggle').onclick = () => $('sidebar').classList.toggle('mobile-open');
$('shortcuts').onclick = () => modal('A few handy shortcuts', `<p class="modal-intro">Keep your hands on the keyboard. Stay in the flow.</p><div class="shortcut-row"><span>Run code or tests</span><kbd>⌘ / Ctrl + Enter</kbd></div><div class="shortcut-row"><span>Find an exercise</span><kbd>/</kbd></div><div class="shortcut-row"><span>Indent code</span><kbd>Tab</kbd></div><div class="shortcut-row"><span>Terminal history</span><kbd>↑ / ↓</kbd></div><div class="shortcut-row"><span>Stop a running program</span><kbd>Ctrl + C</kbd></div><div class="shortcut-row"><span>Clear terminal</span><kbd>Ctrl + L</kbd></div><p class="modal-footnote">Commands run Rust in a browser sandbox. This terminal has no access to your computer’s shell or files.</p>`);
$('settings').onclick = () => modal('Make yourself comfortable', `<p class="modal-intro">A little room to make this workspace yours.</p><label class="setting-row"><span>Editor font size</span><select id="font-size"><option value="12">Small · 12 px</option><option value="13" selected>Default · 13 px</option><option value="15">Comfortable · 15 px</option><option value="17">Large · 17 px</option></select></label><p class="modal-footnote">Your code and progress are saved in this browser. The compiler is downloaded from Weblings and cached locally after the first visit.</p><a class="license-link" href="/licenses/WEBLINGS.txt" target="_blank">Weblings license ↗</a> <a class="license-link" href="/licenses/RUSTLINGS.txt" target="_blank">Rustlings license ↗</a>`);
$('modal-content').addEventListener('change', event => { const input = event.target as HTMLSelectElement; if (input.id === 'font-size') { document.documentElement.style.setProperty('--editor-font', `${input.value}px`); editor.view.requestMeasure(); } });
$('close-modal').onclick = () => ($('modal') as HTMLDialogElement).close();
$('modal').onclick = event => { if (event.target === $('modal')) ($('modal') as HTMLDialogElement).close(); };
document.addEventListener('keydown', event => {
  if (event.key === '/' && !(event.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) { event.preventDefault(); $('exercise-search').focus(); }
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !(event.target as HTMLElement).closest('.cm-editor')) { event.preventDefault(); void terminal.execute('run'); }
  if (event.key === 'Escape') $('sidebar').classList.remove('mobile-open');
});
engine.onState = data => {
  const percent = Math.min(100, Math.round(data.received / data.total * 100));
  $('engine-message').textContent = data.phase === 'loading' ? 'Loading Rust compiler' : data.message;
  $('engine-progress').textContent = data.phase === 'loading' ? `${percent}%` : '';
  $('engine-status').dataset.phase = data.phase; $('toolchain-bar').style.width = `${data.phase === 'ready' ? 100 : percent}%`;
  document.querySelector('.toolchain-progress')?.classList.toggle('loaded', data.phase === 'ready');
};
$('engine-status').onclick = () => { if (engine.state.phase === 'error') void engine.load().catch(e => toast(e.message)); };
refreshIcons(); terminal.welcome();
async function boot() { try {
  const response = await fetch('/rustlings/exercises.json');
  if (!response.ok) throw new Error('Could not load exercises. Refresh to try again.');
  exercises = (await response.json()).exercises;
  current = exercises.find(ex => ex.name === state.selected) ?? exercises[1];
  expanded.add(current.dir); renderWorkspace(); renderTree();
  void engine.load().catch(error => toast(`${error.message} Click the compiler status to retry.`));
} catch (error) { toast(error instanceof Error ? error.message : String(error)); } }
void boot();
