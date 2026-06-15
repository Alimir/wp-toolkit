import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export function resolveTemplate(template, vars) {
	return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export function buildTemplateVars(context) {
	const { slug, pkg, meta } = context;

	return {
		slug,
		version: pkg.version,
		title: pkg.title || pkg.name,
		versionLabel: meta.version,
	};
}

export function resolveZipPath(rootDir, context, variantConfig = null) {
	const buildConfig = context.config.build || {};
	let zipName = buildConfig.zipName || '{slug}.zip';
	const vars = buildTemplateVars(context);

	if (variantConfig?.zipSuffix) {
		zipName = zipName.replace(/\.zip$/i, `${variantConfig.zipSuffix}.zip`);
	}

	return join(rootDir, 'build', resolveTemplate(zipName, vars));
}

function matchPattern(relativePath, pattern) {
	const normalized = relativePath.replace(/\\/g, '/');

	if (pattern.includes('**')) {
		const suffix = pattern.replace(/^\*\*\//, '').replace(/^\*\*/, '');

		if (suffix.startsWith('*.')) {
			return normalized.endsWith(suffix.slice(1));
		}

		return normalized.includes(suffix);
	}

	if (pattern.includes('*')) {
		const regex = new RegExp(
			`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`
		);
		return regex.test(normalized);
	}

	return normalized === pattern;
}

export function applyReplacements(buildPath, filePatterns, replacements, walkFiles) {
	if (!replacements?.length || !filePatterns?.length) {
		return;
	}

	const files = walkFiles(buildPath, () => true);

	for (const absoluteFile of files) {
		const relativePath = relative(buildPath, absoluteFile).replace(/\\/g, '/');

		if (!filePatterns.some((pattern) => matchPattern(relativePath, pattern))) {
			continue;
		}

		let content = readFileSync(absoluteFile, 'utf8');
		let changed = false;

		for (const { from, to } of replacements) {
			if (!content.includes(from)) {
				continue;
			}

			content = content.split(from).join(to);
			changed = true;
		}

		if (changed) {
			writeFileSync(absoluteFile, content, 'utf8');
			console.log(`Replaced strings in ${relativePath}`);
		}
	}
}
