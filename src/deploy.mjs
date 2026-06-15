import { existsSync } from 'node:fs';
import { getContext } from './context.mjs';
import { requireEnv } from './load-env.mjs';
import { assertSafeDeployTarget } from './security.mjs';
import { run } from './utils.mjs';

export async function deployProject(targetName = 'prod') {
	const context = getContext();
	const deployConfig = context.config.deploy || {};
	const settings = deployConfig[targetName];

	if (!settings?.envPrefix) {
		const available = Object.keys(deployConfig).join(', ') || 'none';
		throw new Error(`Unknown deploy target "${targetName}". Available targets: ${available}`);
	}

	const env = requireEnv(context.paths.root, [
		`${settings.envPrefix}_HOST`,
		`${settings.envPrefix}_DEST`,
	]);

	const target = context.deployTargets[targetName];

	if (!target?.host || !target?.dest) {
		throw new Error(
			`Deploy target "${targetName}" is not configured. Copy .env.example to .env and set the required values.`
		);
	}

	assertSafeDeployTarget(target, targetName, context.slug);

	if (!existsSync(context.paths.buildPath)) {
		throw new Error(`Build directory not found at ${context.paths.buildPath}. Run "wp-toolkit build" first.`);
	}

	const rsyncArgs = ['-avz', '--delete-after'];

	if (target.port) {
		rsyncArgs.push('-e', `ssh -p ${target.port}`);
	}

	rsyncArgs.push(`${context.paths.buildPath}/`, `${target.host}:${target.dest}`);

	await run('rsync', rsyncArgs);
	console.log(`Deployed to ${targetName}.`);
}
