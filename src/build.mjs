import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import preprocess from 'preprocess';
import { applyReplacements, buildTemplateVars, resolveTemplate } from './build-helpers.mjs';
import { getContext } from './context.mjs';
import { buildCss } from './build-css.mjs';
import { buildJs } from './build-js.mjs';
import { assertReleaseBuild } from './security.mjs';
import { commandExists, run } from './utils.mjs';

function walkFiles(dir, matcher, files = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			walkFiles(entryPath, matcher, files);
			continue;
		}

		if (matcher(entryPath)) {
			files.push(entryPath);
		}
	}

	return files;
}

function isJunkEntry(name) {
	return (
		name === '.DS_Store' ||
		name === 'Thumbs.db' ||
		name === 'desktop.ini' ||
		name.startsWith('._') ||
		name.endsWith('~') ||
		name.endsWith('.swp')
	);
}

function shouldExclude(relativePath, excludes) {
	const normalized = relativePath.replace(/\\/g, '/');
	const baseName = normalized.split('/').pop() || normalized;

	if (isJunkEntry(baseName)) {
		return true;
	}

	if (normalized === '.env' || normalized.startsWith('.env.')) {
		return true;
	}

	if (
		normalized === 'node_modules' ||
		normalized.endsWith('/node_modules') ||
		normalized.includes('/node_modules/')
	) {
		return true;
	}

	return excludes.some((pattern) => {
		if (pattern === 'node_modules') {
			return false;
		}

		if (pattern === '.*') {
			const parts = normalized.split('/');
			return parts.some((part) => part.startsWith('.') && part !== '.' && part !== '..');
		}

		if (pattern.endsWith('*')) {
			return normalized.startsWith(pattern.slice(0, -1));
		}

		return normalized === pattern || normalized.startsWith(`${pattern}/`);
	});
}

async function cleanBuildDir(buildPath) {
	if (!existsSync(buildPath)) {
		return;
	}

	try {
		rmSync(buildPath, {
			recursive: true,
			force: true,
			maxRetries: 5,
			retryDelay: 200,
		});
	} catch {
		await run('find', [buildPath, '-depth', '-delete'], { stdio: 'ignore' });
	}
}

async function copyProjectToBuild(context) {
	const { paths, excludes } = context;
	await cleanBuildDir(paths.buildPath);
	mkdirSync(paths.buildPath, { recursive: true });

	const walk = (sourceDir, targetDir) => {
		for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
			if (isJunkEntry(entry.name)) {
				continue;
			}

			const sourcePath = join(sourceDir, entry.name);
			const relativePath = relative(paths.root, sourcePath);

			if (shouldExclude(relativePath, excludes)) {
				continue;
			}

			const targetPath = join(targetDir, entry.name);

			if (entry.isDirectory()) {
				mkdirSync(targetPath, { recursive: true });
				walk(sourcePath, targetPath);
				continue;
			}

			cpSync(sourcePath, targetPath);
		}
	};

	walk(paths.root, paths.buildPath);
}

function purgeJunkFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			purgeJunkFiles(entryPath);
			continue;
		}

		if (isJunkEntry(entry.name)) {
			rmSync(entryPath, { force: true });
		}
	}
}

async function compressImages(buildPath) {
	const pngs = walkFiles(buildPath, (filePath) => filePath.endsWith('.png'));
	const jpgs = walkFiles(buildPath, (filePath) => /\.(jpe?g)$/i.test(filePath));
	const hasPngquant = await commandExists('pngquant');
	const hasJpegoptim = await commandExists('jpegoptim');

	if (!pngs.length && !jpgs.length) {
		return;
	}

	if (!hasPngquant && !hasJpegoptim) {
		console.log('Skipping image compression (pngquant/jpegoptim not installed).');
		return;
	}

	if (pngs.length && hasPngquant) {
		console.log(`Compressing ${pngs.length} PNG files...`);
		for (const absolute of pngs) {
			await run('pngquant', [
				'--speed',
				'3',
				'--quality=65-80',
				'--skip-if-larger',
				'--ext',
				'.png',
				'--force',
				'256',
				absolute,
			], { stdio: 'ignore' });
		}
	}

	if (jpgs.length && hasJpegoptim) {
		console.log(`Compressing ${jpgs.length} JPEG files...`);
		for (const absolute of jpgs) {
			await run('jpegoptim', ['-m80', '-o', '-p', absolute], { stdio: 'ignore' });
		}
	}
}

