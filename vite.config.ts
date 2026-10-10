import { defineConfig } from 'vite';
export default defineConfig({
  build: { rollupOptions: { output: { manualChunks: {
    editor: ['@codemirror/view', '@codemirror/state', '@codemirror/language', '@codemirror/lang-rust', '@codemirror/lint', '@codemirror/commands'],
    terminal: ['@xterm/xterm', '@xterm/addon-fit']
  } } } }
});
