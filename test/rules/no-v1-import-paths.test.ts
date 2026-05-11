import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-v1-import-paths.ts';

describe('no-v1-import-paths', () => {
	it('flags `alchemy/cloudflare`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/cloudflare')
			)
		).toHaveLength(1);
	});

	it('flags `alchemy/aws`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/aws')
			)
		).toHaveLength(1);
	});

	it('flags `alchemy/planetscale`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/planetscale')
			)
		).toHaveLength(1);
	});

	it('flags nested v1 subpaths like `alchemy/cloudflare/something`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/cloudflare/Worker')
			)
		).toHaveLength(1);
	});

	it('allows v2 PascalCase paths `alchemy/Cloudflare`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/Cloudflare')
			)
		).toHaveLength(0);
	});

	it('allows v2 `alchemy/AWS`', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy/AWS')
			)
		).toHaveLength(0);
	});

	it('allows root `alchemy` import', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('alchemy')
			)
		).toHaveLength(0);
	});

	it('ignores unrelated packages', () => {
		expect(
			Testing.runRule(
				rule,
				'ImportDeclaration',
				Testing.importDecl('effect/Effect')
			)
		).toHaveLength(0);
	});
});
