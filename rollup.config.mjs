import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

// React is external for ESM/CJS (a host app brings its own copy) and
// bundled for the IIFE (a bare <script> tag has nothing else to bring).
const REACT_EXTERNALS = ['react', 'react-dom', 'react/jsx-runtime'];

const jsPlugins = [
  nodeResolve({ extensions: ['.ts', '.tsx', '.js'] }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    noEmitOnError: true,
    outputToFilesystem: true,
  }),
];

/** @type {import('rollup').RollupOptions} */
const esmAndCjs = {
  input: {
    index: 'src/index.ts',
    'ui/index': 'src/ui/index.ts',
  },
  external: REACT_EXTERNALS,
  plugins: jsPlugins,
  output: [
    {
      dir: 'build/esm',
      format: 'es',
      preserveModules: true,
      preserveModulesRoot: 'src',
      entryFileNames: '[name].js',
      sourcemap: true,
    },
    {
      dir: 'build/cjs',
      format: 'cjs',
      exports: 'named',
      entryFileNames: (chunk) => (chunk.name === 'ui/index' ? 'ui.cjs' : '[name].cjs'),
      sourcemap: true,
      interop: 'auto',
    },
  ],
};

/** @type {import('rollup').RollupOptions} */
const iifeCore = {
  input: 'src/index.ts',
  // No external — a <script src="…vit-rin.min.js"> tag has nothing else
  // to bring. The headless core doesn't import React at all, so this is
  // just "bundle whatever it actually needs".
  external: [],
  plugins: [...jsPlugins, terser()],
  output: {
    file: 'build/iife/vit-rin.min.js',
    format: 'iife',
    name: 'VitRin',
    sourcemap: true,
  },
};

/** @type {import('rollup').RollupOptions} */
const iifeUi = {
  input: 'src/ui/index.ts',
  // Bundled, per the contract: a CDN <script> tag for the overlay must
  // not require the host page to have already loaded React itself.
  external: [],
  plugins: [...jsPlugins, terser()],
  output: {
    file: 'build/iife/vit-rin-ui.min.js',
    format: 'iife',
    name: 'VitRinUI',
    sourcemap: true,
  },
};

/** @type {import('rollup').RollupOptions} */
const typesIndex = {
  input: 'src/index.ts',
  external: REACT_EXTERNALS,
  plugins: [dts()],
  output: {
    file: 'build/types/index.d.ts',
    format: 'es',
  },
};

/** @type {import('rollup').RollupOptions} */
const typesUi = {
  input: 'src/ui/index.ts',
  external: REACT_EXTERNALS,
  plugins: [dts()],
  output: {
    file: 'build/types/ui/index.d.ts',
    format: 'es',
  },
};

export default [esmAndCjs, iifeCore, iifeUi, typesIndex, typesUi];
