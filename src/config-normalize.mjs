const REQUIRED_IDENTITY = ['slug', 'mainFile', 'textDomain'];

function requireString(value, path) {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`wp-toolkit.config.mjs: ${path} must be a non-empty string.`);
	}

	return value.trim();
}

function requireArray(value, path) {
	if (!Array.isArray(value)) {
		throw new Error(`wp-toolkit.config.mjs: ${path} must be an array.`);
	}

	return value;
}

function requireObject(value, path) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`wp-toolkit.config.mjs: ${path} must be an object.`);
	}

	return value;
}

function validateJsBundle(bundle, index) {
	const prefix = `assets.js.bundles[${index}]`;

	if (!bundle || typeof bundle !== 'object') {
		throw new Error(`wp-toolkit.config.mjs: ${prefix} must be an object.`);
	}

	const sources = requireArray(bundle.sources, `${prefix}.sources`);

	if (!sources.length) {
		throw new Error(`wp-toolkit.config.mjs: ${prefix}.sources must contain at least one file.`);
	}

	for (const [sourceIndex, source] of sources.entries()) {
		requireString(source, `${prefix}.sources[${sourceIndex}]`);
	}

	requireString(bundle.output, `${prefix}.output`);
	requireString(bundle.minOutput, `${prefix}.minOutput`);

	return {
		sources,
		output: bundle.output.trim(),
		minOutput: bundle.minOutput.trim(),
		banner: bundle.banner !== false,
	};
}

function validateMinifyTarget(target, index) {
	const prefix = `assets.js.minify[${index}]`;
	requireString(target?.input, `${prefix}.input`);
	requireString(target?.output, `${prefix}.output`);

	return {
		input: target.input.trim(),
		output: target.output.trim(),
	};
}

/**
 * Validate and normalize the lifetime wp-toolkit.config.mjs shape.
 * All plugin paths must be declared explicitly — nothing is inferred from slug.
 */
export function normalizeToolkitConfig(config) {
	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		throw new Error('wp-toolkit.config.mjs must export a configuration object.');
	}

	for (const key of REQUIRED_IDENTITY) {
		requireString(config[key], key);
	}

	const assets = requireObject(config.assets, 'assets');
	const assetJs = requireObject(assets.js ?? {}, 'assets.js');
	const assetCss = requireObject(assets.css ?? {}, 'assets.css');
	const build = requireObject(config.build, 'build');

	const bundles = requireArray(assetJs.bundles ?? [], 'assets.js.bundles').map(validateJsBundle);
	const minify = requireArray(assetJs.minify ?? [], 'assets.js.minify').map(validateMinifyTarget);

	const sassEntries = requireObject(assetCss.sassEntries ?? {}, 'assets.css.sassEntries');

	for (const [output, input] of Object.entries(sassEntries)) {
		requireString(output, `assets.css.sassEntries key "${output}"`);
		requireString(input, `assets.css.sassEntries["${output}"]`);
	}

	const minifySeparate = requireArray(assetCss.minifySeparate ?? [], 'assets.css.minifySeparate');

	for (const [index, entry] of minifySeparate.entries()) {
		requireString(entry, `assets.css.minifySeparate[${index}]`);
	}

	const excludes = requireArray(build.excludes ?? [], 'build.excludes');

	for (const [index, entry] of excludes.entries()) {
		requireString(entry, `build.excludes[${index}]`);
	}

	const devOnlyFiles = requireArray(build.devOnlyFiles ?? [], 'build.devOnlyFiles');

	for (const [index, entry] of devOnlyFiles.entries()) {
		requireString(entry, `build.devOnlyFiles[${index}]`);
	}

	const hooks = requireObject(build.hooks ?? {}, 'build.hooks');
	const preBuild = requireArray(hooks.preBuild ?? [], 'build.hooks.preBuild');
	const postBuild = requireArray(hooks.postBuild ?? [], 'build.hooks.postBuild');

	const watch = requireObject(assets.watch ?? {}, 'assets.watch');

	let i18n = null;

	if (config.i18n) {
		const rawI18n = requireObject(config.i18n, 'i18n');
		i18n = {
			domain: requireString(rawI18n.domain, 'i18n.domain'),
			potFile: requireString(rawI18n.potFile, 'i18n.potFile'),
			exclude: typeof rawI18n.exclude === 'string' ? rawI18n.exclude.trim() : 'build,node_modules',
			headers: rawI18n.headers && typeof rawI18n.headers === 'object' ? rawI18n.headers : {},
			skipJs: rawI18n.skipJs !== false,
		};
	}

	return {
		slug: config.slug.trim(),
		mainFile: config.mainFile.trim(),
		textDomain: config.textDomain.trim(),
		phpHeader: typeof config.phpHeader === 'string' ? config.phpHeader : undefined,
		assets: {
			js: { bundles, minify },
			css: { sassEntries, minifySeparate },
			watch: {
				scss: requireArray(watch.scss ?? [], 'assets.watch.scss'),
				js: requireArray(watch.js ?? [], 'assets.watch.js'),
			},
		},
		build: {
			excludes,
			devOnlyFiles,
			preprocess: build.preprocess && typeof build.preprocess === 'object' ? build.preprocess : {},
			hooks: { preBuild, postBuild },
			zipName: typeof build.zipName === 'string' ? build.zipName : '{slug}.zip',
			versionFile: build.versionFile,
			trimTrailingWhitespace: build.trimTrailingWhitespace !== false,
		},
		deploy: config.deploy && typeof config.deploy === 'object' ? config.deploy : {},
		release: config.release && typeof config.release === 'object' ? config.release : {},
		i18n,
		validation: config.validation && typeof config.validation === 'object' ? config.validation : {},
		variants: config.variants && typeof config.variants === 'object' ? config.variants : {},
	};
}
