import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint';

/**
 * Canonical filename for an Alchemy v2 stack entry — `alchemy.run.ts`
 * or `alchemy.run.tsx`, matched at end of path.
 *
 * @since 0.0.0
 */
const StackFileName = Schema.String.check(
	Schema.isPattern(/(?:^|\/)alchemy\.run\.tsx?$/, {
		identifier: 'StackFileNameCheck',
		title: 'Alchemy stack entry filename',
		description:
			'A path ending in `alchemy.run.ts` or `alchemy.run.tsx`, with or without a directory prefix.'
	})
);

const isStackFileName = Schema.is(StackFileName);

/**
 * Require `export default Alchemy.Stack(...)` to live in a file named
 * `alchemy.run.ts(x)`. Standardizes where the deploy entry point lives
 * so the CLI, CI, and humans all know where to look.
 *
 * @since 0.0.0
 */
export default Rule.define({
	name: 'stack-in-alchemy-run-file',
	meta: Rule.meta({
		type: 'suggestion',
		description:
			'`export default Alchemy.Stack(...)` must live in a file named `alchemy.run.ts`'
	}),
	create: function* () {
		const ctx = yield* RuleContext;

		return yield* Visitor.filter(
			(filename) => !isStackFileName(filename),
			Visitor.on('ExportDefaultDeclaration', (node) =>
				pipe(
					AST.narrow(node.declaration, 'CallExpression'),
					Option.flatMap(AST.matchCallOf('Alchemy', 'Stack')),
					Option.match({
						onNone: () => Effect.void,
						onSome: () =>
							ctx.report(
								Diagnostic.make({
									node,
									message: `\`export default Alchemy.Stack(...)\` belongs in \`alchemy.run.ts\` — got \`${ctx.filename}\`. The CLI, CI workflows, and the docs all assume the stack entry point lives at that path. (AL-13)`
								})
							)
					})
				)
			)
		);
	}
});
