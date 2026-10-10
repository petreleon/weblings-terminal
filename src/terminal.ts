import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export const colors = { green: '\x1b[38;2;145;199;177m', coral: '\x1b[38;2;242;148;124m', dim: '\x1b[38;2;132;143;157m', white: '\x1b[38;2;218;223;231m', red: '\x1b[38;2;245;128;138m', reset: '\x1b[0m', bold: '\x1b[1m' };
export class WorkspaceTerminal {
  readonly term = new Terminal({
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', fontSize: 12.5,
    lineHeight: 1.6, cursorBlink: true, cursorStyle: 'bar', convertEol: true,
    scrollback: 3000, screenReaderMode: true,
    theme: { background: '#111419', foreground: '#c6cdd7', cursor: '#f2947c', selectionBackground: '#39434d', black: '#111419', red: '#ef8590', green: '#91c7b1', yellow: '#e7c78e', blue: '#92b4d9', magenta: '#c0a7da', cyan: '#91c7cb', white: '#dce1e8' }
  });
  private fitAddon = new FitAddon();
  private command = '';
  private history: string[] = [];
  private historyIndex = 0;
  busy = false;
  directory = '~/rustlings';
  onCommand: (command: string) => Promise<void> = async () => {};
  onCancel = () => {};
  constructor(element: HTMLElement) {
    this.term.loadAddon(this.fitAddon);
    this.term.open(element);
    new ResizeObserver(() => this.fit()).observe(element);
    this.term.onData(data => this.input(data));
    this.term.attachCustomKeyEventHandler(event => !(event.ctrlKey && event.shiftKey && event.code === 'KeyC'));
    this.fit();
  }
  fit() { try { if (this.term.element?.clientWidth) this.fitAddon.fit(); } catch { /* Hidden panels have no measurable dimensions. */ } }
  write(text: string) { this.term.write(text); }
  line(text = '') { this.term.writeln(text.replaceAll('\n', '\r\n')); }
  message(text: string, color: keyof typeof colors = 'dim') { this.line(colors[color] + text + colors.reset); }
  welcome() {
    this.line(`${colors.coral}${colors.bold}  >_ weblings${colors.reset} ${colors.dim} / a little Rust, every day.${colors.reset}`);
    this.line();
    this.line('  Your code runs right here, in your browser.');
    this.line(`  Type ${colors.green}run${colors.reset} to begin, ${colors.green}hint${colors.reset} for a nudge, or ${colors.green}help${colors.reset} to explore.`);
    this.line();
    this.prompt();
  }
  prompt() {
    this.busy = false; this.command = '';
    this.write(`${colors.green}you${colors.reset} ${colors.dim}${this.directory}${colors.reset} ${colors.coral}❯${colors.reset} `);
  }
  async execute(command: string) {
    if (this.busy) return;
    this.replaceCommand(command);
    await this.submit();
  }
  private async submit() {
    const command = this.command.trim();
    this.line(); this.command = '';
    if (!command) { this.prompt(); return; }
    this.history.push(command); this.historyIndex = this.history.length; this.busy = true;
    try { await this.onCommand(command); } catch (error) { this.message(error instanceof Error ? error.message : String(error), 'red'); }
    this.line(); this.prompt();
  }
  clear() { this.term.clear(); }
  focus() { this.term.focus(); }
  private replaceCommand(command: string) {
    this.write('\b \b'.repeat(this.command.length)); this.command = command; this.write(command);
  }
  private input(data: string) {
    if (data === '\x03') {
      this.line('^C');
      if (this.busy) this.onCancel(); else this.prompt();
      return;
    }
    if (data === '\x0c') { this.clear(); return; }
    if (this.busy) return;
    if (data === '\r') { void this.submit(); return; }
    if (data === '\x7f') { if (this.command.length) { this.command = this.command.slice(0, -1); this.write('\b \b'); } return; }
    if (data === '\x1b[A' || data === '\x1b[B') {
      this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + (data.endsWith('A') ? -1 : 1)));
      this.replaceCommand(this.history[this.historyIndex] ?? ''); return;
    }
    if (data === '\t') {
      const matches = ['run', 'check', 'hint', 'next', 'list', 'open', 'reset', 'clear', 'help', 'status'].filter(x => x.startsWith(this.command));
      if (matches.length === 1) this.replaceCommand(matches[0] + ' ');
      return;
    }
    if (data.startsWith('\x1b')) return;
    // Pasted input is text, never a batch of implicitly executed commands.
    const text = data.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 1000 - this.command.length);
    this.command += text; this.write(text);
  }
}
