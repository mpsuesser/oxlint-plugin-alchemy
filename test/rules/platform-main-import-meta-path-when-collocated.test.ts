import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/platform-main-import-meta-path-when-collocated.ts';

const exportDefault = (declaration: unknown) =>
	({
		type: 'ExportDefaultDeclaration',
		declaration
	}) as never;

const importMetaPath = () =>
	({
		type: 'MemberExpression',
		object: {
			type: 'MetaProperty',
			meta: Testing.id('import'),
			property: Testing.id('meta')
		},
		property: Testing.id('path'),
		computed: false,
		optional: false
	}) as never;

describe('platform-main-import-meta-path-when-collocated', () => {
	it('flags `export default Cloudflare.Worker("W", { main: "./src/worker.ts" })`', () => {
		const node = exportDefault(
			Testing.callOfMember('Cloudflare', 'Worker', [
				Testing.strLiteral('W'),
				Testing.objectExpr([
					{
						key: 'main',
						value: Testing.strLiteral('./src/worker.ts')
					}
				])
			])
		);
		const result = Testing.runRule(rule, 'ExportDefaultDeclaration', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('import.meta.path');
	});

	it('flags `Cloudflare.Container(...)` with hardcoded main likewise', () => {
		const node = exportDefault(
			Testing.callOfMember('Cloudflare', 'Container', [
				Testing.strLiteral('C'),
				Testing.objectExpr([
					{ key: 'main', value: Testing.strLiteral('./c.ts') }
				])
			])
		);
		expect(
			Testing.runRule(rule, 'ExportDefaultDeclaration', node)
		).toHaveLength(1);
	});

	it('allows `export default Cloudflare.Worker("W", { main: import.meta.path })`', () => {
		const node = exportDefault(
			Testing.callOfMember('Cloudflare', 'Worker', [
				Testing.strLiteral('W'),
				Testing.objectExpr([{ key: 'main', value: importMetaPath() }])
			])
		);
		expect(
			Testing.runRule(rule, 'ExportDefaultDeclaration', node)
		).toHaveLength(0);
	});

	it('allows non-platform default exports', () => {
		const node = exportDefault(
			Testing.callOfMember('Cloudflare', 'R2Bucket', [
				Testing.strLiteral('B'),
				Testing.objectExpr([
					{ key: 'main', value: Testing.strLiteral('./b.ts') }
				])
			])
		);
		expect(
			Testing.runRule(rule, 'ExportDefaultDeclaration', node)
		).toHaveLength(0);
	});

	it('allows Worker call with no `main:` prop at all (no constraint to enforce)', () => {
		const node = exportDefault(
			Testing.callOfMember('Cloudflare', 'Worker', [
				Testing.strLiteral('W'),
				Testing.objectExpr([
					{ key: 'bindings', value: Testing.objectExpr([]) }
				])
			])
		);
		expect(
			Testing.runRule(rule, 'ExportDefaultDeclaration', node)
		).toHaveLength(0);
	});
});
