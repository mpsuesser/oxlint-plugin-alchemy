import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

/**
 * Logical identifier of the v1 Alchemy stack constructor — the lowercase
 * `alchemy(...)` factory that was top-level awaited and then `finalize`d.
 *
 * @since 0.0.0
 */
const V1_STACK_CALLEE = 'alchemy';

/**
 * Flag `await alchemy(...)` — the v1 stack-creation pattern. v2 uses
 * `export default Alchemy.Stack("Name", { providers }, Effect.gen(...))`.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'no-v1-await-stack',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow the Alchemy v1 stack-creation pattern `await alchemy(...)` — use `Alchemy.Stack(...)` in v2'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			AwaitExpression: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'AwaitExpression'),
					Option.flatMap((aw) =>
						AST.narrow(aw.argument, 'CallExpression')
					),
					Option.flatMap(AST.calleeName),
					Option.filter((name) => name === V1_STACK_CALLEE),
					Option.match({
						onNone: () => Effect.void,
						onSome: () =>
							ctx.report(
								Diagnostic.make({
									node,
									message:
										'Alchemy v1 stack-creation pattern `await alchemy(...)` is not supported in v2. Replace with `export default Alchemy.Stack("Name", { providers: Cloudflare.providers() }, Effect.gen(function* () { ... }))` and drop `await app.finalize()`. (AL-1)'
								})
							)
					})
				)
		};
	}
});
