import filesize from 'rollup-plugin-filesize';
import {terser} from 'rollup-plugin-terser';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'index.js',
  output: [
    {
      file: 'dist/vega-embed.bundled.min.js',
      name: 'VegaElements',
      exports: 'named',
      format: 'umd',
      sourcemap: true,
      globals: {
        vega: 'vega',
        'vega-lib': 'vega',
        'vega-lite': 'vl'
      }
    }
  ],
  plugins: [
    commonjs(),
    resolve({
      module: true,
      browser: true,
      preferBuiltins: false
    }),
    terser({
      warnings: true,
      mangle: {module: true}
    }),
    filesize({
      showBrotliSize: true
    })
  ],
  external: ['vega', 'vega-lib', 'vega-lite'],
  onwarn(warning) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
      console.error(`(!) ${warning.message}`);
    }
  }
};
