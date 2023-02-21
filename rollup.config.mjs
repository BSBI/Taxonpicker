import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';

import { string } from "rollup-plugin-string";
//import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import scss from 'rollup-plugin-scss';
import { terser } from 'rollup-plugin-terser';
//import sourcemaps from 'rollup-plugin-sourcemaps';
//import json from '@rollup/plugin-json';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

const version = `0.0.1.${Math.floor((Date.now() / 1000))}`;

export default [
	// {
	// 	input: 'src/index.js',
	// 	output: {
	// 		file: 'dist/bsbiappframeworkview.js',
	// 		format: 'es', // 'cjs'
	// 		exports: "named",
	// 		sourcemap: true,
	// 		name: 'bsbiappframeworkview',
	// 	},
	//
	// 	plugins: [
	// 		resolve(), // tells Rollup how to find files in node_modules
	// 		replace({
	// 			preventAssignment: true,
	// 			values: {
	// 				BSBI_APP_VERSION: version,
	// 				// ENVIRONMENT: JSON.stringify('development')
	// 			},
	// 		}),
	//
	// 		string({
	// 			// Required to be specified
	// 			include: "**/*.html",
	//
	// 			// Undefined by default
	// 			exclude: ["**/index.html"]
	// 		}),
	// 		sourcemaps(),
	// 		babel({
	// 			babelHelpers: 'runtime', // building library rather than app
	// 			exclude: '**/node_modules/**', // only transpile our source code
	// 			inputSourceMap: false, // see https://github.com/rollup/rollup/issues/3457
	// 		}),
	// 		commonjs(), // converts npm packages to ES modules
	// 		production && terser() // minify, but only in production
	// 	]
	// },
	{
		input: 'src/index.js',
		output: {
			file: 'dist/esm/taxonpicker.mjs',
			//dir: 'dist/esm',
			format: 'esm',
			exports: "named",
			sourcemap: true
		},
		external: ['bootstrap/js/dist/modal'], // @todo these should be dropped if possible

		plugins: [
			del(
				{targets: 'public/*.css'}
			),
			resolve(), // tells Rollup how to find files in node_modules
			replace({
				preventAssignment: true,
				values: {
					BSBI_APP_VERSION: version,
					// ENVIRONMENT: JSON.stringify('development')
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
						src: 'src/index.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_APP_VERSION__', version)
								//.replaceAll('__PATH__', path)
								//.replaceAll('__SUPPORT_EMAIL__', supportEmail)
					},
					{
						src: 'src/demo/sppage.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_APP_VERSION__', version)
					},
					{
						src: 'src/demo/atlashome.html',
						dest: 'public',
						transform: (contents) =>
							contents.toString()
								.replaceAll('__BSBI_APP_VERSION__', version)
					},
					{
						src: 'src/picker.css',
						dest: 'public'
					},
					// {
					// 	src: 'src/app.css',
					// 	dest: 'public/appcss',
					// 	rename: `app.${version}.css`
					// }
				],
			}),
			scss({
				output: `public/taxonpicker.${version}.css`,
				outputStyle: 'compressed'
			}),
			//json(),
			//sourcemaps(),
			// babel({
			// 	exclude: 'node_modules/**', // only transpile our source code
			// 	babelHelpers: 'runtime' // building library rather than app
			// }),
			commonjs(), // converts npm packages to ES modules
			//production && terser() // minify, but only in production
			terser()
		]
	},
	];
