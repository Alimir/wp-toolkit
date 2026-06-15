import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_EXCLUDES, DEFAULT_FORBIDDEN_BUILD_ARTIFACTS, DEFAULT_REQUIRED_BUILD_FILES, DEFAULT_WATCH } from './defaults.mjs';
import { loadEnv, loadToolkitConfig } from './load-env.mjs';
import { assertSafeDeployTarget, assertSafeSvnConfig } from './security.mjs';
import { resolveZipPath } from './build-helpers.mjs';

function targetFromEnv(env, prefix) {
	const port = env[`${prefix}_PORT`];
	const target = {
		host: env[`${prefix}_HOST`] || '',
		dest: env[`${prefix}_DEST`] || '',
	};

	if (port) {
		target.port = port;
	}

	return target;
}

function buildDeployTargets(env, deployConfig = {}, slug) {
	const targets = {};

	for (const [name, settings] of Object.entries(deployConfig)) {
		if (!settings?.envPrefix) {
			continue;
		}

		targets[name] = targetFromEnv(env, settings.envPrefix);

		if (targets[name].host && targets[name].dest) {
			assertSafeDeployTarget(targets[name], name, slug);
		}
	}

	return targets;
}

function buildPhpHeader(pkg) {
	return [
		'',
		` * @package    ${pkg.name}`,
		` * @author     ${pkg.author?.name || pkg.name} ${new Date().getFullYear()}`,
		` * @link       ${pkg.homepage || ''}`,
	].join('\n');
}

export async function createContext(rootDir = process.cwd(), options = {}) {
	const toolkitConfig = await loadToolkitConfig(rootDir);
	const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
	const env = loadEnv(rootDir);
	const slug = toolkitConfig.slug || pkg.name;
	const mainFile = toolkitConfig.mainFile || `${slug}.php`;
	const textDomain = toolkitConfig.textDomain || slug;
	const buildVariant = options.variant || null;
	const variantConfig = buildVariant ? toolkitConfig.variants?.[buildVariant] : null;

	if (buildVariant && !variantConfig) {
		throw new Error(`Unknown build variant "${buildVariant}". Check variants in wp-toolkit.config.mjs.`);
	}

	const releaseConfig = toolkitConfig.release || {};
	const releaseEnabled = releaseConfig.enabled !== false && Boolean(releaseConfig.svnUrl || slug);

	const paths = {
		root: rootDir,
		buildDir: join(rootDir, 'build'),
		buildPath: join(rootDir, 'build', slug),
		zipPath: resolveZipPath(rootDir, { config: toolkitConfig, slug, pkg, meta: { version: `${pkg.title || pkg.name} - v${pkg.version}` } }, variantConfig),
		wpAssets: join(rootDir, releaseConfig.wpAssets || 'wp-assets'),
	};

	const meta = {
		project: slug,
		version: `${pkg.title || pkg.name} - v${pkg.version}`,
		copyright: `${pkg.author?.name || pkg.name} ${new Date().getFullYear()}`,
		phpHeader: toolkitConfig.phpHeader || buildPhpHeader(pkg),
	};

	const wpDeploy = {
		pluginSlug: slug,
		svnUser: env.WP_SVN_USER || releaseConfig.svnUser || '',
		svnUrl: releaseConfig.svnUrl || env.WP_SVN_URL || `https://plugins.svn.wordpress.org/${slug}`,
		buildDir: paths.buildPath,
		assetsDir: existsSync(paths.wpAssets) ? paths.wpAssets : '',
		enabled: releaseEnabled,
	};

	if (wpDeploy.svnUser) {
		assertSafeSvnConfig(wpDeploy);
	}

	const preprocessFlags = {
		VERSION: pkg.version,
		DEV: false,
		TODO: false,
		LITE: false,
		PRO: false,
		HEADER: meta.phpHeader,
		...(toolkitConfig.preprocess || {}),
	};

	const context = {
		rootDir,
		pkg,
		env,
		config: toolkitConfig,
		paths,
		meta,
		slug,
		mainFile,
		textDomain,
		buildVariant,
		variantConfig,
		jsSources: toolkitConfig.jsSources || [],
		sassEntries: toolkitConfig.sassEntries || {},
		js: {
			output: toolkitConfig.js?.output || `assets/js/${slug}.js`,
			minOutput: toolkitConfig.js?.minOutput || `assets/js/${slug}.min.js`,
			...(toolkitConfig.js || {}),
		},
		jsBundles:
			toolkitConfig.jsBundles ||
			(toolkitConfig.jsSources?.length
				? [
						{
							sources: toolkitConfig.jsSources,
							output: toolkitConfig.js?.output || `assets/js/${slug}.js`,
							minOutput: toolkitConfig.js?.minOutput || `assets/js/${slug}.min.js`,
							banner: toolkitConfig.js?.banner !== false,
						},
					]
				: []),
		jsMinify: toolkitConfig.jsMinify || [],
		css: toolkitConfig.css || {},
		excludes: [...DEFAULT_EXCLUDES, ...(toolkitConfig.excludes || [])],
		devOnlyFiles: toolkitConfig.devOnlyFiles || [],
		watch: {
			...DEFAULT_WATCH,
			...(toolkitConfig.watch || {}),
		},
		deployTargets: buildDeployTargets(env, toolkitConfig.deploy, slug),
		wpDeploy,
		preprocessContext: preprocessFlags,
		validation: {
			requiredFiles: toolkitConfig.validation?.requiredFiles || [...DEFAULT_REQUIRED_BUILD_FILES, mainFile],
			forbidden: toolkitConfig.validation?.forbidden || DEFAULT_FORBIDDEN_BUILD_ARTIFACTS,
			checkStableTag: toolkitConfig.validation?.checkStableTag !== false,
			checkMinifiedAssets: toolkitConfig.validation?.checkMinifiedAssets !== false,
		},
		i18n: {
			domain: toolkitConfig.i18n?.domain || textDomain,
			potFile: toolkitConfig.i18n?.potFile || `languages/${textDomain}.pot`,
			exclude: toolkitConfig.i18n?.exclude || 'build,node_modules',
			headers: toolkitConfig.i18n?.headers || {},
			skipJs: toolkitConfig.i18n?.skipJs !== false,
		},
	};

	return context;
}

let activeContext = null;

export async function initContext(rootDir = process.cwd(), options = {}) {
	activeContext = await createContext(rootDir, options);
	return activeContext;
}

export function getContext() {
	if (!activeContext) {
		throw new Error('wp-toolkit context is not initialized.');
	}

	return activeContext;
}
