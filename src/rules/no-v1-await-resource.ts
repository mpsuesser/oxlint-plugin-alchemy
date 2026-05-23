import type { CreateRule } from '@oxlint/plugins';
import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isAlchemyResourcePath } from '../alchemy.ts';

/**
 * Ban `await Cloudflare.R2Bucket(...)`, `await AWS.Lambda.Function(...)`,
 * etc. In v1 every resource constructor returned a Promise; in v2 the
 * same call returns an Effect. Awaiting it kicks off no work, races no
 * deploy, and silently leaves an unfinalized Effect value being used as
 * if it were a resource handle.
 *
 * @since 0.0.0
 */
const rule: CreateRule = Rule.define({
	name: 'no-v1-await-resource',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow `await` on Alchemy resource constructors — v2 resources are Effects, use `yield*` inside a Stack generator'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			AwaitExpression: (node: ESTree.Node) =>
				pipe(
					// 1. Awaited argument must be a member-callee CallExpression.
					AST.narrow(node, 'AwaitExpression'),
					Option.flatMap((aw) =>
						AST.narrow(aw.argument, 'CallExpression')
					),
					Option.flatMap((call) =>
						AST.narrow(call.callee, 'MemberExpression')
					),
					Option.flatMap(AST.memberPath),
					// 2. Path looks like an Alchemy resource constructor.
					Option.filter(isAlchemyResourcePath),
					// 3. Emit.
					Option.match({
						onNone: () => Effect.void,
						onSome: (path) =>
							ctx.report(
								Diagnostic.make({
									node,
									message: `v1 \`await ${Arr.join(path, '.')}(...)\` is not supported in v2 — resources are Effects. Use \`yield* ${Arr.join(path, '.')}(...)\` inside an \`Alchemy.Stack\` / \`Effect.gen\` generator. (AL-3)`
								})
							)
					})
				)
		};
	}
});

export default rule;
