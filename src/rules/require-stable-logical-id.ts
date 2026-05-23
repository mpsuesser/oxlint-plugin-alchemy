import type { CreateRule } from '@oxlint/plugins';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isAlchemyResourcePath } from '../alchemy.ts';

/**
 * Guard for a `{ type: "Literal", value: string }` AST node — the
 * happy-path string-literal argument shape. AST nodes come from oxlint
 * and are never constructed by us, so we narrow with `AST.narrow` and
 * `P.hasProperty` + `P.isString` rather than introducing a domain
 * schema for a non-domain concept.
 *
 * @since 0.0.0
 */
const isStringLiteralNode = (node: ESTree.Node): boolean =>
	pipe(
		AST.narrow(node, 'Literal'),
		Option.filter(
			(lit) => P.hasProperty(lit, 'value') && P.isString(lit.value)
		),
		Option.isSome
	);

/**
 * Guard for a `{ type: "TemplateLiteral" }` AST node, used to give a
 * more pointed hint about stage-parameterized resource names.
 *
 * @since 0.0.0
 */
const isTemplateLiteralNode = (node: ESTree.Node): boolean =>
	Option.isSome(AST.narrow(node, 'TemplateLiteral'));

/**
 * Require Alchemy resource constructors to receive a *string literal*
 * as their first argument. The logical ID keys persisted state across
 * deploys — making it dynamic (template literal, variable, expression)
 * silently recreates or orphans the underlying cloud resource, which
 * can mean data loss on R2, D1, DynamoDB, etc.
 *
 * Stage-parameterized names belong in the resource *props* (via
 * `Stack.useSync`), never in the logical ID.
 *
 * @since 0.0.0
 */
const rule: CreateRule = Rule.define({
	name: 'require-stable-logical-id',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Alchemy resource constructors require a string literal as the first argument — the logical ID must be stable across deploys'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			CallExpression: (node: ESTree.Node) =>
				pipe(
					// 1. Narrow to CallExpression and pair with its callee path.
					AST.narrow(node, 'CallExpression'),
					Option.flatMap((call) =>
						pipe(
							AST.narrow(call.callee, 'MemberExpression'),
							Option.flatMap(AST.memberPath),
							Option.map((path) => ({ call, path }))
						)
					),
					// 2. Callee path looks like an Alchemy resource constructor.
					Option.filter(({ path }) => isAlchemyResourcePath(path)),
					// 3. Pair with the first argument when it is not a string literal.
					Option.flatMap(({ call, path }) =>
						pipe(
							Arr.head(call.arguments),
							Option.filter((arg) => !isStringLiteralNode(arg)),
							Option.map((firstArg) => ({ path, firstArg }))
						)
					),
					// 4. Emit the diagnostic with a template-literal-aware hint.
					Option.match({
						onNone: () => Effect.void,
						onSome: ({ path, firstArg }) =>
							ctx.report(
								Diagnostic.make({
									node: firstArg,
									message: `\`${Arr.join(path, '.')}\` requires a stable string literal as its first argument (the logical ID). Logical IDs key persisted state across deploys — a dynamic ID silently recreates or orphans the underlying cloud resource.${isTemplateLiteralNode(firstArg) ? ' Use `Stack.useSync(({ stage }) => ({ name: `${stage}-thing` }))` on the *props*, not the logical ID.' : ''} (AL-7)`
								})
							)
					})
				)
		};
	}
});

export default rule;
