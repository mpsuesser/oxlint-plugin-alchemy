import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isShoutySnakeCaseName, isWorkerLikePlatform } from '../alchemy.ts';
import { findProperty, namedProperties } from '../util.ts';

/**
 * The v2 props key under which Worker / Container bindings live.
 *
 * @since 0.0.0
 */
const BINDINGS_PROP = 'bindings';

/**
 * Ban SHOUTY_SNAKE_CASE keys inside a Worker / Container
 * `bindings: { ... }` object. v1 convention was
 * `bindings: { BUCKET: bucket }` — v2 uses
 * `bindings: { Bucket }` (PascalCase shorthand matching the resource
 * identifier), and `InferEnv` derives the typed shape from that
 * naming. A migrated codebase that keeps the old keys ends up with
 * mismatched `InferEnv` output and confusing autocomplete.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'no-shouty-binding-keys',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow SHOUTY_SNAKE_CASE binding keys in Worker / Container `bindings: { ... }` — v2 uses PascalCase shorthand'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) =>
				pipe(
					// 1. Worker-like Platform call.
					AST.narrow(node, 'CallExpression'),
					Option.flatMap((call) =>
						pipe(
							AST.narrow(call.callee, 'MemberExpression'),
							Option.flatMap(AST.memberPath),
							Option.map((path) => ({ call, path }))
						)
					),
					Option.filter(({ path }) =>
						isWorkerLikePlatform(Arr.join(path, '.'))
					),
					// 2. Locate the `bindings:` object literal among the arguments.
					Option.flatMap(({ call }) =>
						pipe(
							call.arguments,
							Arr.map(AST.narrow('ObjectExpression')),
							Arr.getSomes,
							Arr.map(findProperty(BINDINGS_PROP)),
							Arr.getSomes,
							Arr.head,
							Option.flatMap((prop) =>
								AST.narrow(prop.value, 'ObjectExpression')
							)
						)
					),
					// 3. Emit one diagnostic per SHOUTY-keyed binding entry.
					Option.match({
						onNone: () => Effect.void,
						onSome: (bindings) =>
							pipe(
								namedProperties(bindings),
								Arr.filter(([name]) =>
									isShoutySnakeCaseName(name)
								),
								Effect.forEach(
									([name, property]) =>
										ctx.report(
											Diagnostic.make({
												node: property.key,
												message: `v1 binding key \`${name}\` — v2 uses PascalCase shorthand matching the resource identifier (\`bindings: { Bucket }\` not \`bindings: { BUCKET: bucket }\`) so \`InferEnv\` can derive the typed shape. (AL-6)`
											})
										),
									{ concurrency: 1, discard: true }
								)
							)
					})
				)
		};
	}
});
