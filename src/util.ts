/**
 * Local AST helpers that complement `effect-oxlint`'s `AST` module.
 *
 * @since 0.0.0
 */

import * as Arr from 'effect/Array';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as P from 'effect/Predicate';

import type { ESTree } from 'effect-oxlint';
import { AST } from 'effect-oxlint';

/**
 * Extract the static key name from an `ObjectProperty` — handles both
 * identifier (`{ foo: ... }`) and string-literal (`{ "foo": ... }`)
 * keys. Returns `Option.none()` for computed, numeric, or private keys.
 *
 * @since 0.0.0
 */
export const propertyKeyName = (
	prop: ESTree.ObjectProperty
): Option.Option<string> =>
	prop.computed
		? Option.none()
		: pipe(
				AST.narrow(prop.key, 'Identifier'),
				Option.flatMap((node) =>
					P.hasProperty(node, 'name') && P.isString(node.name)
						? Option.some(node.name)
						: Option.none()
				),
				Option.orElse(() =>
					pipe(
						AST.narrow(prop.key, 'Literal'),
						Option.flatMap((lit) =>
							P.hasProperty(lit, 'value') && P.isString(lit.value)
								? Option.some(lit.value)
								: Option.none()
						)
					)
				)
			);

/**
 * Predicate: does this `ObjectProperty`'s static key equal the given name?
 *
 * @since 0.0.0
 */
export const propertyHasKey =
	(name: string) =>
	(prop: ESTree.ObjectProperty): boolean =>
		pipe(
			propertyKeyName(prop),
			Option.exists((key) => key === name)
		);

/**
 * Find the first `ObjectProperty` in an `ObjectExpression` whose
 * static key equals the given name. Skips `SpreadElement`s.
 *
 * @since 0.0.0
 */
export const findProperty =
	(name: string) =>
	(node: ESTree.ObjectExpression): Option.Option<ESTree.ObjectProperty> =>
		pipe(
			node.properties,
			Arr.findFirst(
				(p): p is ESTree.ObjectProperty =>
					p.type === 'Property' && propertyHasKey(name)(p)
			)
		);

/**
 * Iterate the statically-keyed `ObjectProperty`s of an
 * `ObjectExpression`, pairing each with its decoded key name. Skips
 * spread elements and computed/non-string keys.
 *
 * @since 0.0.0
 */
export const namedProperties = (
	node: ESTree.ObjectExpression
): ReadonlyArray<readonly [name: string, property: ESTree.ObjectProperty]> =>
	pipe(
		node.properties,
		Arr.map((p) =>
			p.type !== 'Property'
				? Option.none<readonly [string, ESTree.ObjectProperty]>()
				: pipe(
						propertyKeyName(p),
						Option.map((name) => [name, p] as const)
					)
		),
		Arr.getSomes
	);

/**
 * Predicate: is this expression `import.meta.path`? Detects the
 * canonical collocated-Worker `main:` value — a non-computed
 * `MemberExpression` whose object is the `import.meta`
 * `MetaProperty` and whose property is the identifier `path`.
 *
 * @since 0.0.0
 */
export const isImportMetaPath = (node: ESTree.Node): boolean =>
	pipe(
		AST.narrow(node, 'MemberExpression'),
		Option.filter((m) => !m.computed),
		Option.flatMap((m) =>
			pipe(
				AST.narrow(m.property, 'Identifier'),
				Option.filter(
					(id) => P.hasProperty(id, 'name') && id.name === 'path'
				),
				Option.flatMap(() => AST.narrow(m.object, 'MetaProperty'))
			)
		),
		Option.isSome
	);
