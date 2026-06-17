# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-17

### Breaking changes

- **New lifetime config structure.** Plugin settings must use `assets` and `build` sections. Top-level keys such as `jsSources`, `sassEntries`, `excludes`, `devOnlyFiles`, `preprocess`, `js`, and `css` are no longer read.
- **Explicit asset paths.** Every JavaScript bundle must declare `sources`, `output`, and `minOutput`. SCSS entries must be defined in `assets.css.sassEntries`. Nothing is inferred from `slug`.
- **Required identity fields.** `slug`, `mainFile`, and `textDomain` are required in `wp-toolkit.config.mjs`.
- **Required sections.** `assets` and `build` (with at least `build.excludes`) are required.
- **WordPress.org release is opt-in.** `release.enabled` must be `true` and `release.svnUrl` must be set to publish. Omitting `release` or setting `enabled: false` disables SVN release.
- **`i18n` is optional but strict.** When an `i18n` section is present, `domain` and `potFile` are required.

### Added

- Lifetime config layout: `assets.js.bundles`, `assets.css.sassEntries`, `build.excludes`, `build.hooks`, `build.preprocess`, and more.
- `build.hooks.preBuild` and `build.hooks.postBuild` — run shell commands or `{ command, args, cwd }` objects during `wp-toolkit build`.
- `validation.inheritExcludes` (default: `true`) — automatically treats `build.excludes` paths as forbidden in release zips.
- Strict config validation at startup with clear error messages for missing or invalid fields.
- Per-bundle minified asset checks in release validation (supports front-end + admin bundles).
- `src/config-normalize.mjs` — single source of truth for config parsing.

### Changed

- `wp-toolkit.config.example.mjs` rewritten to match the lifetime structure.
- README configuration docs updated with Level 1 / 2 / 3 examples and full config reference.
- Runtime context now exposes `context.assets` and `context.build` instead of flattened legacy fields.

### Migration from 1.x

1. Copy the new example config:

   ```bash
   cp node_modules/@alimir/wp-toolkit/wp-toolkit.config.example.mjs wp-toolkit.config.mjs
   ```

2. Map your old settings:

   | 1.x | 2.0 |
   |-----|-----|
   | `jsSources` + `js.output` / `js.minOutput` | `assets.js.bundles[]` with `sources`, `output`, `minOutput` |
   | `jsMinify` | `assets.js.minify` |
   | `sassEntries` | `assets.css.sassEntries` |
   | `css.minifySeparate` | `assets.css.minifySeparate` |
   | `excludes` | `build.excludes` |
   | `devOnlyFiles` | `build.devOnlyFiles` |
   | `preprocess` | `build.preprocess` |
   | `hooks` (top-level) | `build.hooks` |
   | `validation.forbidden` (duplicate of excludes) | Remove — use `build.excludes` + `validation.inheritExcludes` |

3. Example — before (1.x):

   ```js
   export default {
     slug: 'my-plugin',
     jsSources: ['assets/js/src/app.js'],
     sassEntries: { 'assets/css/my-plugin.css': 'assets/sass/my-plugin.scss' },
     excludes: ['assets/sass', 'assets/js/src'],
     release: { svnUrl: 'https://plugins.svn.wordpress.org/my-plugin' },
   };
   ```

4. Example — after (2.0):

   ```js
   export default {
     slug: 'my-plugin',
     mainFile: 'my-plugin.php',
     textDomain: 'my-plugin',

     assets: {
       js: {
         bundles: [
           {
             sources: ['assets/js/src/app.js'],
             output: 'assets/js/my-plugin.js',
             minOutput: 'assets/js/my-plugin.min.js',
           },
         ],
       },
       css: {
         sassEntries: {
           'assets/css/my-plugin.css': 'assets/sass/my-plugin.scss',
         },
       },
     },

     build: {
       excludes: ['assets/sass', 'assets/js/src'],
     },

     release: {
       enabled: true,
       svnUrl: 'https://plugins.svn.wordpress.org/my-plugin',
     },
   };
   ```

5. Update `package.json`:

   ```json
   "@alimir/wp-toolkit": "^2.0.0"
   ```

---

## [1.1.3] - 2025

### Changed

- Package references and docs pointed to npm distribution (`@alimir/wp-toolkit`).

---

## [1.1.0] - 2025

### Added

- npm publication setup (`publishConfig`, scoped package name).

---

## [1.0.0] - 2025

### Added

- Initial public release: SCSS/JS build, production zip, rsync deploy, WordPress.org SVN release.
- Build variants with string replacements and optional per-variant deploy.
- Configurable zip name and version file output.
- i18n commands (`wp-toolkit i18n`, `wp-toolkit i18n:json`) via WP-CLI.
- Deploy targets with `envPrefix` and `.env` credentials.
- Release safety: forbidden file checks, stable-tag validation, interactive SVN confirmation.

[2.0.0]: https://github.com/Alimir/wp-toolkit/compare/v1.1.3...v2.0.0
[1.1.3]: https://github.com/Alimir/wp-toolkit/compare/v1.1.0...v1.1.3
[1.1.0]: https://github.com/Alimir/wp-toolkit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Alimir/wp-toolkit/releases/tag/v1.0.0
