import { spawn } from 'node:child_process';
import { getContext } from './context.mjs';

export function run(command, args = [], options = {}) {
	const { env, cwd, ...spawnOptions } = options;
	const context = getContext();

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: cwd || context.paths.root,
			stdio: 'inherit',
			shell: process.platform === 'win32',
			env: env || process.env,
			...spawnOptions,
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
		});
	});
}

export function commandExists(command) {
	return new Promise((resolve) => {
		const which = process.platform === 'win32' ? 'where' : 'which';
		const child = spawn(which, [command], { stdio: 'ignore' });
		child.on('close', (code) => resolve(code === 0));
	});
}

export async function runIfAvailable(command, args, options = {}) {
	if (await commandExists(command)) {
		await run(command, args, options);
		return true;
	}

	console.warn(`Skipping optional step: "${command}" is not installed.`);
	return false;
}

export function runQuiet(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd || process.cwd(),
			stdio: ['ignore', 'ignore', 'inherit'],
			env: options.env || process.env,
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
		});
	});
}
