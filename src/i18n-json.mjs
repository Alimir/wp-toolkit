import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getContext } from './context.mjs';
import { runWp } from './run-wp.mjs';

export async function makeJson() {
	const context = getContext();
	const languagesDir = join(context.paths.root, 'languages');
	const poFiles = readdirSync(languagesDir).filter((file) => file.endsWith('.po'));

	if (!poFiles.length) {
		console.log('No .po files in languages/. Skipping JSON generation.');
		console.log('Add translation files or run: wp i18n make-json languages --no-purge');
		return;
	}

	await runWp(['i18n', 'make-json', 'languages', '--no-purge'], {
		failureMessage: 'wp i18n make-json failed',
		onSuccess(lines) {
			const createdLine = lines.find((line) => /Success: Created \d+ files?\.?/i.test(line));

			if (createdLine && /Created 0 files/i.test(createdLine)) {
				console.log('No JSON files created. Existing .po files may already be up to date.');
				return;
			}

			console.log('Updated JavaScript translation JSON files in languages/.');
		},
	});
}
