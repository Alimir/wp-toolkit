/**
 * Copy this file to your plugin root as wp-toolkit.config.mjs and customize it.
 *
 * @type {import('@alimir/wp-toolkit').ToolkitConfig}
 */
export default {
	// Required — used for build folder name, zip file, and deploy paths.
	slug: 'my-plugin',
	mainFile: 'my-plugin.php',
	textDomain: 'my-plugin',

	// Single JS bundle (use jsBundles instead when you have front-end + admin scripts).
	jsSources: [
		'assets/js/src/helpers.js',
		'assets/js/src/app.js',
	],

	sassEntries: {
		'assets/css/my-plugin.css': 'assets/sass/my-plugin.scss',
		'admin/assets/css/admin.css': 'admin/assets/sass/admin.scss',
	},

	js: {
		output: 'assets/js/my-plugin.js',
		minOutput: 'assets/js/my-plugin.min.js',
	},

	css: {
		// Keep unminified copies alongside .min.css (useful for debugging).
		minifySeparate: ['assets/css/my-plugin.css'],
	},

	// Source files removed from the production zip after build.
	devOnlyFiles: ['assets/js/my-plugin.js', 'assets/css/my-plugin.css'],

	// Source directories and dev files — add every path that must not ship in production.
	excludes: [
		'assets/sass',
		'admin/assets/sass',
		'assets/js/src',
		'admin/assets/js/src',
		'wp-toolkit.config.mjs',
		'webpack.config.js',
		'src',
	],

	// Preprocess flags for /* @if PRO */ ... /* @endif */ blocks in PHP/CSS.
	preprocess: {
		DEV: false,
		TODO: false,
		PRO: true,
	},

	// Rsync deploy targets — credentials live in .env (see .env.example).
	deploy: {
		prod: { envPrefix: 'DEPLOY_PROD' },
		staging: { envPrefix: 'DEPLOY_STAGING' },
	},

	// WordPress.org SVN publish. Set enabled: false for commercial / private plugins.
	release: {
		enabled: true,
		wpAssets: 'wp-assets',
		svnUrl: 'https://plugins.svn.wordpress.org/my-plugin',
	},

	i18n: {
		domain: 'my-plugin',
		potFile: 'languages/my-plugin.pot',
		exclude: 'build,node_modules,vendor',
		headers: {
			'Report-Msgid-Bugs-To': 'https://example.com/support',
			'Language-Team': 'My Plugin Team <hello@example.com>',
		},
	},

	// Optional — dev mode derives watch dirs from sassEntries and jsSources/jsBundles automatically.
	watch: {
		scss: ['assets/sass/**/*.scss', 'admin/assets/sass/**/*.scss'],
		js: ['assets/js/src/**/*.js', 'admin/assets/js/src/**/*.js'],
	},

	// Optional — custom zip name and version file (disabled by default).
	// build: {
	// 	zipName: '{slug}.{version}.zip',
	// 	versionFile: {
	// 		enabled: true,
	// 		includeInZip: true,
	// 		writeToBuildDir: false,
	// 		name: '{slug}-{version}.txt',
	// 		content: '"{title}" latest version: {versionLabel}\n',
	// 	},
	// },
	//
	// Optional — named alternate builds with string replacements.
	// variants: {
	// 	regional: {
	// 		zipSuffix: '-regional',
	// 		deploy: 'staging',
	// 		replacements: [{ from: 'example.com', to: 'example.local' }],
	// 		files: ['**/*.php'],
	// 	},
	// },

	validation: {
		forbidden: [
			'.env',
			'.DS_Store',
			'package.json',
			'node_modules',
			'assets/js/src',
			'admin/assets/js/src',
			'assets/sass',
			'admin/assets/sass',
		],
	},
};
