// The WASI execution worker is adapted from AngelOnFira/weblings (MIT).
export interface RustDiagnostic {
  level: 'error' | 'warning'; message: string; rendered: string; ansi?: string;
  line?: number; col?: number; endLine?: number; endCol?: number;
}
export interface RustResult {
  ok: boolean; stdout?: string; stderr?: string; output?: string; text?: string;
  diagnostics?: RustDiagnostic[]; compileMs?: number; execMs?: number;
  exit?: number; passed?: number; failed?: number; unsupported?: string;
}
export type EngineState = { phase: 'loading' | 'ready' | 'error'; received: number; total: number; message: string };
const ORIGIN = 'https://weblings.forest-anderson.ca/rustc/';
const CACHE = 'weblings-terminal-toolchain-v1';
const TOTAL = 87871387 + 71313335;
export class RustEngine {
  private module?: WebAssembly.Module;
  private worker?: Worker;
  private bundle?: ArrayBuffer;
  private loading?: Promise<void>;
  private ready?: Promise<void>;
  private pending?: { resolve: (r: RustResult) => void; reject: (e: Error) => void; status: (s: string) => void; timer: ReturnType<typeof setTimeout>; id: number };
  private seq = 0;
  private preparationCancel?: (error: Error) => void;
  state: EngineState = { phase: 'loading', received: 0, total: TOTAL, message: 'Preparing your Rust compiler' };
  onState = (_state: EngineState) => {};
  private notify(patch: Partial<EngineState>) { Object.assign(this.state, patch); this.onState(this.state); }
  async load() {
    if (this.module) return;
    if (this.loading) return this.loading;
    this.notify({ phase: 'loading', received: 0, message: 'Downloading the browser toolchain' });
    this.loading = (async () => {
      let cache: Cache | undefined;
      try { cache = await caches.open(CACHE); } catch { /* Private browsing can disable Cache API. */ }
      const fetchAsset = async (name: string) => {
        const url = ORIGIN + name;
        const cached = await cache?.match(url);
        const response = cached ?? await fetch(url);
        if (!response.ok || !response.body) throw new Error(`Toolchain download failed (${response.status}).`);
        // Cache the upstream CORS response. Cache failures never prevent compilation.
        const saving = !cached && cache ? cache.put(url, response.clone()).catch(() => {}) : Promise.resolve();
        const reader = response.body.getReader();
        const stream = new ReadableStream<Uint8Array>({
          pull: async (controller) => {
            const { done, value } = await reader.read();
            if (done) { controller.close(); return; }
            this.notify({ received: this.state.received + value.byteLength });
            controller.enqueue(value);
          }, cancel: reason => reader.cancel(reason)
        });
        return { response: new Response(stream, { headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } }), saving, cached: !!cached };
      };
      const [compiler, sysroot] = await Promise.all([fetchAsset('rustc.wasm'), fetchAsset('sysroot-wasip1.bundle')]);
      const [module, bytes] = await Promise.all([WebAssembly.compileStreaming(compiler.response), sysroot.response.arrayBuffer()]);
      await Promise.all([compiler.saving, sysroot.saving]);
      this.module = module;
      // Keep a fallback only if persistent cache could not store the sysroot.
      this.bundle = await cache?.match(ORIGIN + 'sysroot-wasip1.bundle') ? undefined : bytes;
      await this.spawn();
      this.notify({ phase: 'ready', message: 'Rust compiler ready' });
    })().catch(error => {
      this.module = undefined;
      this.notify({ phase: 'error', message: 'Compiler unavailable · click to retry' });
      throw error;
    }).finally(() => { this.loading = undefined; });
    return this.loading;
  }
  private spawn() {
    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker('/engine/worker.js', { type: 'module' });
      this.worker = worker;
      const timer = setTimeout(() => { worker.terminate(); this.worker = undefined; reject(new Error('The compiler took too long to initialize. Try again.')); }, 30000);
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') { clearTimeout(timer); resolve(); }
        if (data.type === 'init-error') { clearTimeout(timer); worker.terminate(); this.worker = undefined; reject(new Error(data.error)); }
        if (data.id !== this.pending?.id) return;
        if (data.type === 'status') this.pending?.status(data.text);
        if (data.type === 'result' && this.pending) {
          clearTimeout(this.pending.timer);
          this.pending.resolve(data.result);
          this.pending = undefined;
        }
      };
      worker.onerror = event => {
        clearTimeout(timer);
        worker.terminate(); this.worker = undefined;
        const error = new Error(event.message || 'The compiler worker stopped.');
        reject(error);
        if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(error); this.pending = undefined; }
      };
      worker.postMessage({ type: 'init', module: this.module, bundleUrl: ORIGIN + 'sysroot-wasip1.bundle', bundle: this.bundle });
    });
    return this.ready;
  }
  async execute(kind: 'run' | 'check' | 'tests', source: string, status: (s: string) => void, extra = {}) {
    const cancellation = new Promise<never>((_resolve, reject) => { this.preparationCancel = reject; });
    try {
      await Promise.race([this.load(), cancellation]);
      if (!this.worker) this.spawn();
      await Promise.race([this.ready, cancellation]);
    } finally { this.preparationCancel = undefined; }
    if (this.pending) throw new Error('A program is already running. Stop it first.');
    return new Promise<RustResult>((resolve, reject) => {
      const id = ++this.seq;
      const timer = setTimeout(() => this.cancel('Execution stopped after 60 seconds. Check for an infinite loop, then run again.'), 60000);
      this.pending = { resolve, reject, status, id, timer };
      this.worker!.postMessage({ type: 'job', id, kind, source, ...extra });
    });
  }
  cancel(message = 'Execution stopped.') {
    this.preparationCancel?.(new Error(message)); this.preparationCancel = undefined;
    // A toolchain download/prewarm may finish in the background after a command is cancelled.
    if (this.pending || this.state.phase === 'ready') {
      this.worker?.terminate(); this.worker = undefined; this.ready = undefined;
    }
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new Error(message)); this.pending = undefined; }
  }
}
