import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_EXCLUDES, DEFAULT_FORBIDDEN_BUILD_ARTIFACTS, DEFAULT_REQUIRED_BUILD_FILES } from './defaults.mjs';
import { normalizeToolkitConfig } from './config-normalize.mjs';
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

function buildForbiddenList(config) {
	const inheritExcludes = config.validation.inheritExcludes !== false;
	const forbidden = [...DEFAULT_FORBIDDEN_BUILD_ARTIFACTS];

	if (inheritExcludes) {
		forbidden.push(...config.build.excludes);
	}

	if (config.validation.forbidden?.length) {
		forbidden.push(...config.validation.forbidden);
	}

	return [...new Set(forbidden)];
}

function resolveI18n(config) {
	return config.i18n;
}

function resolveRelease(config, env) {
	const release = config.release;

	if (release.enabled !== true) {
		return {
			enabled: false,
			svnUser: env.WP_SVN_USER || release.svnUser || '',
			svnUrl: release.svnUrl || env.WP_SVN_URL || '',
			wpAssets: typeof release.wpAssets === 'string' ? release.wpAssets : '',
		};
	}

	const svnUrl = release.svnUrl || env.WP_SVN_URL || '';

	if (!svnUrl) {
		throw new Error('wp-toolkit.config.mjs: release.svnUrl is required when release.enabled is true.');
	}

	return {
		enabled: true,
		svnUser: env.WP_SVN_USER || release.svnUser || '',
		svnUrl,
		wpAssets: typeof release.wpAssets === 'string' ? release.wpAssets : '',
	};
}

export async function createContext(rootDir = process.cwd(), options = {}) {
	const rawConfig = await loadToolkitConfig(rootDir);
	const config = normalizeToolkitConfig(rawConfig);
	const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
	const env = loadEnv(rootDir);
	const { slug, mainFile, textDomain, assets, build } = config;
	const buildVariant = options.variant || null;
	const variantConfig = buildVariant ? config.variants[buildVariant] : null;

	if (buildVariant && !variantConfig) {
		throw new Error(`Unknown build variant "${buildVariant}". Check variants in wp-toolkit.config.mjs.`);
	}

	const release = resolveRelease(config, env);

	const paths = {
		root: rootDir,
		buildDir: join(rootDir, 'build'),
		buildPath: join(rootDir, 'build', slug),
		zipPath: resolveZipPath(rootDir, { config, slug, pkg, meta: { version: `${pkg.title || pkg.name} - v${pkg.version}` } }, variantConfig),
		wpAssets: release.wpAssets ? join(rootDir, release.wpAssets) : '',
	};

	const meta = {
		project: slug,
		version: `${pkg.title || pkg.name} - v${pkg.version}`,
		copyright: `${pkg.author?.name || pkg.name} ${new Date().getFullYear()}`,
		phpHeader: config.phpHeader || buildPhpHeader(pkg),
	};

	const wpDeploy = {
		pluginSlug: slug,
		svnUser: release.svnUser,
		svnUrl: release.svnUrl,
		buildDir: paths.buildPath,
		assetsDir: paths.wpAssets && existsSync(paths.wpAssets) ? paths.wpAssets : '',
		enabled: release.enabled,
	};

	if (wpDeploy.svnUser) {
		assertSafeSvnConfig(wpDeploy);
	}

	const preprocessContext = {
		VERSION: pkg.version,
		DEV: false,
		TODO: false,
		LITE: false,
		PRO: false,
		HEADER: meta.phpHeader,
		...build.preprocess,
	};

	const context = {
		rootDir,
		pkg,
		env,
		config,
		slug,
		mainFile,
		textDomain,
		assets,
		build,
		paths,
		meta,
		buildVariant,
		variantConfig,
		excludes: [...DEFAULT_EXCLUDES, ...build.excludes],
		preprocessContext,
		watch: assets.watch,
		deployTargets: buildDeployTargets(env, config.deploy, slug),
		wpDeploy,
		validation: {
			requiredFiles: config.validation.requiredFiles || [...DEFAULT_REQUIRED_BUILD_FILES, mainFile],
			forbidden: buildForbiddenList(config),
			checkStableTag: config.validation.checkStableTag !== false,
			checkMinifiedAssets: config.validation.checkMinifiedAssets !== false,
		},
		i18n: resolveI18n(config),
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
