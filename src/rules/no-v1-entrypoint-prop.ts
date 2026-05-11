import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isWorkerLikePlatform } from '../alchemy.ts';
import { findProperty } from '../util.ts';

/**
 * The v1 prop that v2 renamed. Passing `entrypoint:` in v2 is silently
 * ignored — depending on TS settings excess-property checks may not
 * fire, especially when the props object is spread or comes from a
 * variable. Result: deploy succeeds with the wrong bundle.
 *
 * @since 0.0.0
 */
const V1_ENTRYPOINT_PROP = 'entrypoint';

/**
 * Disallow `entrypoint:` in Worker-like Platform props — renamed to
 * `main:` in v2.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'no-v1-entrypoint-prop',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow `entrypoint:` in Worker / Container props — renamed to `main:` in v2'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) =>
				pipe(
					// 1. CallExpression whose callee is a Worker-like platform path.
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
					// 2. Search arguments for an ObjectExpression carrying `entrypoint:`.
					Option.flatMap(({ call }) =>
						pipe(
							call.arguments,
							Arr.map(AST.narrow('ObjectExpression')),
							Arr.getSomes,
							Arr.map(findProperty(V1_ENTRYPOINT_PROP)),
							Arr.getSomes,
							Arr.head
						)
					),
					// 3. Report on the property key for a precise span.
					Option.match({
						onNone: () => Effect.void,
						onSome: (prop) =>
							ctx.report(
								Diagnostic.make({
									node: prop.key,
									message: `\`entrypoint:\` was renamed to \`main:\` in Alchemy v2 — passing \`entrypoint\` is silently ignored and your deploy ships the wrong bundle. (AL-5)`
								})
							)
					})
				)
		};
	}
});
