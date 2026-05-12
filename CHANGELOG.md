# Changelog

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
