import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-v1-await-resource.ts';

const awaitExpr = (argument: unknown) =>
	({
		type: 'AwaitExpression',
		argument
	}) as never;

/**
 * Builds a `CallExpression` whose callee is a non-trivial member chain.
 * Requires 2+ names — single-identifier callees use `Testing.callExpr`.
 */
const callOfChain = (
	names: readonly [string, string, ...ReadonlyArray<string>],
	args: ReadonlyArray<unknown> = []
) =>
	({
		type: 'CallExpression',
		callee: Testing.chainedMemberExpr(...names),
		arguments: args
	}) as never;

describe('no-v1-await-resource', () => {
	it('flags `await Cloudflare.R2Bucket("Bucket")`', () => {
		const node = awaitExpr(
			callOfChain(
				['Cloudflare', 'R2Bucket'],
				[Testing.strLiteral('Bucket')]
			)
		);
		const result = Testing.runRule(rule, 'AwaitExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'yield* Cloudflare.R2Bucket(...)'
		);
	});

	it('flags `await AWS.Lambda.Function("Api", { main: "./api.ts" })` — deep chain', () => {
		const node = awaitExpr(
			callOfChain(
				['AWS', 'Lambda', 'Function'],
				[Testing.strLiteral('Api')]
			)
		);
		const result = Testing.runRule(rule, 'AwaitExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain(
			'yield* AWS.Lambda.Function(...)'
		);
	});

	it('flags `await AWS.SQS.Queue("Jobs")`', () => {
		const node = awaitExpr(
			callOfChain(['AWS', 'SQS', 'Queue'], [Testing.strLiteral('Jobs')])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(1);
	});

	it('flags `await Alchemy.Random("Token")`', () => {
		const node = awaitExpr(
			callOfChain(['Alchemy', 'Random'], [Testing.strLiteral('Token')])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(1);
	});

	it('flags `await PlanetScale.Database("Db")`', () => {
		const node = awaitExpr(
			callOfChain(['PlanetScale', 'Database'], [Testing.strLiteral('Db')])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(1);
	});

	it('allows `await fetch("...")` — bare-identifier callee', () => {
		const node = awaitExpr(
			Testing.callExpr('fetch', [Testing.strLiteral('http://')])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});

	it('allows `await someValue` (non-call)', () => {
		const node = awaitExpr(Testing.id('value'));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});

	it('allows `await myLib.helper()` — non-Alchemy root', () => {
		const node = awaitExpr(callOfChain(['myLib', 'helper'], []));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});

	it('allows `await Cloudflare.lowercase()` — final segment not PascalCase', () => {
		const node = awaitExpr(callOfChain(['Cloudflare', 'lowercase'], []));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});
});
