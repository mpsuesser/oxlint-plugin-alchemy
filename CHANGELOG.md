# Changelog

## Unreleased

## 0.2.1 — JSR score improvements

### Changed

- Removed JSR slow-type diagnostics by giving each rule module an explicit `CreateRule` export boundary.
- Documented the default plugin export for generated JSR symbol docs.
- Updated the JSR publish workflow to publish with provenance without `--allow-slow-types`.

## 0.2.0 — Generated config presets

### Changed

- Published package exports now point at built `dist/` files instead of raw TypeScript source, so oxlint can load the plugin from `node_modules` without Node type-stripping failures.
- Added a generated `configs.recommended` config for `oxlint.config.ts`; importing the plugin and extending this config now registers the JS plugin and enables all 14 rules at `error` severity.
- Replaced the old native-plugin-style `plugins` / `categories.recommended` documentation with oxlint JS plugin configuration using `jsPlugins` and explicit rule IDs.
- Updated to `effect-oxlint@0.3.0`, Effect `4.0.0-beta.70`, Bun `1.3.14`, and current supporting tool versions.

## 0.1.0

Initial release.

14 rules covering Alchemy v2 idioms:

- **v1 → v2 migration footguns**
    - `no-v1-await-stack` — flag `await alchemy(...)` (AL-1)
    - `no-v1-finalize` — flag `app.finalize()` (AL-2)
    - `no-v1-await-resource` — flag `await Cloudflare.R2Bucket(...)` etc. (AL-3)
    - `no-v1-import-paths` — flag lowercase `alchemy/<subpath>` imports (AL-4)
    - `no-v1-entrypoint-prop` — flag legacy `entrypoint:` (now `main:`) (AL-5)
    - `no-shouty-binding-keys` — flag `BUCKET:`-style binding keys (AL-6)
- **v2 conventions**
    - `require-stable-logical-id` — require string-literal logical IDs (AL-7)
    - `prefer-namespace-imports` — require `import * as Cloudflare from 'alchemy/Cloudflare'` (AL-8)
    - `bind-in-init-only` — no `Resource.bind(...)` inside `fetch:` (AL-9)
    - `no-shadowing-global-worker` — no local `class Worker` / `function Worker` (AL-10)
- **Output safety**
    - `no-string-concat-output` — no `+` / template-literal concat of Outputs (AL-11)
    - `no-console-log-output` — no `console.*` calls on Output-shaped values (AL-12)
- **File structure**
    - `stack-in-alchemy-run-file` — `Alchemy.Stack(...)` must live in `alchemy.run.ts(x)` (AL-13)
    - `platform-main-import-meta-path-when-collocated` — collocated Worker/Container must use `main: import.meta.path` (AL-14)
