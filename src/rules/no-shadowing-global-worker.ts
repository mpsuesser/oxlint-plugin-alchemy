import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Schema from 'effect/Schema';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

/**
 * The Cloudflare Workers runtime is a Web-Worker-shaped environment
 * where `Worker` is a global constructor. A local binding called
 * `Worker` shadows it, and inside the Worker code the global is no
 * longer reachable. This is the literal identifier we forbid.
 *
 * @since 0.0.0
 */
const ShadowedGlobal = Schema.Literals(['Worker']);

const isShadowedGlobal = Schema.is(ShadowedGlobal);

/**
 * Predicate: does this declaration's `id` carry a name that shadows
 * a global we care about? Handles both the oxlint AST flavor where
 * `id.name` lives on `Identifier` and the `BindingIdentifier` flavor
 * used by class / function declarations.
 *
 * @since 0.0.0
 */
const idShadowsGlobal = (id: unknown): boolean =>
	P.isObject(id) &&
	P.hasProperty(id, 'name') &&
	P.isString(id.name) &&
	isShadowedGlobal(id.name);

/**
 * Warn when a local class or function declaration is named in a way
 * that shadows a Worker-runtime global. Specifically, `class Worker`
 * or `function Worker` collides with the global `Worker` constructor
 * inside any code that may execute in the Cloudflare Worker runtime.
 *
 * Named imports like `import { Worker } from "alchemy/Cloudflare"`
 * are already steered to namespace form by
 * `prefer-namespace-imports` (AL-8) — this rule complements that by
 * catching the rarer "user wrote their own class Worker" mistake.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'no-shadowing-global-worker',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Disallow local class / function declarations named `Worker` — the Cloudflare Workers runtime exposes `Worker` as a global'
	}),
	create: function* () {
		const ctx = yield* RuleContext;

		const reportShadow = (
			node: ESTree.Node,
			declaredKind: 'class' | 'function'
		) =>
			ctx.report(
				Diagnostic.make({
					node,
					message: `\`${declaredKind} Worker\` shadows the Cloudflare Workers runtime global \`Worker\`. Rename this declaration or use a namespace alias (e.g. \`import * as Cloudflare from "alchemy/Cloudflare"\`). (AL-10)`
				})
			);

		return {
			ClassDeclaration: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'ClassDeclaration'),
					Option.filter((decl) => idShadowsGlobal(decl.id)),
					Option.match({
						onNone: () => Effect.void,
						onSome: () => reportShadow(node, 'class')
					})
				),
			FunctionDeclaration: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'FunctionDeclaration'),
					Option.filter((decl) => idShadowsGlobal(decl.id)),
					Option.match({
						onNone: () => Effect.void,
						onSome: () => reportShadow(node, 'function')
					})
				)
		};
	}
});
