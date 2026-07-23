import { babel } from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';

// Transpiles src/app.js down to ES5 and bundles the core-js polyfills that
// @babel/preset-env (useBuiltIns: 'usage') injects for the features actually used.
// React / ReactDOM stay external — they are provided as globals by the UMD
// <script> tags in index.html, so we never import them here.
export default {
  input: 'src/app.js',
  output: {
    file: 'dist/app.js',
    format: 'iife',
    name: '_app',
  },
  plugins: [
    resolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    // Obfuscate only our own code (src/**), leaving the core-js polyfills alone
    // so bundle size and runtime performance stay reasonable. Heavy transforms
    // (controlFlowFlattening / deadCodeInjection) are off — they would slow the
    // timing-sensitive boot animation.
    obfuscator({
      global: false,
      include: ['src/**/*.js'],
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: true,
        simplify: true,
        stringArray: true,
        stringArrayThreshold: 1,
        stringArrayEncoding: ['base64'],
        controlFlowFlattening: false,
        deadCodeInjection: false,
        selfDefending: false,
        disableConsoleOutput: false,
      },
    }),
    terser({ ecma: 5 }),
  ],
};
