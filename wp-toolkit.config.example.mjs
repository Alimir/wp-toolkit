/**
 * wp-toolkit.config.mjs — lifetime plugin config
 *
 * Every path is explicit. Nothing is inferred from slug.
 *
 * Required sections:
 *   slug, mainFile, textDomain
 *   assets.js.bundles, assets.css.sassEntries  (use [] / {} when not needed)
 *   build.excludes
 */
export default {
	// ── Identity (required) ───────────────────────────────────
	slug: 'my-plugin',
	mainFile: 'my-plugin.php',
	textDomain: 'my-plugin',

	// ── Assets (required) ─────────────────────────────────────
	assets: {
		js: {
			bundles: [
				{
					sources: [
						'assets/js/src/helpers.js',
						'assets/js/src/app.js',
					],
					output: 'assets/js/my-plugin.js',
					minOutput: 'assets/js/my-plugin.min.js',
				},
			],
			minify: [],
		},
		css: {
			sassEntries: {
				'assets/css/my-plugin.css': 'assets/sass/my-plugin.scss',
			},
			minifySeparate: [],
		},
		watch: {
			scss: [],
			js: [],
		},
	},

	// ── Build output (required) ───────────────────────────────
	build: {
		excludes: [
			'assets/sass',
			'assets/js/src',
		],
		devOnlyFiles: [],
		preprocess: {
			DEV: false,
			TODO: false,
			PRO: true,
		},
		hooks: {
			preBuild: [],
			postBuild: [],
		},
		zipName: '{slug}.zip',
		// versionFile: { enabled: true, includeInZip: true },
	},

	// validation.inheritExcludes (default: true) adds build.excludes to release checks.

	// ── Delivery ──────────────────────────────────────────────
	// WordPress.org — set enabled: true and svnUrl:
	release: {
		enabled: true,
		wpAssets: 'wp-assets',
		svnUrl: 'https://plugins.svn.wordpress.org/my-plugin',
	},

	// Commercial / private — disable release and add deploy:
	// release: { enabled: false },
	// deploy: {
	// 	prod: { envPrefix: 'DEPLOY_PROD' },
	// },

	// ── Optional ──────────────────────────────────────────────
	i18n: {
		domain: 'my-plugin',
		potFile: 'languages/my-plugin.pot',
		exclude: 'build,node_modules,vendor',
	},

	// variants: {
	// 	regional: {
	// 		zipSuffix: '-regional',
	// 		replacements: [{ from: 'example.com', to: 'example.local' }],
	// 		files: ['**/*.php'],
	// 		deploy: 'staging',
	// 	},
	// },

	// ── Recipes (uncomment when needed) ───────────────────────

	// CSS-only plugin — no JavaScript bundles:
	// assets: { js: { bundles: [], minify: [] }, css: { sassEntries: { ... }, minifySeparate: [] } },

	// Second JS bundle (admin):
	// assets.js.bundles: [
	//   { sources: ['assets/js/src/app.js'], output: 'assets/js/my-plugin.js', minOutput: 'assets/js/my-plugin.min.js' },
	//   { sources: ['admin/assets/js/src/admin.js'], output: 'admin/assets/js/admin.js', minOutput: 'admin/assets/js/admin.min.js' },
	// ],

	// Ship .min.css only (keep unminified for local dev):
	// assets.css.minifySeparate: ['assets/css/my-plugin.css'],
	// build.devOnlyFiles: ['assets/css/my-plugin.css'],

	// Pre/post build hooks:
	// build.hooks.preBuild: ['npm run codegen'],

	// Multiple deploy targets:
	// deploy: {
	//   prod: { envPrefix: 'DEPLOY_PROD' },
	//   staging: { envPrefix: 'DEPLOY_STAGING' },
	// },
};
