import { describe, expect, it } from '@effect/vitest';

import * as Testing from 'effect-oxlint/testing';

import rule from '../../src/rules/no-shadowing-global-worker.ts';

const functionDecl = (name: string) =>
	({
		type: 'FunctionDeclaration',
		id: { type: 'BindingIdentifier', name },
		params: [],
		body: Testing.blockStmt()
	}) as never;

describe('no-shadowing-global-worker', () => {
	it('flags `class Worker {}`', () => {
		const node = Testing.classDecl('Worker');
		const result = Testing.runRule(rule, 'ClassDeclaration', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('class Worker');
	});

	it('flags `function Worker() {}`', () => {
		const node = functionDecl('Worker');
		const result = Testing.runRule(rule, 'FunctionDeclaration', node);
		expect(result).toHaveLength(1);
		expect(result[0]?.diagnostic.message).toContain('function Worker');
	});

	it('allows `class MyWorker {}` — non-shadowing name', () => {
		const node = Testing.classDecl('MyWorker');
		expect(Testing.runRule(rule, 'ClassDeclaration', node)).toHaveLength(0);
	});

	it('allows `class Foo {}`', () => {
		const node = Testing.classDecl('Foo');
		expect(Testing.runRule(rule, 'ClassDeclaration', node)).toHaveLength(0);
	});

	it('allows `function helper() {}`', () => {
		const node = functionDecl('helper');
		expect(Testing.runRule(rule, 'FunctionDeclaration', node)).toHaveLength(
			0
		);
	});
});
