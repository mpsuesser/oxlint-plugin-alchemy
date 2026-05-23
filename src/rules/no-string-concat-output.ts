import type { CreateRule } from '@oxlint/plugins';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isOutputPropertySuffix } from '../alchemy.ts';

/**
 * The diagnostic message body, shared between the template-literal
 * and `+`-concat branches.
 *
 * @since 0.0.0
 */
const MESSAGE =
	'This expression looks like it concatenates an `Output<string>` value. Use `` Output.interpolate`...` `` instead — concatenating an Output stringifies the lazy expression and produces garbage like `"[object Object]"` in deployed config. (AL-11)';

/**
 * Heuristic: does this expression *look* Output-shaped? A
 * `MemberExpression` whose property name ends in a known
 * Output-bearing suffix (e.g. `.bucketName`, `.databaseUrl`,
 * `.functionArn`) is *likely* an `Output<string>`. Conservative — we
 * prefer false negatives over false positives in the absence of type
 * info.
 *
 * @since 0.0.0
 */
const looksLikeOutput = (expr: ESTree.Node): boolean =>
	pipe(
		AST.narrow(expr, 'MemberExpression'),
		Option.filter((m) => !m.computed),
		Option.flatMap((m) => AST.narrow(m.property, 'Identifier')),
		Option.filter(
			(id) =>
				P.hasProperty(id, 'name') &&
				P.isString(id.name) &&
				isOutputPropertySuffix(id.name)
		),
		Option.isSome
	);

/**
 * Predicate: is this `TemplateLiteral` the body of an
 * `Output.interpolate` tagged template? When the parent is a
 * `TaggedTemplateExpression` whose tag is `Output.interpolate`,
 * concatenation is already correct and we exit early.
 *
 * @since 0.0.0
 */
const isInsideOutputInterpolate = (template: ESTree.TemplateLiteral): boolean =>
	pipe(
		Option.fromNullishOr(template.parent),
		Option.flatMap(AST.narrow('TaggedTemplateExpression')),
		Option.flatMap((tagged) => AST.narrow(tagged.tag, 'MemberExpression')),
		Option.flatMap((m) => AST.matchMember(m, 'Output', 'interpolate')),
		Option.isSome
	);

/**
 * Heuristically flag string-concatenation that interpolates a value
 * that *looks like* an `Output<string>`. Catches the two common
 * shapes: untagged template literals and `+`-style string concat.
 *
 * `Output.interpolate\`...\`` is exempt — its `TemplateLiteral`
 * child correctly wires the Output dependencies.
 *
 * @since 0.0.0
 */
const rule: CreateRule = Rule.define({
	name: 'no-string-concat-output',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow string concatenation that interpolates `Output`-shaped values — use `Output.interpolate` to preserve lazy evaluation'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			TemplateLiteral: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'TemplateLiteral'),
					Option.filter(
						(template) => !isInsideOutputInterpolate(template)
					),
					Option.filter((template) =>
						Arr.some(template.expressions, looksLikeOutput)
					),
					Option.match({
						onNone: () => Effect.void,
						onSome: () =>
							ctx.report(
								Diagnostic.make({ node, message: MESSAGE })
							)
					})
				),
			BinaryExpression: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'BinaryExpression'),
					Option.filter((b) => b.operator === '+'),
					Option.filter(
						(b) =>
							looksLikeOutput(b.left) || looksLikeOutput(b.right)
					),
					Option.match({
						onNone: () => Effect.void,
						onSome: () =>
							ctx.report(
								Diagnostic.make({ node, message: MESSAGE })
							)
					})
				)
		};
	}
});

export default rule;
