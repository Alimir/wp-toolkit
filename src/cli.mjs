import { initContext } from './context.mjs';
import { buildProject } from './build.mjs';
import { buildCss } from './build-css.mjs';
import { buildJs } from './build-js.mjs';
import { watchProject } from './dev.mjs';
import { deployProject } from './deploy.mjs';
import { makePot } from './i18n.mjs';
import { makeJson } from './i18n-json.mjs';
import { releaseProject } from './wp-deploy.mjs';

const HELP = `wp-toolkit — WordPress plugin build and deploy toolkit

Usage:
  wp-toolkit <command> [options]

Commands:
  build           Build production bundle and zip
  build:js        Compile and minify JavaScript only
  build:css       Compile and minify CSS only
  dev             Watch and rebuild assets
  deploy [name]   Rsync build/ to a configured server (default: prod)
  product [name]  Build then deploy (default: prod)
  release         Build then publish to WordPress.org SVN
  i18n            Generate POT translation file
  i18n:json       Generate JSON files from PO translations

Examples:
  wp-toolkit build
  wp-toolkit dev
  wp-toolkit product prod
  WP_RELEASE_DRY_RUN=1 wp-toolkit release

Configuration:
  wp-toolkit.config.mjs   Plugin-specific settings
  .env                    Deploy hosts and SVN credentials
`;

export async function runCli(argv) {
	const [command, ...args] = argv;

	if (!command || command === '--help' || command === '-h') {
		console.log(HELP);
		return;
	}

	await initContext(process.cwd());

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
			await deployProject(args[0] || 'prod');
			break;
		case 'product':
			await buildProject();
			await deployProject(args[0] || 'prod');
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
