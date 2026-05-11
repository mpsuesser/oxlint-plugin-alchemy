import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/prefer-namespace-imports.ts';

describe('prefer-namespace-imports', () => {
	it('flags named imports from alchemy/Cloudflare', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Cloudflare', [
			Testing.importSpecifier('R2Bucket')
		]);
		const results = Testing.runRule(rule, 'ImportDeclaration', node);
		expect(results).toHaveLength(1);
		expect(results[0]?.diagnostic.message).toContain(
			'import * as Cloudflare from "alchemy/Cloudflare"'
		);
	});

	it('flags named imports from alchemy/AWS', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/AWS', [
			Testing.importSpecifier('SQS')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			1
		);
	});

	it('flags named imports from alchemy/Output', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Output', [
			Testing.importSpecifier('interpolate')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			1
		);
	});

	it('flags non-canonical namespace alias', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Cloudflare', [
			Testing.importNamespaceSpecifier('CF')
		]);
		const results = Testing.runRule(rule, 'ImportDeclaration', node);
		expect(results).toHaveLength(1);
		expect(results[0]?.diagnostic.message).toContain('canonical alias');
	});

	it('allows canonical namespace alias `Cloudflare`', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Cloudflare', [
			Testing.importNamespaceSpecifier('Cloudflare')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('allows canonical namespace alias `AWS`', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/AWS', [
			Testing.importNamespaceSpecifier('AWS')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('skips type-only import declarations', () => {
		const node = Testing.importDeclWithSpecifiers(
			'alchemy/Cloudflare',
			[Testing.importSpecifier('Worker')],
			'type'
		);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('skips type-only specifiers within a value import', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Cloudflare', [
			Testing.importSpecifier('Worker', undefined, 'type')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('ignores root alchemy package (mixed named + namespace usage is canonical)', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy', [
			Testing.importSpecifier('Random')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('ignores alchemy/Stack (service tag pattern)', () => {
		const node = Testing.importDeclWithSpecifiers('alchemy/Stack', [
			Testing.importSpecifier('Stack')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});

	it('ignores unrelated packages', () => {
		const node = Testing.importDeclWithSpecifiers('effect/Effect', [
			Testing.importSpecifier('gen')
		]);
		expect(Testing.runRule(rule, 'ImportDeclaration', node)).toHaveLength(
			0
		);
	});
});
