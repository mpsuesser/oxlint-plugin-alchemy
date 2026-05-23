import type { CreateRule } from '@oxlint/plugins';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

/**
 * The v1 finalization method — `app.finalize()` was the explicit
 * "flush the deploy" call at the end of every `alchemy.run.ts`.
 *
 * @since 0.0.0
 */
const FINALIZE_METHOD = 'finalize';

/**
 * Ban `<identifier>.finalize()` with zero arguments — the v1
 * lifecycle-flush call. v2's `Alchemy.Stack(...)` finalizes
 * automatically. A leftover call either crashes (no such method on
 * the new return type) or silently no-ops on stale typings.
 *
 * Constrained to bare-identifier receivers and zero arguments so the
 * heuristic stays surgical: unrelated `.finalize()` methods (e.g.
 * crypto APIs) typically take arguments and live on a deeper chain.
 *
 * @since 0.0.0
 */
const rule: CreateRule = Rule.define({
	name: 'no-v1-finalize',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow v1 `app.finalize()` calls — Alchemy.Stack finalizes automatically in v2'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) =>
				pipe(
					// 1. Narrow + require zero arguments.
					AST.narrow(node, 'CallExpression'),
					Option.filter((call) => call.arguments.length === 0),
					// 2. Callee is a bare `ident.finalize` member expression.
					Option.flatMap((call) =>
						AST.narrow(call.callee, 'MemberExpression')
					),
					Option.flatMap(AST.memberNames),
					Option.filter(([, prop]) => prop === FINALIZE_METHOD),
					// 3. Emit.
					Option.match({
						onNone: () => Effect.void,
						onSome: ([obj]) =>
							ctx.report(
								Diagnostic.make({
									node,
									message: `v1 \`${obj}.finalize()\` is not needed in v2 — \`Alchemy.Stack(...)\` finalizes automatically. Drop this line. (AL-2)`
								})
							)
					})
				)
		};
	}
});

export default rule;
