import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function loadEnv(rootDir) {
	const envPath = join(rootDir, '.env');

	if (!existsSync(envPath)) {
		return {};
	}

	const values = {};

	for (const line of readFileSync(envPath, 'utf8').split('\n')) {
		const trimmed = line.trim();

		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const separator = trimmed.indexOf('=');

		if (separator === -1) {
			continue;
		}

		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();

		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		values[key] = value;
	}

	return values;
}

export function requireEnv(rootDir, keys) {
	const env = loadEnv(rootDir);
	const missing = keys.filter((key) => !env[key]);

	if (missing.length) {
		throw new Error(
			`Missing required .env keys: ${missing.join(', ')}. Copy .env.example to .env and fill in your values.`
		);
	}

	return env;
}

export async function loadToolkitConfig(rootDir) {
	const configPath = join(rootDir, 'wp-toolkit.config.mjs');

	if (!existsSync(configPath)) {
		throw new Error(
			`Missing wp-toolkit.config.mjs in ${rootDir}. Copy wp-toolkit.config.example.mjs and customize it.`
		);
	}

	const module = await import(pathToFileURL(configPath).href);
	return module.default || module;
}
