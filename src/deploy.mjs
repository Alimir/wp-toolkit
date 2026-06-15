import { existsSync } from 'node:fs';
import { getContext } from './context.mjs';
import { resolveDeployPlan } from './deploy-helpers.mjs';
import { run } from './utils.mjs';

export async function deployProject(explicitTargetName = null) {
	const context = getContext();
	const plan = resolveDeployPlan(context, explicitTargetName);

	if (!existsSync(context.paths.buildPath)) {
		throw new Error(`Build directory not found at ${context.paths.buildPath}. Run "wp-toolkit build" first.`);
	}

	const rsyncArgs = [...plan.rsyncArgs];

	if (plan.target.port) {
		rsyncArgs.push('-e', `ssh -p ${plan.target.port}`);
	}

	rsyncArgs.push(`${context.paths.buildPath}/`, `${plan.target.host}:${plan.target.dest}`);

	await run('rsync', rsyncArgs);
	console.log(`Deployed to ${plan.targetName}.`);
}
