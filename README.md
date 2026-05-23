# oxlint-plugin-alchemy

[![npm](https://img.shields.io/npm/v/@mpsuesser/oxlint-plugin-alchemy)](https://www.npmjs.com/package/@mpsuesser/oxlint-plugin-alchemy)
[![JSR](https://jsr.io/badges/@mpsuesser/oxlint-plugin-alchemy)](https://jsr.io/@mpsuesser/oxlint-plugin-alchemy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

An opinionated [oxlint](https://oxc.rs/docs/guide/usage/linter) plugin for [Alchemy v2](https://v2.alchemy.run) that drives your IaC codebase toward idiomatic, safe, and maintainable resource definitions — v1→v2 migration footguns, Cloudflare conventions, Output-safety, and file-structure expectations encoded as lint rules.

The plugin ships **14 rules** (AL-1 through AL-14). Rules are implemented with the [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint) SDK and run as standard oxlint custom rules.

## Installation

```sh
npm install -D @mpsuesser/oxlint-plugin-alchemy
# or
bun add -D @mpsuesser/oxlint-plugin-alchemy
```

Use the generated recommended config from `oxlint.config.ts`:

```ts
import { defineConfig } from 'oxlint';
import alchemy from '@mpsuesser/oxlint-plugin-alchemy';

export default defineConfig({
	extends: [alchemy.configs.recommended]
});
```

`configs.recommended` registers the package through oxlint's `jsPlugins` field and enables all 14 rules at `error` severity.

To override an individual rule, add a `rules` entry after the `extends` block:

```ts
import { defineConfig } from 'oxlint';
import alchemy from '@mpsuesser/oxlint-plugin-alchemy';

export default defineConfig({
	extends: [alchemy.configs.recommended],
	rules: {
		'@mpsuesser/alchemy/no-console-log-output': 'off',
		'@mpsuesser/alchemy/no-v1-import-paths': 'warn'
	}
});
```

If you use `.oxlintrc.json`, oxlint cannot import a package config object. Configure the JS plugin and any rules you want explicitly:

```jsonc
{
	"jsPlugins": ["@mpsuesser/oxlint-plugin-alchemy"],
	"rules": {
		"@mpsuesser/alchemy/no-v1-import-paths": "error"
	}
}
```

Use `oxlint.config.ts` when you want the full generated recommended config.

## Rules at a glance

| Rule                                                                                                       | What it catches                                                        |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`no-v1-await-stack`](#al-1--no-v1-await-stack)                                                            | `await alchemy("name", {})` v1 stack-creation pattern                  |
| [`no-v1-finalize`](#al-2--no-v1-finalize)                                                                  | `app.finalize()` — v2 stacks finalize automatically                    |
| [`no-v1-await-resource`](#al-3--no-v1-await-resource)                                                      | `await Cloudflare.R2Bucket(...)` — resources are Effects, use `yield*` |
| [`no-v1-import-paths`](#al-4--no-v1-import-paths)                                                          | `from "alchemy/cloudflare"` (lowercase) — v2 uses PascalCase subpaths  |
| [`no-v1-entrypoint-prop`](#al-5--no-v1-entrypoint-prop)                                                    | `Worker("W", { entrypoint })` — renamed to `main:` in v2               |
| [`no-shouty-binding-keys`](#al-6--no-shouty-binding-keys)                                                  | `bindings: { BUCKET: bucket }` — v2 uses PascalCase shorthand          |
| [`require-stable-logical-id`](#al-7--require-stable-logical-id)                                            | Dynamic logical IDs — state keys must be string literals               |
| [`prefer-namespace-imports`](#al-8--prefer-namespace-imports)                                              | Named or non-canonical imports from Alchemy provider subpaths          |
| [`bind-in-init-only`](#al-9--bind-in-init-only)                                                            | `Resource.bind(...)` inside a per-request `fetch:` handler             |
| [`no-shadowing-global-worker`](#al-10--no-shadowing-global-worker)                                         | `class Worker {}` / `function Worker() {}`                             |
| [`no-string-concat-output`](#al-11--no-string-concat-output)                                               | `+` / template-literal concat of `Output`-shaped values                |
| [`no-console-log-output`](#al-12--no-console-log-output)                                                   | `console.*` calls passed `Output`-shaped values                        |
| [`stack-in-alchemy-run-file`](#al-13--stack-in-alchemy-run-file)                                           | `export default Alchemy.Stack(...)` outside `alchemy.run.ts(x)`        |
| [`platform-main-import-meta-path-when-collocated`](#al-14--platform-main-import-meta-path-when-collocated) | Default-exported Worker/Container with a hardcoded `main:` path        |

---

## AL-1 · `no-v1-await-stack`

`await alchemy(...)` was the v1 stack-creation pattern. v2 stacks are pure Effects — declared with `Alchemy.Stack(...)`, finalized automatically, and run by the CLI.

```ts
// ❌  v1 stack pattern
const app = await alchemy('my-app', { stage: 'dev' });
const bucket = await Cloudflare.R2Bucket('Bucket');
await app.finalize();

// ✅  v2 stack pattern
export default Alchemy.Stack(
	'my-app',
	{ providers: Cloudflare.providers() },
	Effect.gen(function* () {
		const Bucket = yield* Cloudflare.R2Bucket('Bucket');
		return { Bucket };
	})
);
```

## AL-2 · `no-v1-finalize`

v2's `Alchemy.Stack(...)` finalizes automatically. A leftover `app.finalize()` either throws (the method no longer exists on the v2 return type) or silently no-ops on stale typings.

```ts
// ❌
await app.finalize();
stack.finalize();

// ✅
export default Alchemy.Stack('App', { providers }, Effect.gen(function* () { ... }));
```

The rule is intentionally narrow: zero-argument `.finalize()` on a bare-identifier receiver. Unrelated APIs like `crypto.subtle.finalize(arg)` (deep chain, takes args) are not flagged.

## AL-3 · `no-v1-await-resource`

In v2, resource constructors are Effects, not Promises. They're consumed with `yield*` inside the Stack generator.

```ts
// ❌
const bucket = await Cloudflare.R2Bucket('Bucket');
const queue = await AWS.SQS.Queue('Jobs', { fifoQueue: true });
const fn = await AWS.Lambda.Function('Api', { main: './api.ts' });
const token = await Alchemy.Random('Token');

// ✅
const Bucket = yield * Cloudflare.R2Bucket('Bucket');
const Queue = yield * AWS.SQS.Queue('Jobs', { fifoQueue: true });
const Fn = yield * AWS.Lambda.Function('Api', { main: './api.ts' });
const Token = yield * Alchemy.Random('Token');
```

"Resource constructor" is detected heuristically: a member chain rooted in an Alchemy provider namespace (`Cloudflare`, `AWS`, `Alchemy`, `PlanetScale`, …) that ends in a PascalCase identifier. `await Cloudflare.providers()` (lowercase final segment) and `await myLib.helper()` (non-Alchemy root) are not flagged.

## AL-4 · `no-v1-import-paths`

v1 imports used lowercase subpaths (`alchemy/cloudflare`). v2 uses PascalCase subpaths matching the namespace identifier.

```ts
// ❌
import * as Cloudflare from 'alchemy/cloudflare';
import * as AWS from 'alchemy/aws';
import { R2Bucket } from 'alchemy/cloudflare/r2';

// ✅
import * as Cloudflare from 'alchemy/Cloudflare';
import * as AWS from 'alchemy/AWS';
```

The root `'alchemy'` package and PascalCase subpaths (`'alchemy/Cloudflare'`, `'alchemy/AWS'`, …) are unaffected. Unrelated packages are ignored entirely.

## AL-5 · `no-v1-entrypoint-prop`

`Worker` and `Container` previously accepted an `entrypoint:` prop. v2 renamed it to `main:` — passing the old name is silently ignored and your deploy ships the wrong bundle.

```ts
// ❌
Cloudflare.Worker('Api', {
	entrypoint: './src/api.ts',
	bindings: { Bucket }
});
Cloudflare.Container('Sidecar', { entrypoint: './c.ts' });

// ✅
Cloudflare.Worker('Api', {
	main: './src/api.ts',
	bindings: { Bucket }
});
Cloudflare.Container('Sidecar', { main: './c.ts' });
```

Only fires for `Cloudflare.Worker(...)` / `Cloudflare.Container(...)` — non-platform constructors that happen to accept an `entrypoint` prop are unaffected.

## AL-6 · `no-shouty-binding-keys`

v1 used `SHOUTY_SNAKE_CASE` keys in `bindings: { ... }` to mirror Wrangler's env shape. v2 uses PascalCase shorthand matching the resource identifier so `InferEnv` can derive the typed env directly.

```ts
// ❌
Cloudflare.Worker('Api', {
	bindings: {
		BUCKET: bucket,
		KV: sessions,
		API_KEY: apiKey
	}
});

// ✅  Shorthand — the resource identifier doubles as the key.
Cloudflare.Worker('Api', {
	bindings: { Bucket, Sessions, ApiKey }
});
```

Only fires inside `Cloudflare.Worker(...)` / `Cloudflare.Container(...)` calls. Non-shouty keys (`bucketName`, `Bucket`) pass through.

## AL-7 · `require-stable-logical-id`

A resource's first argument is its **logical ID** — the state key that pins the resource across deploys. A dynamic ID silently recreates or orphans the underlying cloud resource on every run.

```ts
// ❌  Dynamic ID — state desyncs across deploys.
Cloudflare.R2Bucket(variableId);
Cloudflare.R2Bucket(`prefix-${stage}`);
AWS.SQS.Queue(jobName);
Alchemy.Stack(varName);

// ✅
Cloudflare.R2Bucket('Bucket');
AWS.SQS.Queue('Jobs', { fifoQueue: true });
Alchemy.Stack('app', { providers }, Effect.gen(function* () { ... }));
```

For per-deploy variation in a resource's _cloud-side_ name (not its logical ID), put the dynamic bit in the props with `Stack.useSync(({ stage }) => ({ name: `${stage}-thing` }))`. Method calls like `Cloudflare.R2Bucket.bind(Bucket)` and namespace helpers like `Cloudflare.providers()` are not flagged (final segment isn't PascalCase or is camelCase).

## AL-8 · `prefer-namespace-imports`

Alchemy's docs, JSDoc examples, and rule diagnostics all assume the namespace-import shape: `import * as Cloudflare from 'alchemy/Cloudflare'`, then `Cloudflare.Worker(...)`. Named imports or non-canonical aliases break that grep-ability.

```ts
// ❌  Named imports from a provider submodule.
import { R2Bucket, Worker } from 'alchemy/Cloudflare';

// ❌  Non-canonical alias.
import * as CF from 'alchemy/Cloudflare';

// ✅
import * as Cloudflare from 'alchemy/Cloudflare';
import * as AWS from 'alchemy/AWS';
import * as Output from 'alchemy/Output';
```

Type-only imports (`import type { ... }` and `import { type X }`) are exempt — TypeScript erases them and they don't affect the runtime shape. The root `'alchemy'` package and `'alchemy/Stack'` (service-tag pattern) are also unaffected.

## AL-9 · `bind-in-init-only`

Bindings are set up once at plan-time. Calling `Resource.bind(...)` inside a per-request `fetch:` handler defeats the init/exec phase split and pushes SDK setup into every request.

```ts
// ❌  bind() inside the request handler.
return Cloudflare.Worker('Api', {
	main: import.meta.path,
	bindings: { Bucket },
	fetch: (request, env) => {
		Cloudflare.R2Bucket.bind(Bucket);
		return new Response('ok');
	}
});

// ✅  bind() in the outer init Effect; fetch reads from env.
const Bucket = yield * Cloudflare.R2Bucket('Bucket');
Cloudflare.R2Bucket.bind(Bucket);
return Cloudflare.Worker('Api', {
	main: import.meta.path,
	bindings: { Bucket },
	fetch: (request, env) => env.Bucket.get('key')
});
```

The rule uses depth tracking over `fetch:` property boundaries — only `<Namespace>.<Resource>.bind(...)` calls _inside_ a `fetch:` handler are flagged. Unrelated `.bind(...)` calls (`handler.bind(this)`) are passed through.

## AL-10 · `no-shadowing-global-worker`

The Cloudflare Workers runtime exposes `Worker` as a global. A local `class Worker {}` or `function Worker() {}` declaration shadows it and breaks type inference on the runtime binding shape.

```ts
// ❌
class Worker {
	fetch(request: Request) { ... }
}

function Worker() {
	return new Response('ok');
}

// ✅  Rename, or use a namespace alias to refer to Alchemy's Worker.
class MyWorker { ... }
import * as Cloudflare from 'alchemy/Cloudflare';
Cloudflare.Worker('Api', { ... });
```

## AL-11 · `no-string-concat-output`

`Output<string>` is a lazy reference, not a string. Concatenating it with `+` or interpolating it in a plain template literal silently calls `.toString()` and produces garbage like `"[object Object]"` in deployed config.

```ts
// ❌
const url = 'https://' + bucket.bucketName + '.r2.dev';
const path = `${bucket.bucketName}/uploads`;
const dsn = `${db.databaseUrl}?sslmode=require`;

// ✅  Tagged template preserves the lazy expression.
const url = Output.interpolate`https://${bucket.bucketName}.r2.dev`;
const path = Output.interpolate`${bucket.bucketName}/uploads`;
```

"Output-shaped" is detected via property-name heuristics: member accesses whose final segment ends in `Name`, `Url`, `Arn`, `Id`, `Endpoint`, `Host`, `Region`, `Port`, or `Key`. Plain-string concatenation (`'a' + 'b'`) and non-`+` operators (`count - 1`) are not flagged.

## AL-12 · `no-console-log-output`

`console.*` renders `Output<string>` as `[Output]` — not the resolved value. Return Outputs from your Stack generator so `alchemy deploy` can print the resolved values after the run.

```ts
// ❌
console.log(bucket.bucketName);
console.error('failed for url:', db.databaseUrl);
console.info(`queue: ${queue.queueArn}`);

// ✅  Return outputs from the stack; alchemy resolves and prints them.
export default Alchemy.Stack(
	'app',
	{ providers },
	Effect.gen(function* () {
		const Bucket = yield* Cloudflare.R2Bucket('Bucket');
		return { bucketName: Bucket.bucketName };
	})
);
```

Uses the same Output-shape heuristic as AL-11. Non-`console` receivers (`logger.log(...)`), bare identifiers, and non-Output properties (`item.count`) are not flagged.

## AL-13 · `stack-in-alchemy-run-file`

`Alchemy.Stack(...)` is the stack entry point. The CLI, CI workflows, and the docs all assume it lives at `alchemy.run.ts` (or `.tsx`). Stacks default-exported from anywhere else won't be picked up.

```ts
// ❌  src/main.ts
export default Alchemy.Stack('app', { providers }, Effect.gen(function* () { ... }));

// ❌  app/deploy.ts
export default Alchemy.Stack('app', ...);

// ✅  alchemy.run.ts
export default Alchemy.Stack('app', { providers }, Effect.gen(function* () { ... }));
```

The rule gates its visitor on the filename, so files not ending in `alchemy.run.ts(x)` skip the check entirely. Default-exported resource constructors (`export default Cloudflare.Worker(...)`) are unaffected — they're the subject of AL-14.

## AL-14 · `platform-main-import-meta-path-when-collocated`

When a file `export default`s a `Cloudflare.Worker(...)` or `Cloudflare.Container(...)`, `main:` should be `import.meta.path` so the file can move or rename without manual path updates.

```ts
// ❌  src/api.ts
export default Cloudflare.Worker('Api', {
	main: './src/api.ts', // ← hardcoded path
	bindings: { Bucket }
});

// ✅  src/api.ts
export default Cloudflare.Worker('Api', {
	main: import.meta.path,
	bindings: { Bucket }
});
```

Only fires for default-exported `Cloudflare.Worker(...)` / `Cloudflare.Container(...)` calls. Worker definitions referenced elsewhere (passed as a value, registered in a stack) are unaffected. Calls without a `main:` prop at all are also unaffected — there's nothing to constrain.

---

## Suppression

All rules respect oxlint's standard disable directives:

```ts
// oxlint-disable-next-line @mpsuesser/alchemy/<rule-name> -- reason

/* oxlint-disable @mpsuesser/alchemy/<rule-name> -- reason */
// ... block ...
/* oxlint-enable @mpsuesser/alchemy/<rule-name> */
```

A trailing `-- <reason>` comment is encouraged for any suppression that lives longer than a single PR review.

## Development

```sh
bun install
bun test          # run the test suite (98 tests across 14 rules)
bun run typecheck # tsgo
bun run check     # format + lint
```

Each rule lives in `src/rules/<rule-name>.ts` with a sibling test in `test/rules/<rule-name>.test.ts`. The rule SDK is documented at [`effect-oxlint`](https://github.com/mpsuesser/effect-oxlint).

## License

MIT
