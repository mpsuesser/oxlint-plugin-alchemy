import { describe, expect, it } from 'vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-v1-finalize.ts';

describe('no-v1-finalize', () => {
	it('flags `app.finalize()` (zero-arg, bare-identifier receiver)', () => {
		const node = Testing.callOfMember('app', 'finalize', []);
		const result = Testing.runRule(rule, 'CallExpression', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('Alchemy.Stack');
	});

	it('flags `stack.finalize()` (any bare identifier)', () => {
		const node = Testing.callOfMember('stack', 'finalize', []);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(1);
	});

	it('allows `app.finalize(...)` with an argument', () => {
		const node = Testing.callOfMember('app', 'finalize', [
			Testing.strLiteral('arg')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `Cloudflare.R2Bucket("Bucket")` — different method', () => {
		const node = Testing.callOfMember('Cloudflare', 'R2Bucket', [
			Testing.strLiteral('Bucket')
		]);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `fetch()` — bare-identifier callee, not a member call', () => {
		const node = Testing.callExpr('fetch', []);
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});

	it('allows `crypto.subtle.finalize()` — non-bare receiver (deep chain)', () => {
		const node = {
			type: 'CallExpression',
			callee: {
				type: 'MemberExpression',
				object: Testing.memberExpr('crypto', 'subtle'),
				property: Testing.id('finalize'),
				computed: false,
				optional: false
			},
			arguments: []
		} as never;
		expect(Testing.runRule(rule, 'CallExpression', node)).toHaveLength(0);
	});
});
