# wp-toolkit

npm-based build and deploy toolkit for **any** WordPress plugin.

Compile SCSS and JavaScript, package a production zip, rsync to your server, and optionally publish to WordPress.org SVN — all driven by one config file in your plugin.

A modern, config-first alternative to Grunt.

## Who is this for?

- Plugin authors replacing Grunt / custom shell scripts
- Teams that want one standard workflow across multiple plugins
- Free plugins on WordPress.org **or** commercial / private plugins (SVN is optional)

## Install

In your WordPress plugin root:

```bash
npm install @alimir/wp-toolkit --save-dev
```

Package: [@alimir/wp-toolkit on npm](https://www.npmjs.com/package/@alimir/wp-toolkit)

While developing the toolkit itself, link it locally:

```bash
npm install /path/to/wp-toolkit --save-dev
```

## Quick start

**1. Create your plugin config** (this is where *your* paths and settings go):

```bash
cp node_modules/@alimir/wp-toolkit/wp-toolkit.config.example.mjs wp-toolkit.config.mjs
```

Edit `wp-toolkit.config.mjs` — set your slug, asset paths, deploy targets, and release options.

**2. Add environment variables** (secrets never go in the config file):

```bash
cp node_modules/@alimir/wp-toolkit/.env.example .env
```

**3. Add npm scripts** to your plugin `package.json`:

```json
{
  "scripts": {
    "build": "wp-toolkit build",
    "build:js": "wp-toolkit build:js",
    "build:css": "wp-toolkit build:css",
    "dev": "wp-toolkit dev",
    "i18n": "wp-toolkit i18n",
    "i18n:json": "wp-toolkit i18n:json",
    "product": "wp-toolkit product",
    "release": "wp-toolkit release"
  },
  "devDependencies": {
    "@alimir/wp-toolkit": "^1.1.3"
  }
}
```

**4. Build:**

```bash
npm run build
```

Output lands in `build/<your-slug>/` plus `build/<your-slug>.zip`.

## Commands

| Command | Description |
|---------|-------------|
| `wp-toolkit build` | Full production build + zip |
| `wp-toolkit build:js` | Compile and minify JavaScript only |
| `wp-toolkit build:css` | Compile SCSS and minify CSS only |
| `wp-toolkit dev` | Watch SCSS/JS and rebuild on change |
| `wp-toolkit deploy <name>` | Rsync `build/` to a configured server (default: `prod`) |
| `wp-toolkit product [name]` | Build, then deploy (default: `prod`) |
| `wp-toolkit release` | Build, then publish to WordPress.org SVN |
| `wp-toolkit i18n` | Generate `.pot` file (requires WP-CLI) |
| `wp-toolkit i18n:json` | Generate JSON from `.po` files |

### Release safety flags

```bash
WP_RELEASE_DRY_RUN=1 npm run release   # preview SVN changes, no commit
WP_RELEASE_YES=1 npm run release       # skip interactive confirmation
WP_RELEASE_MESSAGE="Release 1.2.0" npm run release
```

## Configuration

**All plugin-specific settings live in `wp-toolkit.config.mjs`** — not in wp-toolkit itself.

### Simple by default

Most plugins only need:

1. **Paths** — `slug`, `jsSources`, `sassEntries`, `excludes`
2. **One deploy target** or **WordPress.org release**
3. **npm scripts** — `build`, `dev`, `product` or `release`

You do **not** need variants, version files, or custom rsync unless you want them.

### Level 1 — Every plugin (start here)

```js
export default {
  slug: 'my-plugin',
  jsSources: ['assets/js/src/app.js'],
  sassEntries: {
    'assets/css/my-plugin.css': 'assets/sass/my-plugin.scss',
  },
  excludes: ['assets/sass', 'assets/js/src'],

  // Pick one:
  release: { enabled: true, svnUrl: 'https://plugins.svn.wordpress.org/my-plugin' }, // WP.org
  // deploy: { prod: { envPrefix: 'DEPLOY_PROD' } },                                  // commercial
};
```

```bash
npm run build      # → build/my-plugin.zip
npm run dev        # watch assets
npm run release    # WP.org only
npm run product    # deploy only
```

### Level 2 — Optional extras (only if you need them)

**Version in zip + versioned zip name** (commercial plugins):

```js
build: {
  zipName: '{slug}.{version}.zip',
  versionFile: { enabled: true, includeInZip: true },
},
```

**Deploy to multiple servers** — add a name, add matching `.env` vars:

```js
deploy: {
  prod: { envPrefix: 'DEPLOY_PROD' },
  staging: { envPrefix: 'DEPLOY_STAGING' },
},
```

```bash
wp-toolkit product staging
```

### Level 3 — Alternate builds (variants)

Use when you need a **second build** with different strings or zip name.  
**Deploy on a variant is optional** — omit it for build-only variants.

```js
variants: {
  regional: {
    zipSuffix: '-regional',
    replacements: [{ from: 'example.com', to: 'example.ir' }],
    files: ['**/*.php'],
    deploy: 'staging',   // optional — name from deploy.{name} above
  },
},
```

```bash
wp-toolkit build --variant regional
wp-toolkit product --variant regional   # build + deploy (uses variant.deploy)
```

Add custom npm scripts for convenience:

```json
"build:regional": "wp-toolkit build --variant regional",
"product:regional": "wp-toolkit product --variant regional"
```

### Config reference

| Option | Purpose |
|--------|---------|
| `slug` | Plugin folder name, zip name, deploy path |
| `jsSources` | JS files to concatenate (single bundle) |
| `jsBundles` | Multiple bundles (front-end + admin) — see below |
| `jsMinify` | Extra standalone minify targets |
| `sassEntries` | SCSS input → CSS output map |
| `css.minifySeparate` | Keep unminified `.css` alongside `.min.css` |
| `devOnlyFiles` | Source assets stripped from the production zip |
| `excludes` | Paths excluded from `build/` — include your `assets/sass`, `assets/js/src`, etc. |
| `validation.forbidden` | Source paths that must not appear in a release zip |
| `preprocess` | Flags for `/* @if PRO */` conditional blocks |
| `deploy` | Named rsync targets (`prod`, `staging`, …) |
| `release` | WordPress.org SVN settings (`enabled: false` to disable) |
| `i18n` | POT generation settings |
| `validation` | Files that must not appear in a release build |

### WordPress.org plugins

In `wp-toolkit.config.mjs`:

```js
release: {
  enabled: true,
  wpAssets: 'wp-assets',
  svnUrl: 'https://plugins.svn.wordpress.org/my-plugin',
},
```

In `.env`:

```
WP_SVN_USER=your-wordpress-org-username
WP_SVN_PASSWORD=your-application-password
WP_SVN_URL=https://plugins.svn.wordpress.org/my-plugin
```

Release behaviour:

- Sparse SVN checkout (fast; avoids flooding output with old tags)
- Blocks re-releasing the same version tag
- Asks you to type `yes` before committing

### Commercial / private plugins

```js
release: { enabled: false },
deploy: { prod: { envPrefix: 'DEPLOY_PROD' } },
```

```bash
npm run product
```

### Advanced (power users)

<details>
<summary>Multiple JS bundles, custom rsync, inline variant deploy</summary>

**Multiple JS bundles** — use `jsBundles` instead of `jsSources` when you have front-end + admin scripts.

**Custom rsync args** — add to any deploy target:

```js
deploy: {
  staging: {
    envPrefix: 'DEPLOY_STAGING',
    rsync: { args: ['-avzP', '--delete-after'] },
  },
},
```

**Variant deploy override** — only if you need different rsync per variant:

```js
variants: {
  regional: {
    deploy: { target: 'staging', rsync: { args: ['-avzP', '--delete-after'] } },
  },
},
```

</details>

## Environment variables

Copy `.env.example` to `.env` in your plugin root. Never commit `.env`.

| Variable | Used by |
|----------|---------|
| `DEPLOY_<NAME>_HOST` | Rsync SSH host |
| `DEPLOY_<NAME>_PORT` | SSH port (optional) |
| `DEPLOY_<NAME>_DEST` | Remote plugin directory (absolute path) |
| `WP_SVN_USER` | WordPress.org SVN username |
| `WP_SVN_PASSWORD` | WordPress.org application password |
| `WP_SVN_URL` | SVN repository URL |
| `WP_RELEASE_DRY_RUN` | Preview release without committing |
| `WP_RELEASE_YES` | Skip confirmation prompt |
| `WP_RELEASE_MESSAGE` | Custom SVN commit message |

## Requirements

- Node.js 18+
- `zip` and `rsync` on `PATH`
- `svn` — only for WordPress.org release
- `wp` (WP-CLI) — only for `i18n` commands
- Optional: `pngquant`, `jpegoptim` for image compression during build

## Project layout

```
your-plugin/
├── wp-toolkit.config.mjs   ← your plugin settings (commit this)
├── .env                    ← secrets (gitignored)
├── package.json
├── assets/
├── build/                  ← generated (gitignored)
└── node_modules/
```

## License

MIT
