import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';
import * as Ref from 'effect/Ref';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

import { isAlchemyRoot } from '../alchemy.ts';

/**
 * The init-only method whose `.bind(...)` call must not appear inside
 * a Worker / Lambda per-request `fetch:` handler.
 *
 * @since 0.0.0
 */
const BIND_METHOD = 'bind';

/**
 * The Property key that scopes the per-request execution phase. Once
 * we enter a Property whose key is `fetch`, we are inside the exec
 * phase and `.bind(...)` is forbidden.
 *
 * @since 0.0.0
 */
const FETCH_HANDLER_KEY = 'fetch';

/**
 * Predicate: is the `key` of this `Property` an `Identifier` named
 * `fetch`? Accepts the union the `'Property'` visitor passes
 * (`BindingProperty | ObjectProperty | AssignmentTargetProperty`)
 * via the shared `.key` field. Destructuring-pattern variants will
 * trip the predicate too, but they emit no `fetch:`-keyed object
 * literal in practice — the false-positive surface is tiny.
 *
 * @since 0.0.0
 */
const isFetchHandlerProperty = (prop: { readonly key: ESTree.Node }): boolean =>
	pipe(
		AST.narrow(prop.key, 'Identifier'),
		Option.filter(
			(id) => P.hasProperty(id, 'name') && id.name === FETCH_HANDLER_KEY
		),
		Option.isSome
	);

/**
 * Predicate: does this `CallExpression` look like `<AlchemyRoot>.…
 * .bind(...)` — a resource `bind()` call rooted in a known Alchemy
 * namespace? This restriction prevents the rule from flagging
 * unrelated `.bind()` calls (e.g. `Function.prototype.bind`,
 * `EventTarget.prototype.removeEventListener.bind`).
 *
 * @since 0.0.0
 */
const isAlchemyResourceBindCall = (node: ESTree.CallExpression): boolean =>
	pipe(
		AST.narrow(node.callee, 'MemberExpression'),
		Option.flatMap(AST.memberPath),
		Option.exists(
			(path) =>
				isAlchemyRoot(Arr.headNonEmpty(path)) &&
				Arr.lastNonEmpty(path) === BIND_METHOD
		)
	);

/**
 * Disallow `Resource.bind(...)` inside a Worker / Lambda per-request
 * `fetch:` handler. The init/exec phase split is load-bearing in v2:
 * `Binding.Policy` only runs at plantime, `Binding.Service` ships in
 * the runtime bundle. Calling `.bind()` in the per-request handler
 * defeats the model and moves one-time SDK setup into the hot path of
 * every request.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'bind-in-init-only',
	meta: Rule.meta({
		type: 'problem',
		description:
			'Disallow `Resource.bind(...)` inside a Worker / Lambda per-request `fetch:` handler — bindings belong in the outer init Effect'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		const fetchHandlerDepth = yield* Ref.make(0);

		return Visitor.merge(
			// Track entries into / exits from `fetch:` property values.
			Visitor.tracked(
				'Property',
				isFetchHandlerProperty,
				fetchHandlerDepth
			),
			Visitor.on('CallExpression', (node) =>
				Effect.gen(function* () {
					if (!isAlchemyResourceBindCall(node)) return;
					const depth = yield* Ref.get(fetchHandlerDepth);
					if (depth === 0) return;
					yield* ctx.report(
						Diagnostic.make({
							node,
							message:
								'`.bind()` belongs in the outer init Effect, not inside the per-request `fetch:` handler. Bindings are set up once at plan-time — calling `.bind()` per-request defeats the init/exec phase split and pushes SDK setup into every request. (AL-9)'
						})
					);
				})
			)
		);
	}
});
