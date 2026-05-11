/**
 * Shared Alchemy v2 domain primitives used across multiple rules.
 *
 * @since 0.0.0
 */

import * as Arr from 'effect/Array';
import * as Schema from 'effect/Schema';

/**
 * Root namespaces that ship Alchemy resource constructors. The
 * leftmost identifier of a resource-callee member chain is always one
 * of these in idiomatic v2 code. Extend when adopting additional
 * provider packages.
 *
 * @since 0.0.0
 */
export const AlchemyRoot = Schema.Literals([
	'Alchemy',
	'Cloudflare',
	'AWS',
	'Axiom',
	'PlanetScale'
]);

/**
 * @since 0.0.0
 */
export type AlchemyRoot = typeof AlchemyRoot.Type;

/**
 * @since 0.0.0
 */
export const isAlchemyRoot = Schema.is(AlchemyRoot);

/**
 * PascalCase identifier: starts with an uppercase ASCII letter, then
 * alphanumeric ASCII characters. Resource constructors are by
 * convention PascalCase (`R2Bucket`, `Queue`, `Worker`, `Function`).
 *
 * @since 0.0.0
 */
export const PascalCaseName = Schema.String.check(
	Schema.isPattern(/^[A-Z][A-Za-z0-9]*$/, {
		identifier: 'PascalCaseNameCheck',
		title: 'PascalCase name',
		description:
			'A string starting with an uppercase ASCII letter followed by alphanumeric ASCII characters.'
	})
);

/**
 * @since 0.0.0
 */
export const isPascalCaseName = Schema.is(PascalCaseName);

/**
 * A dotted member path looks like an Alchemy resource constructor
 * when its leftmost segment is an Alchemy namespace root and its
 * rightmost segment is PascalCase. Matches `Cloudflare.R2Bucket`,
 * `AWS.SQS.Queue`, `AWS.Lambda.Function`, etc.
 *
 * @since 0.0.0
 */
export const isAlchemyResourcePath = (
	path: Arr.NonEmptyReadonlyArray<string>
): boolean =>
	isAlchemyRoot(Arr.headNonEmpty(path)) &&
	isPascalCaseName(Arr.lastNonEmpty(path));

/**
 * SHOUTY_SNAKE_CASE identifier: all-uppercase ASCII letters, digits,
 * and underscores, starting with an uppercase letter. The v1 binding
 * key convention (`bindings: { BUCKET: bucket }`); v2 uses the
 * resource identifier verbatim as the key.
 *
 * @since 0.0.0
 */
export const ShoutySnakeCaseName = Schema.String.check(
	Schema.isPattern(/^[A-Z][A-Z0-9_]*$/, {
		identifier: 'ShoutySnakeCaseNameCheck',
		title: 'SHOUTY_SNAKE_CASE name',
		description:
			'An ASCII identifier consisting entirely of uppercase letters, digits, and underscores, starting with an uppercase letter.'
	})
);

/**
 * @since 0.0.0
 */
export const isShoutySnakeCaseName = Schema.is(ShoutySnakeCaseName);

/**
 * Dotted member paths identifying Worker-like Cloudflare platform
 * constructors. These accept `{ main, bindings, fetch }`-shaped
 * props and are the targets of `no-v1-entrypoint-prop`,
 * `no-shouty-binding-keys`, and
 * `platform-main-import-meta-path-when-collocated`.
 *
 * Extend when new platforms with the same shape ship.
 *
 * @since 0.0.0
 */
export const WorkerLikePlatform = Schema.Literals([
	'Cloudflare.Worker',
	'Cloudflare.Container'
]);

/**
 * @since 0.0.0
 */
export type WorkerLikePlatform = typeof WorkerLikePlatform.Type;

/**
 * @since 0.0.0
 */
export const isWorkerLikePlatform = Schema.is(WorkerLikePlatform);

/**
 * Recognized Output-bearing property suffixes used by the
 * `no-string-concat-output` and `no-console-log-output`
 * heuristics. A `MemberExpression` whose property name ends in one
 * of these is *likely* an `Output<…>` reference. Conservative — false
 * negatives are preferred to false positives.
 *
 * @since 0.0.0
 */
export const OutputPropertySuffix = Schema.String.check(
	Schema.isPattern(/(Name|Url|Arn|Id|Endpoint|Host|Region|Port|Key)$/, {
		identifier: 'OutputPropertySuffixCheck',
		title: 'Output-bearing property suffix',
		description:
			'A property name ending in a suffix conventionally used for Alchemy `Output<string>` values.'
	})
);

/**
 * @since 0.0.0
 */
export const isOutputPropertySuffix = Schema.is(OutputPropertySuffix);
