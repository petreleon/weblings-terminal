import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { rust } from '@codemirror/lang-rust';
import { tags } from '@lezer/highlight';
import type { RustDiagnostic } from './engine';

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#171b22', color: '#c8d0dc', fontSize: 'var(--editor-font, 13px)' },
  '.cm-scroller': { fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', lineHeight: '1.9', overflow: 'auto' },
  '.cm-content': { padding: '23px 0 60px', caretColor: '#f2947c' },
  '.cm-line': { padding: '0 28px 0 15px' },
  '.cm-gutters': { backgroundColor: '#171b22', color: '#526072', border: 'none', padding: '0 0 0 20px', minWidth: '52px' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#a8b2bf' },
  '.cm-activeLine': { backgroundColor: '#1e242d' },
  '.cm-cursor': { borderLeftColor: '#f2947c' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#37424f !important' },
  '.cm-tooltip': { backgroundColor: '#232a34', border: '1px solid #39434f', color: '#dce1e8' },
  '.cm-diagnostic': { fontFamily: 'inherit', fontSize: '12px' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy #ef8590', textUnderlineOffset: '4px' }
}, { dark: true });
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#c1a4d5' }, { tag: tags.comment, color: '#717f91', fontStyle: 'italic' },
  { tag: tags.string, color: '#a9c9a1' }, { tag: tags.number, color: '#e3bb87' },
  { tag: tags.function(tags.variableName), color: '#a7c2df' }, { tag: tags.typeName, color: '#dfbb8a' },
  { tag: tags.macroName, color: '#e3b386' }, { tag: tags.operator, color: '#b6c0ce' },
  { tag: tags.special(tags.variableName), color: '#e4b696' }
]);
export class CodeEditor {
  readonly view: EditorView;
  onChange = (_source: string) => {};
  onCursor = (_line: number, _column: number) => {};
  constructor(parent: HTMLElement, onRun: () => void) {
    this.view = new EditorView({ parent, state: EditorState.create({ extensions: [
      lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(),
      indentOnInput(), bracketMatching(), rust(), theme, syntaxHighlighting(highlight),
      EditorView.contentAttributes.of({ 'aria-label': 'Rust source code', spellcheck: 'false' }),
      keymap.of([{ key: 'Mod-Enter', run: () => { onRun(); return true; } }, indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) { this.onChange(update.state.doc.toString()); queueMicrotask(() => this.diagnostics([])); }
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head; const line = update.state.doc.lineAt(pos);
          this.onCursor(line.number, pos - line.from + 1);
        }
      })
    ] }) });
  }
  get source() { return this.view.state.doc.toString(); }
  set source(value: string) { this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: value }, selection: { anchor: 0 } }); this.diagnostics([]); }
  diagnostics(items: RustDiagnostic[]) {
    const doc = this.view.state.doc;
    const diagnostics: Diagnostic[] = items.filter(d => d.line && d.line <= doc.lines).map(d => {
      const line = doc.line(d.line!);
      const from = Math.min(line.to, line.from + Math.max(0, (d.col ?? 1) - 1));
      return { from, to: Math.min(line.to, from + Math.max(1, (d.endCol ?? (d.col ?? 1) + 1) - (d.col ?? 1))), severity: d.level, message: d.message };
    });
    this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
  }
  jump(line: number) {
    const from = this.view.state.doc.line(Math.min(line, this.view.state.doc.lines)).from;
    this.view.dispatch({ selection: { anchor: from }, scrollIntoView: true }); this.view.focus();
  }
}
