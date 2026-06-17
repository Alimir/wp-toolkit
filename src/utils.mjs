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

export function runShell(command, options = {}) {
	const context = getContext();

	return new Promise((resolve, reject) => {
		const child = spawn(command, [], {
			cwd: options.cwd || context.paths.root,
			stdio: 'inherit',
			shell: true,
			env: options.env || process.env,
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`Hook failed (${code}): ${command}`));
		});
	});
}

export async function runHook(hook) {
	if (typeof hook === 'string') {
		await runShell(hook);
		return;
	}

	if (hook?.command) {
		await run(hook.command, hook.args || [], { cwd: hook.cwd });
		return;
	}

	throw new Error('Invalid hook. Use a shell string or { command, args?, cwd? }.');
}

export async function runHooks(hooks, label) {
	if (!hooks?.length) {
		return;
	}

	console.log(`Running ${label} hooks...`);

	for (const hook of hooks) {
		const description = typeof hook === 'string' ? hook : `${hook.command} ${(hook.args || []).join(' ')}`.trim();
		console.log(`→ ${description}`);
		await runHook(hook);
	}
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
