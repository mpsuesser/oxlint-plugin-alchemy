import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/bind-in-init-only.ts';

const callOfChain = (
	names: readonly [string, string, ...ReadonlyArray<string>],
	args: ReadonlyArray<unknown> = []
) =>
	({
		type: 'CallExpression',
		callee: Testing.chainedMemberExpr(...names),
		arguments: args
	}) as never;

const fetchProperty = () =>
	({
		type: 'Property',
		key: Testing.id('fetch'),
		value: Testing.id('handler')
	}) as never;

const nonFetchProperty = () =>
	({
		type: 'Property',
		key: Testing.id('queue'),
		value: Testing.id('handler')
	}) as never;

describe('bind-in-init-only', () => {
	it('flags `Cloudflare.R2Bucket.bind(...)` inside a `fetch:` property', () => {
		const bindCall = callOfChain(
			['Cloudflare', 'R2Bucket', 'bind'],
			[Testing.id('Bucket')]
		);
		const result = Testing.runRuleMulti(rule, [
			['Property', fetchProperty()],
			['CallExpression', bindCall],
			['Property:exit', fetchProperty()]
		]);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('init Effect');
	});

	it('allows `Cloudflare.R2Bucket.bind(...)` outside any `fetch:` property (init phase)', () => {
		const bindCall = callOfChain(
			['Cloudflare', 'R2Bucket', 'bind'],
			[Testing.id('Bucket')]
		);
		expect(Testing.runRule(rule, 'CallExpression', bindCall)).toHaveLength(
			0
		);
	});

	it('allows unrelated `obj.bind(...)` even inside a `fetch:` property', () => {
		const bindCall = Testing.callOfMember('handler', 'bind', [
			Testing.id('this')
		]);
		const result = Testing.runRuleMulti(rule, [
			['Property', fetchProperty()],
			['CallExpression', bindCall],
			['Property:exit', fetchProperty()]
		]);
		expect(result).toHaveLength(0);
	});

	it('does not fire when ancestor Property is not `fetch:`', () => {
		const bindCall = callOfChain(
			['Cloudflare', 'R2Bucket', 'bind'],
			[Testing.id('Bucket')]
		);
		const result = Testing.runRuleMulti(rule, [
			['Property', nonFetchProperty()],
			['CallExpression', bindCall],
			['Property:exit', nonFetchProperty()]
		]);
		expect(result).toHaveLength(0);
	});

	it('flags AWS.SQS.Queue.bind(...) inside a fetch: property — deep chain', () => {
		const bindCall = callOfChain(
			['AWS', 'SQS', 'Queue', 'bind'],
			[Testing.id('Jobs')]
		);
		const result = Testing.runRuleMulti(rule, [
			['Property', fetchProperty()],
			['CallExpression', bindCall],
			['Property:exit', fetchProperty()]
		]);
		expect(result).toHaveLength(1);
	});
});
