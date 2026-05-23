import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-v1-entrypoint-prop.ts';

describe('no-v1-entrypoint-prop', () => {
	it('flags `Cloudflare.Worker("W", { entrypoint: "..." })`', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{ key: 'entrypoint', value: Testing.strLiteral('./src/w.ts') }
			])
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('renamed to `main:`');
	});

	it('flags `Cloudflare.Container(name, { entrypoint })` likewise', () => {
		const node = Testing.callOfMember('Cloudflare', 'Container', [
			Testing.strLiteral('C'),
			Testing.objectExpr([
				{ key: 'entrypoint', value: Testing.strLiteral('./c.ts') }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('allows `Cloudflare.Worker("W", { main: "..." })`', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{ key: 'main', value: Testing.strLiteral('./src/w.ts') }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `Cloudflare.R2Bucket(...)` — non-platform constructor', () => {
		const node = Testing.callOfMember('Cloudflare', 'R2Bucket', [
			Testing.strLiteral('B'),
			Testing.objectExpr([
				{ key: 'entrypoint', value: Testing.strLiteral('whatever') }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `someFn({ entrypoint: ... })` — unrelated bare-id call', () => {
		const node = Testing.callExpr('helper', [
			Testing.objectExpr([
				{ key: 'entrypoint', value: Testing.strLiteral('x') }
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});
});
