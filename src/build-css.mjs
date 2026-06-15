import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';
import { transform } from 'lightningcss';
import { getContext } from './context.mjs';

function stripCssComments(code) {
	return Buffer.from(code.toString().replace(/\/\*[\s\S]*?\*\//g, ''));
}

function minifyCss(inputPath, outputPath) {
	const code = readFileSync(inputPath);
	const { code: minified } = transform({
		filename: inputPath,
		code: stripCssComments(code),
		minify: true,
	});

	writeFileSync(outputPath, minified);
}

export async function buildCss() {
	const context = getContext();
	const { paths, sassEntries, css } = context;
	const separateMinOutputs = css.minifySeparate || [];

	if (!Object.keys(sassEntries).length) {
		console.log('No sassEntries configured. Skipping CSS build.');
		return;
	}

	for (const [outputRelative, inputRelative] of Object.entries(sassEntries)) {
		const inputPath = join(paths.root, inputRelative);
		const outputPath = join(paths.root, outputRelative);
		const result = sass.compile(inputPath, {
			style: 'expanded',
			sourceMap: false,
			quietDeps: true,
			silenceDeprecations: ['import', 'slash-div', 'global-builtin', 'color-functions'],
			logger: {
				warn() {},
				debug() {},
			},
		});

		writeFileSync(outputPath, result.css, 'utf8');
		console.log(`Compiled ${outputRelative}`);

		if (separateMinOutputs.includes(outputRelative)) {
			const minPath = outputPath.replace(/\.css$/, '.min.css');
			minifyCss(outputPath, minPath);
			console.log(`Minified ${minPath.replace(`${paths.root}/`, '')}`);
			continue;
		}

		minifyCss(outputPath, outputPath);
		console.log(`Minified ${outputRelative}`);
	}
}
