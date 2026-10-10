export interface Exercise { order: number; name: string; dir: string; test: boolean; hint: string; exercise: string; solution?: string; const_check?: string }
export interface SavedState { selected: string; mode: 'rustlings' | 'playground'; drafts: Record<string, string>; done: string[]; playground: string }
export const playgroundSource = `// Your browser. Your little Rust laboratory.\n// Try something, break something, learn something.\n\nfn main() {\n    let language = "Rust";\n    let reasons = ["fast", "safe", "a little bit magical"];\n\n    println!("Hello, {language}!");\n\n    for reason in reasons {\n        println!("  → {reason}");\n    }\n}\n`;
export const topicNames: Record<string, string> = {
  intro: 'Introduction', variables: 'Variables', functions: 'Functions', if: 'If expressions',
  primitive_types: 'Primitive types', vecs: 'Vectors', move_semantics: 'Move semantics', structs: 'Structs',
  enums: 'Enums', strings: 'Strings', modules: 'Modules', hashmaps: 'Hash maps', options: 'Options',
  error_handling: 'Error handling', generics: 'Generics', traits: 'Traits', lifetimes: 'Lifetimes',
  tests: 'Tests', iterators: 'Iterators', smart_pointers: 'Smart pointers', threads: 'Threads',
  macros: 'Macros', clippy: 'Clippy', conversions: 'Conversions', quizzes: 'Checkpoints'
};
export const topicDescriptions: Record<string, string> = {
  intro: 'Every Rust journey starts with a little hello. Meet the compiler, make a small change, and see what happens.',
  variables: 'Give your data a name. Explore bindings, types, mutability, and the things Rust catches before your code runs.',
  functions: 'Small pieces, clear purposes. Build functions with parameters and return values.',
  if: 'Let your code choose a path. In Rust, an if expression can return a value, too.',
  primitive_types: 'Get comfortable with the building blocks: numbers, booleans, characters, arrays, and tuples.',
  move_semantics: 'Who owns this value? Follow data as it moves, and learn when to borrow instead.',
  tests: 'Turn your expectations into executable checks. A passing test is a little piece of confidence.',
  threads: 'Explore concurrency. The browser WASI runtime cannot spawn OS threads; these exercises may need native Rust.',
  clippy: 'Readability matters. Browser rustc checks compilation; Clippy-specific lints require native cargo clippy.'
};
export function topicOf(ex: Exercise) { return ex.dir.replace(/^\d+_/, '') || 'quizzes'; }
export function topicName(ex: Exercise) { const topic = topicOf(ex); return topicNames[topic] ?? topic.replaceAll('_', ' '); }
const KEY = 'weblings-terminal-workspace-v1';
export function readState(): SavedState {
  const fresh: SavedState = { selected: 'intro2', mode: 'rustlings', drafts: {}, done: [], playground: playgroundSource };
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return value && typeof value === 'object' ? { ...fresh, ...value } : fresh; } catch { return fresh; }
}
export function saveState(state: SavedState) { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
