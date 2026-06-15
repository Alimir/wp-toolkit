import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { minify } from 'terser';
import { getContext } from './context.mjs';

const TERSER_OPTIONS = {
	compress: {
		passes: 2,
		drop_console: true,
	},
	mangle: true,
	format: {
		comments: false,
		ascii_only: true,
	},
};

async function minifyFile(inputRelative, outputRelative, rootDir) {
	const inputPath = join(rootDir, inputRelative);
	const outputPath = join(rootDir, outputRelative);
	const source = readFileSync(inputPath, 'utf8');
	const minified = await minify(source, TERSER_OPTIONS);

	if (!minified.code) {
		throw new Error(`Failed to minify ${inputRelative}.`);
	}

	writeFileSync(outputPath, minified.code, 'utf8');
	console.log(`Minified ${outputRelative}`);
}

async function buildBundle(bundle, context) {
	const { paths, meta, pkg } = context;
	const banner =
		`/*! ${meta.version}\n` +
		` *  ${pkg.homepage || ''}\n` +
		` *  ${meta.copyright};\n` +
		` */\n`;

	function concatSources(includeSeparators) {
		const chunks = bundle.sources.map((relativePath) => {
			const absolutePath = join(paths.root, relativePath);
			const source = readFileSync(absolutePath, 'utf8').replace(/;\s*$/, '') + ';';

			if (!includeSeparators) {
				return source;
			}

			const separator = `\n\n/* ================== ${relativePath} =================== */\n\n\n`;
			return separator + source;
		});

		return chunks.join('');
	}

	const useBanner = bundle.banner !== false;
	const bundled = (useBanner ? banner : '') + concatSources(true);
	const minifyInput = concatSources(false);
	const outputPath = join(paths.root, bundle.output);
	const minPath = join(paths.root, bundle.minOutput);

	writeFileSync(outputPath, bundled, 'utf8');

	const minified = await minify(minifyInput, TERSER_OPTIONS);

	if (!minified.code) {
		throw new Error(`Failed to minify ${bundle.output}.`);
	}

	writeFileSync(minPath, minified.code, 'utf8');
	console.log(`Built ${bundle.output} and ${bundle.minOutput}`);
}

export async function buildJs() {
	const context = getContext();
	const { paths, jsBundles, jsMinify } = context;

	if (!jsBundles.length && !jsMinify.length) {
		console.log('No JavaScript sources configured. Skipping JavaScript build.');
		return;
	}

	for (const bundle of jsBundles) {
		await buildBundle(bundle, context);
	}

	for (const target of jsMinify) {
		await minifyFile(target.input, target.output, paths.root);
	}
}
