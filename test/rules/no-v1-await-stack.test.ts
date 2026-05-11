import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-v1-await-stack.ts';

const awaitExpr = (argument: unknown) =>
	({
		type: 'AwaitExpression',
		argument
	}) as never;

describe('no-v1-await-stack', () => {
	it('flags `await alchemy("name", {})`', () => {
		const node = awaitExpr(
			Testing.callExpr('alchemy', [
				Testing.strLiteral('my-app'),
				Testing.objectExpr([])
			])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(1);
	});

	it('flags `await alchemy()` with no args', () => {
		const node = awaitExpr(Testing.callExpr('alchemy', []));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(1);
	});

	it('allows `await Alchemy.Stack(...)` (v2 pattern — caller awaits the Effect somewhere else)', () => {
		const node = awaitExpr(
			Testing.callOfMember('Alchemy', 'Stack', [
				Testing.strLiteral('MyApp')
			])
		);
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});

	it('allows `await someOtherFn()`', () => {
		const node = awaitExpr(Testing.callExpr('fetch', []));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});

	it('allows `await someValue` (non-call)', () => {
		const node = awaitExpr(Testing.id('value'));
		expect(Testing.runRule(rule, 'AwaitExpression', node)).toHaveLength(0);
	});
});