function applyPreprocess(context) {
	const { paths, preprocessContext } = context;
	const targets = [
		...walkFiles(paths.buildPath, (filePath) => filePath.endsWith('.php')),
		...walkFiles(paths.buildPath, (filePath) => filePath.endsWith('.css')),
		join(paths.buildPath, 'readme.txt'),
	].filter((filePath) => existsSync(filePath));

	for (const absoluteFile of targets) {
		const source = readFileSync(absoluteFile, 'utf8');
		const extension = absoluteFile.split('.').pop();
		const output = preprocess.preprocess(source, preprocessContext, extension);
		writeFileSync(absoluteFile, output, 'utf8');
	}
}

function optimizeReleaseBundle(context) {
	for (const relativePath of context.devOnlyFiles) {
		const filePath = join(context.paths.buildPath, relativePath);

		if (existsSync(filePath)) {
			rmSync(filePath, { force: true });
		}
	}
}

function writeVersionFile(context) {
	const buildConfig = context.config.build || {};
	const rawConfig =
		context.variantConfig?.versionFile === false
			? null
			: context.variantConfig?.versionFile || buildConfig.versionFile;

	if (!rawConfig || rawConfig.enabled === false) {
		return;
	}

	const versionConfig = rawConfig;
	const { paths } = context;
	const vars = buildTemplateVars(context);
	const fileName = resolveTemplate(versionConfig.name || '{slug}-{version}.txt', vars);
	const content = resolveTemplate(
		versionConfig.content || '{title} latest version: {versionLabel}\n',
		vars
	);

	if (versionConfig.writeToBuildDir !== false) {
		const versionPath = join(paths.buildDir, fileName);

		for (const file of readdirSync(paths.buildDir)) {
			if (file.startsWith(`${context.slug}-`) && file.endsWith('.txt')) {
				rmSync(join(paths.buildDir, file), { force: true });
			}
		}

		writeFileSync(versionPath, content, 'utf8');
		console.log(`Wrote ${fileName}`);
	}

	if (versionConfig.includeInZip) {
		const zipRelativePath = versionConfig.zipPath || fileName;
		const targetPath = join(paths.buildPath, zipRelativePath);
		mkdirSync(dirname(targetPath), { recursive: true });
		writeFileSync(targetPath, content, 'utf8');
		console.log(`Included version file in zip bundle: ${zipRelativePath}`);
	}
}

async function packBuild(context) {
	const { paths, slug } = context;

	if (existsSync(paths.zipPath)) {
		rmSync(paths.zipPath, { force: true });
	}

	await run('zip', ['-FSr', '-9', paths.zipPath, slug, '-x', '*/.*', '*/.DS_Store', '*/._*', '*/Thumbs.db'], {
		cwd: paths.buildDir,
	});
}

export async function buildProject() {
	const context = getContext();
	const label = context.buildVariant ? `${context.meta.project} v${context.pkg.version} (${context.buildVariant})` : `${context.meta.project} v${context.pkg.version}`;

	console.log(`Building ${label}...`);
	await buildJs();
	await buildCss();
	console.log('Copying plugin files to build/...');
	await copyProjectToBuild(context);
	console.log('Cleaning build artifacts...');
	purgeJunkFiles(context.paths.buildPath);
	await compressImages(context.paths.buildPath);

	if (context.variantConfig?.replacements?.length) {
		console.log('Applying build variant replacements...');
		applyReplacements(
			context.paths.buildPath,
			context.variantConfig.files || ['**/*.php'],
			context.variantConfig.replacements,
			walkFiles
		);
	}

	console.log('Applying production preprocess flags...');
	applyPreprocess(context);
	console.log('Optimizing release bundle...');
	optimizeReleaseBundle(context);
	assertReleaseBuild(context.paths.buildPath, context);
	writeVersionFile(context);
	console.log('Creating zip archive...');
	await packBuild(context);
	console.log(`Build complete: ${context.paths.buildPath}`);
	console.log(`Zip archive: ${context.paths.zipPath}`);
}
