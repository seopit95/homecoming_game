import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
 root:fileURLToPath(new URL('./itch',import.meta.url)),
 base:'./',
 publicDir:'../public',
 plugins:[react()],
 css:{postcss:{plugins:[tailwindcss()]}},
 build:{outDir:'../dist/itch',emptyOutDir:true},
});
