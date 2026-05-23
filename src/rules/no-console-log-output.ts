import type { CreateRule } from '@oxlint/plugins';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isOutputPropertySuffix } from '../alchemy.ts';

/**
 * The `console` methods whose argument is rendered with `toString()`
 * — and therefore prints `[Output]` rather than the resolved value
 * when handed an `Output<string>`.
 *
 * @since 0.0.0
 */
const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

/**
 * Heuristic: does this expression *look* Output-shaped? Mirrors the
 * test in `no-string-concat-output` — a non-computed
 * `MemberExpression` whose property name ends in a known
 * Output-bearing suffix.
 *
 * @since 0.0.0
 */
const looksLikeOutput = (expr: ESTree.Node): boolean =>
	pipe(
		AST.narrow(expr, 'MemberExpression'),
		Option.filter((m) => !m.computed),
		Option.flatMap((m) => AST.narrow(m.property, 'Identifier')),
		Option.exists((id) => 'name' in id && isOutputPropertySuffix(id.name))
	);

/**
 * Warn on `console.<method>(<resource>.<output>)` — logging an
 * `Output<string>` produces `[Output]` rather than the resolved
 * value because the value is a lazy reference. Return outputs from
 * the Stack generator (`return { bucketName }`) — `alchemy deploy`
 * prints them after a successful deploy — or pipe through
 * `Output.map(...)` for in-handler observation.
 *
 * @since 0.0.0
 */
const rule: CreateRule = Rule.define({
	name: 'no-console-log-output',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Warn on `console.*` calls that interpolate Output-shaped values — Output is a lazy reference, console renders it as `[Output]`'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) =>
				pipe(
					// 1. `console.<method>(...)` call.
					AST.narrow(node, 'CallExpression'),
					Option.flatMap(AST.matchCallOf('console', CONSOLE_METHODS)),
					// 2. Any argument looks Output-shaped.
					Option.filter((call) =>
						Arr.some(call.arguments, looksLikeOutput)
					),
					Option.match({
						onNone: () => Effect.void,
						onSome: () =>
							ctx.report(
								Diagnostic.make({
									node,
									message:
										'`console.*` calls render `Output<string>` as `[Output]` — not the resolved value. Return outputs from your Stack generator (`return { bucketName }`) — `alchemy deploy` prints them after deploy. (AL-12)'
								})
							)
					})
				)
		};
	}
});

export default rule;
