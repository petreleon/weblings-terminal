import type { RustDiagnostic, RustEngine } from './engine';

export interface CheckSnapshot { key: string; source: string; isTest: boolean; constCheck?: string }
export interface CheckState {
  phase: 'waiting' | 'queued' | 'checking' | 'ready' | 'paused' | 'error';
  diagnostics: RustDiagnostic[];
  message: string;
}
type Engine = Pick<RustEngine, 'execute' | 'cancel' | 'state'>;

// Background checks share the compiler with explicit runs. Runs always take priority.
export class LiveChecks {
  state: CheckState = { phase: 'waiting', diagnostics: [], message: 'Waiting for the Rust compiler…' };
  onState = (_state: CheckState) => {};
  private engine: Engine;
  private snapshot: () => CheckSnapshot;
  private delay: number;
  private timer?: ReturnType<typeof setTimeout>;
  private revision = 0;
  private active?: number;
  private paused = false;

  constructor(engine: Engine, snapshot: () => CheckSnapshot, delay = 450) {
    this.engine = engine; this.snapshot = snapshot; this.delay = delay;
  }
  private notify(state: CheckState) { this.state = state; this.onState(state); }
  private invalidate() {
    ++this.revision; clearTimeout(this.timer);
    if (this.active !== undefined) {
      this.active = undefined;
      this.engine.cancel('Background check superseded.');
    }
  }
  schedule() {
    this.invalidate();
    if (this.paused) { this.notify({ phase: 'paused', diagnostics: [], message: 'Live checks resume after execution.' }); return; }
    this.notify({ phase: this.engine.state.phase === 'ready' ? 'queued' : 'waiting', diagnostics: [], message: this.engine.state.phase === 'ready' ? 'Checking your latest changes…' : 'Waiting for the Rust compiler…' });
    const revision = this.revision;
    this.timer = setTimeout(() => void this.check(revision), this.delay);
  }
  pause() {
    this.paused = true; this.invalidate();
    this.notify({ phase: 'paused', diagnostics: this.state.diagnostics, message: 'Live checks resume after execution.' });
  }
  resume() { this.paused = false; this.schedule(); }
  private async check(revision: number) {
    if (this.paused || revision !== this.revision) return;
    const snapshot = this.snapshot();
    this.active = revision;
    try {
      const result = await this.engine.execute('check', snapshot.source, () => {
        if (revision === this.revision) this.notify({ phase: 'checking', diagnostics: [], message: 'Checking your latest changes…' });
      }, { isTest: snapshot.isTest, constCheck: snapshot.constCheck });
      const latest = this.snapshot();
      if (revision !== this.revision || latest.key !== snapshot.key || latest.source !== snapshot.source) return;
      const diagnostics = result.diagnostics ?? [];
      if (!result.ok && diagnostics.length === 0) {
        this.notify({ phase: 'error', diagnostics: [], message: result.text || result.output || 'The compiler could not complete this check. Edit your code or retry the compiler.' });
      } else {
        this.notify({ phase: 'ready', diagnostics, message: diagnostics.length ? 'Compiler feedback updates as you type.' : 'No compiler problems. Checks update as you type.' });
      }
    } catch (error) {
      if (revision === this.revision) this.notify({ phase: 'error', diagnostics: [], message: error instanceof Error ? error.message : String(error) });
    } finally { if (this.active === revision) this.active = undefined; }
  }
}
