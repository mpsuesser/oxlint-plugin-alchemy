import * as Arr from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';

import type { ESTree } from 'effect-oxlint';
import { AST, Diagnostic, Rule, RuleContext } from 'effect-oxlint';

import { isWorkerLikePlatform } from '../alchemy.ts';
import { findProperty, isImportMetaPath } from '../util.ts';

/**
 * The collocated-Worker props key whose canonical value is
 * `import.meta.path`.
 *
 * @since 0.0.0
 */
const MAIN_PROP = 'main';

/**
 * When a file `export default`s a Worker-like Platform constructor,
 * its `main:` should be `import.meta.path` — the canonical
 * collocated-Worker idiom that makes the file refactor-resilient
 * (move/rename without touching any path string).
 *
 * A hardcoded `"./src/worker.ts"` in a file that *is*
 * `./src/worker.ts` works today but breaks the moment the file moves.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'platform-main-import-meta-path-when-collocated',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'When a file `export default`s a Worker / Container constructor, `main:` should be `import.meta.path`'
	}),
	create: function* () {
		const ctx = yield* RuleContext;
		return {
			ExportDefaultDeclaration: (node: ESTree.Node) =>
				pipe(
					// 1. The default-exported expression must be a CallExpression
					//    whose callee is a Worker-like Platform member path.
					AST.narrow(node, 'ExportDefaultDeclaration'),
					Option.flatMap((decl) =>
						AST.narrow(decl.declaration, 'CallExpression')
					),
					Option.flatMap((call) =>
						pipe(
							AST.narrow(call.callee, 'MemberExpression'),
							Option.flatMap(AST.memberPath),
							Option.map((path) => ({ call, path }))
						)
					),
					Option.filter(({ path }) =>
						isWorkerLikePlatform(Arr.join(path, '.'))
					),
					// 2. Locate the `main:` property in any argument object.
					Option.flatMap(({ call }) =>
						pipe(
							call.arguments,
							Arr.map(AST.narrow('ObjectExpression')),
							Arr.getSomes,
							Arr.map(findProperty(MAIN_PROP)),
							Arr.getSomes,
							Arr.head
						)
					),
					// 3. Flag when the value is anything other than `import.meta.path`.
					Option.filter((prop) => !isImportMetaPath(prop.value)),
					Option.match({
						onNone: () => Effect.void,
						onSome: (prop) =>
							ctx.report(
								Diagnostic.make({
									node: prop.value,
									message:
										'A collocated Worker should set `main: import.meta.path` so the file can move/rename without manual path updates. Hardcoded paths break the moment the file is renamed. (AL-14)'
								})
							)
					})
				)
		};
	}
});
