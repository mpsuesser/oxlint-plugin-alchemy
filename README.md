# oxlint-plugin-alchemy

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Alchemy v2](https://v2.alchemy.run) that drives your IaC codebase toward idiomatic, safe, and maintainable resource definitions. Zero config — every rule is on by default.

## Installation

```sh
bun add -d oxlint-plugin-alchemy
```

Register the plugin in your oxlint config:

```jsonc
// oxlint.json
{
	"plugins": ["oxlint-plugin-alchemy"]
}
```

## Rules

All 14 rules ship on by default. Each diagnostic includes a short rule
code (`AL-N`) for easy scan-grepping.

### v1 → v2 migration footguns

| Rule                     | What it catches                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `no-v1-await-stack`      | `await alchemy("name", {})` — v2 uses `Alchemy.Stack(...)` (AL-1)                             |
| `no-v1-finalize`         | `app.finalize()` — `Alchemy.Stack` finalizes automatically (AL-2)                             |
| `no-v1-await-resource`   | `await Cloudflare.R2Bucket(...)` — resources are Effects, use `yield*` (AL-3)                 |
| `no-v1-import-paths`     | `import ... from "alchemy/cloudflare"` — v2 uses PascalCase subpaths (AL-4)                   |
| `no-v1-entrypoint-prop`  | `Worker("W", { entrypoint })` — renamed to `main:` in v2 (AL-5)                               |
| `no-shouty-binding-keys` | `bindings: { BUCKET: bucket }` — v2 uses PascalCase shorthand (`bindings: { Bucket }`) (AL-6) |

### Native v2 conventions

| Rule                         | What it catches                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `require-stable-logical-id`  | Dynamic logical IDs (`Cloudflare.R2Bucket(varName)`) — state keys must be string literals (AL-7) |
| `prefer-namespace-imports`   | Named or non-canonical imports from Alchemy provider subpaths (AL-8)                             |
| `bind-in-init-only`          | `Resource.bind(...)` inside a per-request `fetch:` handler — bindings belong in init (AL-9)      |
| `no-shadowing-global-worker` | `class Worker {}` / `function Worker() {}` — shadows the runtime global (AL-10)                  |

### Output safety

| Rule                      | What it catches                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `no-string-concat-output` | `` `${bucket.bucketName}/x` `` — Output is lazy, use `` Output.interpolate`...` `` (AL-11) |
| `no-console-log-output`   | `console.log(bucket.bucketName)` — Outputs render as `[Output]` (AL-12)                    |

### File structure

| Rule                                             | What it catches                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `stack-in-alchemy-run-file`                      | `export default Alchemy.Stack(...)` outside `alchemy.run.ts(x)` (AL-13)                        |
| `platform-main-import-meta-path-when-collocated` | Default-exported Worker/Container with hardcoded `main:` instead of `import.meta.path` (AL-14) |

## Writing your own rules

Rules are defined with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK. There are several helpers depending on the complexity of what you need.

**Ban a statement type** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banStatement('TryStatement', {
	message: '...'
});
```

**Ban a member access** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banMember('JSON', ['parse', 'stringify'], {
	message: '...'
});
```

**Ban an import** (one-liner):

```ts
import { Rule } from 'effect-oxlint';

export default Rule.banImport((s) => s === 'node:fs' || s === 'fs', {
	message: '...'
});
```

**Custom rule with full AST visitor** (for complex logic):

```ts
import type { ESTree } from 'effect-oxlint';
import * as Effect from 'effect/Effect';
import { Diagnostic, Rule, RuleContext } from 'effect-oxlint';

export default Rule.define({
	name: 'my-rule',
	meta: Rule.meta({
		type: 'suggestion',
		description: 'Describe what this rule does'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) => {
				return ctx.report(Diagnostic.make({ node, message: '...' }));
			}
		};
	}
});
```

See the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) repo for full SDK documentation.

## Development

```sh
bun install
bun test          # run the test suite
bun run check     # lint + format
bun run typecheck # type checking only
```

## License

MIT
