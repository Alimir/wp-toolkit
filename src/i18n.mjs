import { runWp } from './run-wp.mjs';
import { getContext } from './context.mjs';

export async function makePot() {
	const context = getContext();
	const { i18n } = context;

	if (!i18n) {
		throw new Error(
			'i18n is not configured. Add an i18n section to wp-toolkit.config.mjs with domain and potFile.'
		);
	}
	const headers = JSON.stringify({
		'Report-Msgid-Bugs-To': 'https://wordpress.org/support/plugin/' + context.slug,
		'Language-Team': `${context.pkg.title || context.slug} Team`,
		...i18n.headers,
	});

	const args = [
		'i18n',
		'make-pot',
		'.',
		i18n.potFile,
		`--domain=${i18n.domain}`,
		'--skip-audit',
		`--exclude=${i18n.exclude}`,
		`--headers=${headers}`,
	];

	if (i18n.skipJs) {
		args.push('--skip-js');
	}

	await runWp(args, {
		failureMessage: 'wp i18n make-pot failed',
		onSuccess() {
			console.log(`Updated ${i18n.potFile}`);
		},
	});
}
