import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-console-log-output.ts';

describe('no-console-log-output', () => {
	it('flags `console.log(bucket.bucketName)`', () => {
		const node = Testing.callOfMember('console', 'log', [
			Testing.memberExpr('bucket', 'bucketName')
		]);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('[Output]');
	});

	it('flags `console.error(db.databaseUrl)`', () => {
		const node = Testing.callOfMember('console', 'error', [
			Testing.memberExpr('db', 'databaseUrl')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags `console.info(queue.queueArn)`', () => {
		const node = Testing.callOfMember('console', 'info', [
			Testing.memberExpr('queue', 'queueArn')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags when any argument looks Output-shaped', () => {
		const node = Testing.callOfMember('console', 'log', [
			Testing.strLiteral('bucket: '),
			Testing.memberExpr('bucket', 'bucketName')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('allows `console.log("hello")` — plain string', () => {
		const node = Testing.callOfMember('console', 'log', [
			Testing.strLiteral('hello')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `console.log(plain)` — bare identifier', () => {
		const node = Testing.callOfMember('console', 'log', [
			Testing.id('plain')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `console.log(item.count)` — non-Output suffix', () => {
		const node = Testing.callOfMember('console', 'log', [
			Testing.memberExpr('item', 'count')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `logger.log(bucket.bucketName)` — non-console receiver', () => {
		const node = Testing.callOfMember('logger', 'log', [
			Testing.memberExpr('bucket', 'bucketName')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});
});
