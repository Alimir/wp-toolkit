import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import chokidar from 'chokidar';
import { getContext } from './context.mjs';
import { buildCss } from './build-css.mjs';
import { buildJs } from './build-js.mjs';

function globPatternToDir(root, pattern) {
	const base = pattern.split('*')[0].replace(/\/$/, '');

	if (!base) {
		return null;
	}

	return join(root, base);
}

function collectWatchDirectories(context) {
	const root = context.paths.root;
	const dirs = new Set();

	for (const input of Object.values(context.assets.css.sassEntries)) {
		dirs.add(dirname(join(root, input)));
	}

	for (const bundle of context.assets.js.bundles) {
		for (const source of bundle.sources) {
			dirs.add(dirname(join(root, source)));
		}
	}

	for (const pattern of [...(context.watch.scss || []), ...(context.watch.js || [])]) {
		const dir = globPatternToDir(root, pattern);

		if (dir) {
			dirs.add(dir);
		}
	}

	return [...dirs].filter((dir) => existsSync(dir));
}

function isScssPath(filePath) {
	return filePath.endsWith('.scss');
}

function schedule(task, timerRef, delay, label) {
	if (timerRef.current) {
		clearTimeout(timerRef.current);
	}

	timerRef.current = setTimeout(async () => {
		console.log(`\n[dev] Rebuilding ${label}...`);
		await task();
		console.log(`[dev] ${label} ready.`);
	}, delay);
}

export async function watchProject() {
	const context = getContext();
	const cssSchedule = { current: null };
	const jsSchedule = { current: null };
	const watchDirs = collectWatchDirectories(context);

	console.log('[dev] Watching assets. Press Ctrl+C to stop.');

	if (!watchDirs.length) {
		console.log('[dev] No asset source directories found. Check assets.css.sassEntries and assets.js.bundles in wp-toolkit.config.mjs.');
	} else {
		const relativeDirs = watchDirs.map((dir) => dir.replace(`${context.paths.root}/`, ''));
		console.log(`[dev] Directories: ${relativeDirs.join(', ')}`);
	}

	chokidar
		.watch(watchDirs, {
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 150,
				pollInterval: 50,
			},
		})
		.on('change', (filePath) => {
			if (isScssPath(filePath)) {
				schedule(buildCss, cssSchedule, 120, 'CSS');
				return;
			}

			schedule(buildJs, jsSchedule, 120, 'JavaScript');
		})
		.on('add', (filePath) => {
			if (isScssPath(filePath)) {
				schedule(buildCss, cssSchedule, 120, 'CSS');
				return;
			}

			schedule(buildJs, jsSchedule, 120, 'JavaScript');
		});

	await buildJs();
	await buildCss();

	await new Promise(() => {});
}
