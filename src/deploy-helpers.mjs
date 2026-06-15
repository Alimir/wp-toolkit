import { requireEnv } from './load-env.mjs';
import { assertSafeDeployTarget } from './security.mjs';

const DEFAULT_RSYNC_ARGS = ['-avz', '--delete-after'];

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

function normalizeVariantDeploy(variantDeploy) {
	if (!variantDeploy) {
		return null;
	}

	if (typeof variantDeploy === 'string') {
		return { target: variantDeploy };
	}

	return variantDeploy;
}

export function resolveDeployPlan(context, explicitTargetName = null) {
	const deployConfig = context.config.deploy || {};
	const variantDeploy = normalizeVariantDeploy(context.variantConfig?.deploy);
	let targetName = explicitTargetName || 'prod';

	if (!explicitTargetName && variantDeploy) {
		if (variantDeploy.target) {
			targetName = variantDeploy.target;
		} else if (variantDeploy.envPrefix) {
			targetName = context.buildVariant || 'variant';
		}
	}

	const namedSettings = deployConfig[targetName] || {};
	const envPrefix = variantDeploy?.envPrefix || namedSettings.envPrefix;

	if (!envPrefix) {
		const available = Object.keys(deployConfig).join(', ') || 'none';
		throw new Error(
			`Deploy target "${targetName}" is not configured. Available targets: ${available}. ` +
				'Set deploy.<name>.envPrefix in wp-toolkit.config.mjs or variant.deploy.envPrefix.'
		);
	}

	const env = requireEnv(context.paths.root, [`${envPrefix}_HOST`, `${envPrefix}_DEST`]);
	const target = targetFromEnv(env, envPrefix);

	if (!target.host || !target.dest) {
		throw new Error(
			`Deploy target "${targetName}" is missing credentials. Copy .env.example to .env and set ${envPrefix}_HOST and ${envPrefix}_DEST.`
		);
	}

	assertSafeDeployTarget(target, targetName, context.slug);

	const globalRsync = deployConfig.rsync || {};
	const targetRsync = namedSettings.rsync || {};
	const variantRsync = variantDeploy?.rsync || {};
	const rsyncArgs = variantRsync.args || targetRsync.args || globalRsync.args || DEFAULT_RSYNC_ARGS;

	return {
		targetName,
		target,
		rsyncArgs,
	};
}
