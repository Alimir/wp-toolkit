import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const HOST_PATTERN = /^[A-Za-z0-9@._-]+$/;
const ABSOLUTE_PATH_PATTERN = /^\/[A-Za-z0-9/_.-]+$/;

function isJunkReleaseFile(name) {
	return (
		name === '.DS_Store' ||
		name === 'Thumbs.db' ||
		name === 'desktop.ini' ||
		name.startsWith('._') ||
		name.endsWith('~') ||
		name.endsWith('.swp')
	);
}

function walkReleaseFiles(dir, baseDir = dir, files = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			walkReleaseFiles(entryPath, baseDir, files);
			continue;
		}

		files.push(entryPath.slice(baseDir.length + 1).replace(/\\/g, '/'));
	}

	return files;
}

export function assertSafeDeployTarget(target, name, slug) {
	if (!target?.host || !HOST_PATTERN.test(target.host)) {
		throw new Error(`Invalid deploy host for "${name}".`);
	}

	if (!target?.dest || !ABSOLUTE_PATH_PATTERN.test(target.dest)) {
		throw new Error(`Invalid deploy destination for "${name}". Use an absolute plugin path.`);
	}

	if (!target.dest.includes(`/${slug}`)) {
		throw new Error(`Deploy destination for "${name}" must point to the ${slug} plugin directory.`);
	}

	if (target.dest.includes('..')) {
		throw new Error(`Deploy destination for "${name}" cannot contain "..".`);
	}

	if (target.port && !/^\d{1,5}$/.test(String(target.port))) {
		throw new Error(`Invalid SSH port for "${name}".`);
	}
}

export function assertSafeSvnConfig(config) {
	if (!config?.svnUser || !/^[A-Za-z0-9._-]+$/.test(config.svnUser)) {
		throw new Error('Invalid WP_SVN_USER in .env.');
	}

	if (!config?.svnUrl || !config.svnUrl.startsWith('https://plugins.svn.wordpress.org/')) {
		throw new Error('WP_SVN_URL must use https://plugins.svn.wordpress.org/.');
	}
}

export function assertReleaseBuild(buildPath, context) {
	const { pkg, mainFile, slug, validation } = context;
	const blockers = [];

	for (const file of validation.requiredFiles) {
		if (!existsSync(join(buildPath, file))) {
			blockers.push(`Missing required file: ${file}`);
		}
	}

	for (const relativePath of validation.forbidden) {
		if (existsSync(join(buildPath, relativePath))) {
			blockers.push(`Forbidden release artifact present: ${relativePath}`);
		}
	}

	const junkFiles = walkReleaseFiles(buildPath).filter((filePath) =>
		isJunkReleaseFile(filePath.split('/').pop() || '')
	);

	if (junkFiles.length) {
		blockers.push(`Junk files present in build: ${junkFiles.join(', ')}`);
	}

	const mainFilePath = join(buildPath, mainFile);
	const mainFileContents = existsSync(mainFilePath) ? readFileSync(mainFilePath, 'utf8') : '';
	const readme = existsSync(join(buildPath, 'readme.txt')) ? readFileSync(join(buildPath, 'readme.txt'), 'utf8') : '';

	if (mainFileContents && !mainFileContents.includes(`Version:           ${pkg.version}`)) {
		blockers.push(`${mainFile} version does not match package.json (${pkg.version}).`);
	}

	if (validation.checkStableTag && readme && !readme.includes(`Stable tag: ${pkg.version}`)) {
		blockers.push(`readme.txt stable tag does not match package.json (${pkg.version}).`);
	}

	if (mainFileContents.includes('Access-Control-Allow-Origin')) {
		blockers.push('DEV-only CORS header leaked into production build.');
	}

	if (validation.checkMinifiedAssets) {
		for (const bundle of context.assets.js.bundles) {
			const jsFile = bundle.output.split('/').pop();
			const minJsFile = bundle.minOutput.split('/').pop();

			if (
				jsFile &&
				minJsFile &&
				mainFileContents.includes(jsFile) &&
				!mainFileContents.includes(minJsFile)
			) {
				blockers.push(`Production build still references unminified ${jsFile}.`);
			}
		}

		const separateMinOutputs = context.assets.css.minifySeparate;

		for (const outputRelative of Object.keys(context.assets.css.sassEntries)) {
			const cssFile = outputRelative.split('/').pop();

			if (!cssFile) {
				continue;
			}

			if (separateMinOutputs.includes(outputRelative)) {
				const minCssFile = cssFile.replace(/\.css$/, '.min.css');

				if (mainFileContents.includes(cssFile) && !mainFileContents.includes(minCssFile)) {
					blockers.push(`Production build still references unminified ${cssFile}.`);
				}

				continue;
			}

			if (mainFileContents.includes(cssFile) && mainFileContents.includes(cssFile.replace(/\.css$/, '.min.css'))) {
				continue;
			}
		}
	}

	if (blockers.length) {
		throw new Error(`Release build validation failed:\n- ${blockers.join('\n- ')}`);
	}
}
