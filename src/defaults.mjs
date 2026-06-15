export const DEFAULT_EXCLUDES = [
	'.git',
	'.git*',
	'.env',
	'.env.*',
	'node_modules',
	'wp-toolkit.config.mjs',
	'package.json',
	'package-lock.json',
	'composer.json',
	'composer.lock',
	'readme.md',
	'README.md',
	'SUMMARY.md',
	'build',
	'.sass-cache',
	'dist',
	'wp-assets',
	'docs',
	'deploy.sh',
	'.DS_Store',
	'.*',
];

export const DEFAULT_FORBIDDEN_BUILD_ARTIFACTS = [
	'.env',
	'.DS_Store',
	'package.json',
	'node_modules',
];

export const DEFAULT_REQUIRED_BUILD_FILES = ['readme.txt', 'uninstall.php'];

export const DEFAULT_WATCH = {
	scss: [],
	js: [],
};
