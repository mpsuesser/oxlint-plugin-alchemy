import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-shouty-binding-keys.ts';

describe('no-shouty-binding-keys', () => {
	it('flags `Cloudflare.Worker("W", { bindings: { BUCKET: bucket } })`', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'BUCKET', value: Testing.id('bucket') }
					])
				}
			])
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('BUCKET');
		expect(result[0]?.diagnostic.message).toContain('PascalCase');
	});

	it('flags multiple SHOUTY keys', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'BUCKET', value: Testing.id('bucket') },
						{ key: 'KV', value: Testing.id('kv') },
						{ key: 'MY_VAR', value: Testing.id('var') }
					])
				}
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(3);
	});

	it('flags `Cloudflare.Container(...)` likewise', () => {
		const node = Testing.callOfMember('Cloudflare', 'Container', [
			Testing.strLiteral('C'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'API_KEY', value: Testing.id('key') }
					])
				}
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('allows PascalCase shorthand `bindings: { Bucket }`', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'Bucket', value: Testing.id('Bucket') },
						{ key: 'Sessions', value: Testing.id('Sessions') }
					])
				}
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows non-platform constructors with SHOUTY keys', () => {
		const node = Testing.callOfMember('Cloudflare', 'R2Bucket', [
			Testing.strLiteral('B'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'WHATEVER', value: Testing.id('x') }
					])
				}
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows mixed-case keys like `bucketName`', () => {
		const node = Testing.callOfMember('Cloudflare', 'Worker', [
			Testing.strLiteral('W'),
			Testing.objectExpr([
				{
					key: 'bindings',
					value: Testing.objectExpr([
						{ key: 'bucketName', value: Testing.id('x') }
					])
				}
			])
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});
});
