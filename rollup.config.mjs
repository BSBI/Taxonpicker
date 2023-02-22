import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { string } from "rollup-plugin-string";
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import terser from '@rollup/plugin-terser';

const version = `0.0.2.${Math.floor((Date.now() / 1000))}`;

export default [
	{
		input: 'src/index.js',
		output: {
			file: 'dist/esm/taxonpicker.mjs',
			format: 'esm',
			exports: "named",
			sourcemap: true
		},

		plugins: [
			del(
				{targets: 'public/*.css'}
			),
			resolve(), // tells Rollup how to find files in node_modules
			replace({
				preventAssignment: true,
				values: {
					BSBI_APP_VERSION: version,
				},
			}),

			string({
				// Required to be specified
				include: "**/*.html",

				// Undefined by default
				exclude: ["**/index.html"]
			}),
			copy({
				targets: [
					{
						src: 'src/demo/index.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_PICKER_VERSION__', version)
					},
					{
						src: 'src/demo/sppage.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_PICKER_VERSION__', version)
					},
					{
						src: 'src/demo/atlashome.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_PICKER_VERSION__', version)
					},
					{
						src: 'src/picker.css',
						dest: 'public'
					},
				],
			}),
		]
	},
	{
		input: 'src/index.js',
		output: {
			file: 'dist/esm/taxonpicker.min.mjs',
			format: 'esm',
			exports: "named",
			sourcemap: true
		},

		plugins: [
			resolve(), // tells Rollup how to find files in node_modules
			replace({
				preventAssignment: true,
				values: {
					BSBI_APP_VERSION: version,
				},
			}),
			string({
				// Required to be specified
				include: "**/*.html",

				// Undefined by default
				exclude: ["**/index.html"]
			}),
			terser()
		]
	},
	{
		input: 'src/index.js',
		output: {
			file: 'dist/umd/taxonpicker.min.umd.js',
			format: 'umd',
			exports: "named",
			sourcemap: true,
			name: 'taxonpicker'
		},

		plugins: [
			resolve(), // tells Rollup how to find files in node_modules
			replace({
				preventAssignment: true,
				values: {
					BSBI_APP_VERSION: version,
				},
			}),
			string({
				// Required to be specified
				include: "**/*.html",

				// Undefined by default
				exclude: ["**/index.html"]
			}),
			terser()
		]
	}
	];
