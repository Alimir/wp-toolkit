import { loadToolkitConfig } from './load-env.mjs';

export function parseCliArgs(args) {
	const flags = {};
	const positionals = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--variant') {
			flags.variant = args[index + 1];

			if (!flags.variant) {
				throw new Error('Missing value for --variant.');
			}

			index += 1;
			continue;
		}

		positionals.push(arg);
	}

	if (!flags.variant && process.env.WP_BUILD_VARIANT) {
		flags.variant = process.env.WP_BUILD_VARIANT;
	}

	return { flags, positionals };
}

export async function resolveBuildVariant(command, args, rootDir = process.cwd()) {
	const { flags, positionals } = parseCliArgs(args);
	const config = await loadToolkitConfig(rootDir);
	const variantNames = Object.keys(config.variants || {});

	if (flags.variant) {
		return { variant: flags.variant, positionals, config };
	}

	if (command === 'build' && positionals[0] && variantNames.includes(positionals[0])) {
		return { variant: positionals[0], positionals: positionals.slice(1), config };
	}

	return { variant: null, positionals, config };
}

export function resolveDeployTarget(command, positionals, variantConfig) {
	if (command === 'product' && positionals[0]) {
		return positionals[0];
	}

	if (variantConfig?.deploy) {
		return variantConfig.deploy;
	}

	return 'prod';
}
