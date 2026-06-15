/**
 * wp-toolkit.config.mjs — your plugin settings
 *
 * SIMPLE BY DEFAULT
 * - Set slug, asset paths, and excludes
 * - Add deploy OR release (not both required)
 * - Run: npm run build | dev | product | release
 *
 * OPTIONAL (only if you need them)
 * - build.zipName / build.versionFile — custom zip + version txt
 * - variants — alternate builds with replacements
 * - variant.deploy — link variant to a deploy target (optional)
 */
export default {
	slug: 'my-plugin',
	mainFile: 'my-plugin.php',
	textDomain: 'my-plugin',

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
		minifySeparate: ['assets/css/my-plugin.css'],
	},

	devOnlyFiles: ['assets/js/my-plugin.js', 'assets/css/my-plugin.css'],

	excludes: [
		'assets/sass',
		'admin/assets/sass',
		'assets/js/src',
		'admin/assets/js/src',
		'wp-toolkit.config.mjs',
	],

	preprocess: {
		DEV: false,
		TODO: false,
		PRO: true,
	},

	// Commercial: deploy to your server
	deploy: {
		prod: { envPrefix: 'DEPLOY_PROD' },
	},

	// WP.org: publish to SVN (set enabled: false for commercial plugins)
	release: {
		enabled: true,
		wpAssets: 'wp-assets',
		svnUrl: 'https://plugins.svn.wordpress.org/my-plugin',
	},

	i18n: {
		domain: 'my-plugin',
		potFile: 'languages/my-plugin.pot',
		exclude: 'build,node_modules,vendor',
	},

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

	// --- Optional extras (uncomment if needed) ---

	// build: {
	// 	zipName: '{slug}.{version}.zip',
	// 	versionFile: { enabled: true, includeInZip: true },
	// },

	// variants: {
	// 	regional: {
	// 		zipSuffix: '-regional',
	// 		replacements: [{ from: 'example.com', to: 'example.local' }],
	// 		files: ['**/*.php'],
	// 		deploy: 'staging',
	// 	},
	// },
};
