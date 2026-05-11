import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/require-stable-logical-id.ts';

const callOfChain = (
	names: readonly [string, ...string[]],
	args: ReadonlyArray<unknown>
) =>
	({
		type: 'CallExpression',
		callee:
			names.length >= 2
				? Testing.chainedMemberExpr(
						...(names as unknown as readonly [
							string,
							string,
							...string[]
						])
					)
				: Testing.id(names[0]),
		arguments: args
	}) as never;

const templateLiteral = () =>
	({
		type: 'TemplateLiteral',
		quasis: [],
		expressions: []
	}) as never;

describe('require-stable-logical-id', () => {
	it('flags Cloudflare.R2Bucket(variableId)', () => {
		const node = callOfChain(
			['Cloudflare', 'R2Bucket'],
			[Testing.id('id')]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags Cloudflare.R2Bucket(`prefix-${stage}`) template literal', () => {
		const node = callOfChain(
			['Cloudflare', 'R2Bucket'],
			[templateLiteral()]
		);
		const results = Testing.runRule(rule, 'CallExpression', node);
		expect(results).toHaveLength(1);
		expect(results[0]?.diagnostic.message).toContain('Stack.useSync');
	});

	it('flags AWS.SQS.Queue(jobName) — deep member chain', () => {
		const node = callOfChain(
			['AWS', 'SQS', 'Queue'],
			[Testing.id('jobName')]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags Alchemy.Stack(varName)', () => {
		const node = callOfChain(['Alchemy', 'Stack'], [Testing.id('appName')]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('flags numeric first arg', () => {
		const node = callOfChain(
			['Cloudflare', 'R2Bucket'],
			[Testing.numLiteral(42)]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('allows Cloudflare.R2Bucket("Bucket")', () => {
		const node = callOfChain(
			['Cloudflare', 'R2Bucket'],
			[Testing.strLiteral('Bucket')]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows AWS.SQS.Queue("Jobs", { fifoQueue: true })', () => {
		const node = callOfChain(
			['AWS', 'SQS', 'Queue'],
			[
				Testing.strLiteral('Jobs'),
				Testing.objectExpr([
					{ key: 'fifoQueue', value: Testing.boolLiteral(true) }
				])
			]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('ignores camelCase final property like Cloudflare.providers()', () => {
		const node = callOfChain(['Cloudflare', 'providers'], []);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('ignores Cloudflare.R2Bucket.bind(Bucket) — final is camelCase', () => {
		const node = callOfChain(
			['Cloudflare', 'R2Bucket', 'bind'],
			[Testing.id('Bucket')]
		);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('ignores unknown roots like Foo.Bar(x)', () => {
		const node = callOfChain(['Foo', 'Bar'], [Testing.id('x')]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('ignores bare identifier calls like UserResource("x", {})', () => {
		const node = Testing.callExpr('UserResource', [Testing.id('x')]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('does not flag when no arguments are passed', () => {
		const node = callOfChain(['Cloudflare', 'R2Bucket'], []);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});
});
