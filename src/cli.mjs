import { initContext } from './context.mjs';
import { buildProject } from './build.mjs';
import { buildCss } from './build-css.mjs';
import { buildJs } from './build-js.mjs';
import { watchProject } from './dev.mjs';
import { deployProject } from './deploy.mjs';
import { makePot } from './i18n.mjs';
import { makeJson } from './i18n-json.mjs';
import { releaseProject } from './wp-deploy.mjs';
import { resolveBuildVariant, resolveDeployTarget } from './cli-args.mjs';

const HELP = `wp-toolkit — WordPress plugin build and deploy toolkit

Usage:
  wp-toolkit <command> [options]

Commands:
  build [--variant <name>]   Build production bundle and zip
  build:js                   Compile and minify JavaScript only
  build:css                  Compile and minify CSS only
  dev                        Watch and rebuild assets
  deploy [name]              Rsync build/ to a configured server (default: prod)
  product [name] [--variant <name>]
                             Build then deploy (variant deploy is optional)
  release                    Build then publish to WordPress.org SVN
  i18n                       Generate POT translation file
  i18n:json                  Generate JSON files from PO translations

Options:
  --variant <name>           Use a named build variant from wp-toolkit.config.mjs
  WP_BUILD_VARIANT=<name>    Same as --variant (useful in npm scripts)

Examples:
  wp-toolkit build
  wp-toolkit build --variant regional
  wp-toolkit product prod_ir --variant regional
  WP_BUILD_VARIANT=regional wp-toolkit product
  WP_RELEASE_DRY_RUN=1 wp-toolkit release

Configuration:
  wp-toolkit.config.mjs      Plugin-specific settings
  .env                       Deploy hosts and SVN credentials
`;

export async function runCli(argv) {
	const [command, ...args] = argv;

	if (!command || command === '--help' || command === '-h') {
		console.log(HELP);
		return;
	}

	const buildCommands = new Set(['build', 'product', 'release']);
	const { variant, positionals } = buildCommands.has(command)
		? await resolveBuildVariant(command, args)
		: { variant: null, positionals: args };

	if (buildCommands.has(command)) {
		await initContext(process.cwd(), { variant });
	} else {
		await initContext(process.cwd());
	}

	switch (command) {
		case 'build':
			await buildProject();
			break;
		case 'build:js':
			await buildJs();
			break;
		case 'build:css':
			await buildCss();
			break;
		case 'dev':
			await watchProject();
			break;
		case 'deploy':
			await deployProject(positionals[0] || 'prod');
			break;
		case 'product':
			await buildProject();
			await deployProject(resolveDeployTarget(command, positionals));
			break;
		case 'release':
			await buildProject();
			await releaseProject();
			break;
		case 'i18n':
			await makePot();
			break;
		case 'i18n:json':
			await makeJson();
			break;
		default:
			throw new Error(`Unknown command "${command}". Run "wp-toolkit --help" for usage.`);
	}
}
