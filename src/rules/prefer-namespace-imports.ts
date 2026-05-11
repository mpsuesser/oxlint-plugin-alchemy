import * as Arr from 'effect/Array';
import * as Bool from 'effect/Boolean';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Str from 'effect/String';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

/**
 * Alchemy submodules that must be imported as namespaces. Each
 * canonical alias matches the subpath name verbatim — `import * as
 * Cloudflare from "alchemy/Cloudflare"`, etc. Every example in the v2
 * docs uses this form, and named imports break tree-shaking of the
 * (very large) provider modules.
 *
 * The root `"alchemy"` package and `"alchemy/Stack"` are intentionally
 * excluded — both legitimately serve named imports
 * (`import { Random } from "alchemy"`, `import { Stack } from "alchemy/Stack"`)
 * alongside namespace usage, and the docs themselves use both styles.
 *
 * @since 0.0.0
 */
const AlchemySubmodule = Schema.Literals([
	'Cloudflare',
	'AWS',
	'Axiom',
	'Output',
	'PlanetScale'
]);

type AlchemySubmodule = typeof AlchemySubmodule.Type;

const isAlchemySubmodule = Schema.is(AlchemySubmodule);

const ALCHEMY_PREFIX = 'alchemy/';

/**
 * Decode an import source string into the recognized submodule it
 * targets — or `Option.none()` if the source isn't an Alchemy submodule
 * we want to govern.
 *
 * @since 0.0.0
 */
const submoduleFromSource = (src: string): Option.Option<AlchemySubmodule> =>
	pipe(
		Option.some(src),
		Option.filter(Str.startsWith(ALCHEMY_PREFIX)),
		Option.map(Str.slice(ALCHEMY_PREFIX.length)),
		Option.filter(isAlchemySubmodule)
	);

/**
 * Predicate for value-level (non-`type`) named import specifiers.
 *
 * @since 0.0.0
 */
const isValueNamedSpecifier = (
	specifier: ESTree.ImportDeclarationSpecifier
): boolean =>
	specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type';

/**
 * Pull the local alias from an `ImportNamespaceSpecifier`, or
 * `Option.none()` for any other specifier type.
 *
 * @since 0.0.0
 */
const namespaceAlias = (
	specifier: ESTree.ImportDeclarationSpecifier
): Option.Option<string> =>
	specifier.type === 'ImportNamespaceSpecifier'
		? Option.some(specifier.local.name)
		: Option.none();

/**
 * Require namespace imports for Alchemy provider submodules so the
 * canonical `Cloudflare.R2Bucket(...)` / `AWS.Lambda.Function(...)` /
 * `` Output.interpolate`...` `` call shapes work and tree-shaking is
 * preserved.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'prefer-namespace-imports',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'Enforce namespace imports for Alchemy provider submodules (alchemy/Cloudflare, alchemy/AWS, alchemy/Output, ...)'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			ImportDeclaration: (node: ESTree.Node) =>
				pipe(
					AST.narrow(node, 'ImportDeclaration'),
					Option.filter((decl) => decl.importKind !== 'type'),
					Option.flatMap((decl) =>
						pipe(
							submoduleFromSource(decl.source.value),
							Option.map((submodule) => ({ decl, submodule }))
						)
					),
					Option.match({
						onNone: () => Effect.void,
						onSome: ({ decl, submodule }) =>
							Bool.match(
								Arr.some(
									decl.specifiers,
									isValueNamedSpecifier
								),
								{
									onTrue: () =>
										ctx.report(
											Diagnostic.make({
												node,
												message: `Use a namespace import for "${ALCHEMY_PREFIX}${submodule}": \`import * as ${submodule} from "${ALCHEMY_PREFIX}${submodule}"\`. Named imports from Alchemy provider submodules break the canonical \`${submodule}.Resource(...)\` call shape and bypass tree-shaking. (AL-8)`
											})
										),
									onFalse: () =>
										pipe(
											Arr.findFirst(
												decl.specifiers,
												namespaceAlias
											),
											Option.filter(
												(alias) => alias !== submodule
											),
											Option.match({
												onNone: () => Effect.void,
												onSome: (alias) =>
													ctx.report(
														Diagnostic.make({
															node,
															message: `Use the canonical alias \`${submodule}\` for "${ALCHEMY_PREFIX}${submodule}" — got \`${alias}\`. The Alchemy docs and JSDoc examples all assume \`${submodule}.Resource(...)\`. (AL-8)`
														})
													)
											})
										)
								}
							)
					})
				)
		};
	}
});
