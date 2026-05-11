import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-string-concat-output.ts';

const templateLiteral = (
	expressions: ReadonlyArray<unknown>,
	parent?: unknown
) =>
	({
		type: 'TemplateLiteral',
		quasis: [],
		expressions,
		parent
	}) as never;

const taggedTemplate = (
	tagObj: string,
	tagProp: string,
	tplExpressions: ReadonlyArray<unknown>
) =>
	templateLiteral(tplExpressions, {
		type: 'TaggedTemplateExpression',
		tag: Testing.memberExpr(tagObj, tagProp)
	});

describe('no-string-concat-output', () => {
	it('flags `` `prefix-${bucket.bucketName}` `` (TemplateLiteral)', () => {
		const node = templateLiteral([
			Testing.memberExpr('bucket', 'bucketName')
		]);
		const result = Testing.runRule(rule, 'TemplateLiteral', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('Output.interpolate');
	});

	it('flags `` `${db.databaseUrl}` `` (Url suffix)', () => {
		const node = templateLiteral([Testing.memberExpr('db', 'databaseUrl')]);
		expect(Testing.runRule(rule, 'TemplateLiteral', node)).toHaveLength(1);
	});

	it('flags `` `${queue.queueArn}` `` (Arn suffix)', () => {
		const node = templateLiteral([Testing.memberExpr('queue', 'queueArn')]);
		expect(Testing.runRule(rule, 'TemplateLiteral', node)).toHaveLength(1);
	});

	it('flags `prefix + bucket.bucketName` (BinaryExpression `+`)', () => {
		const node = Testing.binaryExpr(
			'+',
			Testing.strLiteral('prefix'),
			Testing.memberExpr('bucket', 'bucketName')
		);
		const result = Testing.runRule(rule, 'BinaryExpression', node);
		expect(result).toHaveLength(1);
	});

	it('allows `` Output.interpolate`prefix-${bucket.bucketName}` `` (tagged)', () => {
		const node = taggedTemplate('Output', 'interpolate', [
			Testing.memberExpr('bucket', 'bucketName')
		]);
		expect(Testing.runRule(rule, 'TemplateLiteral', node)).toHaveLength(0);
	});

	it('allows `` `hello ${name}` `` — plain string interpolation, no Output suffix', () => {
		const node = templateLiteral([Testing.id('name')]);
		expect(Testing.runRule(rule, 'TemplateLiteral', node)).toHaveLength(0);
	});

	it('allows `a + b` — no Output suffix in operands', () => {
		const node = Testing.binaryExpr('+', Testing.id('a'), Testing.id('b'));
		expect(Testing.runRule(rule, 'BinaryExpression', node)).toHaveLength(0);
	});

	it('allows `count - 1` — non-`+` operator', () => {
		const node = Testing.binaryExpr(
			'-',
			Testing.memberExpr('item', 'count'),
			Testing.numLiteral(1)
		);
		expect(Testing.runRule(rule, 'BinaryExpression', node)).toHaveLength(0);
	});
});
