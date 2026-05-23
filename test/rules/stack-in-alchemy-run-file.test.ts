import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/stack-in-alchemy-run-file.ts';

const exportDefaultStack = () =>
	({
		type: 'ExportDefaultDeclaration',
		declaration: Testing.callOfMember('Alchemy', 'Stack', [
			Testing.strLiteral('MyApp')
		])
	}) as never;

const exportDefaultOther = () =>
	({
		type: 'ExportDefaultDeclaration',
		declaration: Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('Worker')
		])
	}) as never;

describe('stack-in-alchemy-run-file', () => {
	it('flags export default Alchemy.Stack(...) in /app/main.ts', () => {
		expect(
			Testing.runRule(
				rule,
				'ExportDefaultDeclaration',
				exportDefaultStack(),
				{ filename: '/app/main.ts' }
			)
		).toHaveLength(1);
	});

	it('flags export default Alchemy.Stack(...) in /app/deploy.ts', () => {
		expect(
			Testing.runRule(
				rule,
				'ExportDefaultDeclaration',
				exportDefaultStack(),
				{ filename: '/app/deploy.ts' }
			)
		).toHaveLength(1);
	});

	it('allows Alchemy.Stack(...) in /app/alchemy.run.ts', () => {
		expect(
			Testing.runRule(
				rule,
				'ExportDefaultDeclaration',
				exportDefaultStack(),
				{ filename: '/app/alchemy.run.ts' }
			)
		).toHaveLength(0);
	});

	it('allows Alchemy.Stack(...) in /app/alchemy.run.tsx', () => {
		expect(
			Testing.runRule(
				rule,
				'ExportDefaultDeclaration',
				exportDefaultStack(),
				{ filename: '/app/alchemy.run.tsx' }
			)
		).toHaveLength(0);
	});

	it('ignores other default exports like Cloudflare.Worker(...) regardless of filename', () => {
		expect(
			Testing.runRule(
				rule,
				'ExportDefaultDeclaration',
				exportDefaultOther(),
				{ filename: '/app/src/worker.ts' }
			)
		).toHaveLength(0);
	});
});
