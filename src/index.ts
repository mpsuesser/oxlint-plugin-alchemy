import { Plugin } from 'effect-oxlint';

import bindInInitOnly from './rules/bind-in-init-only.ts';
import noConsoleLogOutput from './rules/no-console-log-output.ts';
import noShadowingGlobalWorker from './rules/no-shadowing-global-worker.ts';
import noShoutyBindingKeys from './rules/no-shouty-binding-keys.ts';
import noStringConcatOutput from './rules/no-string-concat-output.ts';
import noV1AwaitResource from './rules/no-v1-await-resource.ts';
import noV1AwaitStack from './rules/no-v1-await-stack.ts';
import noV1EntrypointProp from './rules/no-v1-entrypoint-prop.ts';
import noV1Finalize from './rules/no-v1-finalize.ts';
import noV1ImportPaths from './rules/no-v1-import-paths.ts';
import platformMainImportMetaPathWhenCollocated from './rules/platform-main-import-meta-path-when-collocated.ts';
import preferNamespaceImports from './rules/prefer-namespace-imports.ts';
import requireStableLogicalId from './rules/require-stable-logical-id.ts';
import stackInAlchemyRunFile from './rules/stack-in-alchemy-run-file.ts';

/**
 * Oxlint plugin enforcing idiomatic Alchemy v2 usage.
 *
 * @since 0.0.0
 */
export default Plugin.define({
	name: 'alchemy',
	rules: {
		// ── v1 → v2 migration footguns ───────────────────────────
		'no-v1-await-stack': noV1AwaitStack,
		'no-v1-await-resource': noV1AwaitResource,
		'no-v1-finalize': noV1Finalize,
		'no-v1-entrypoint-prop': noV1EntrypointProp,
		'no-v1-import-paths': noV1ImportPaths,
		'no-shouty-binding-keys': noShoutyBindingKeys,

		// ── Native v2 conventions ────────────────────────────────
		'require-stable-logical-id': requireStableLogicalId,
		'prefer-namespace-imports': preferNamespaceImports,
		'bind-in-init-only': bindInInitOnly,
		'no-shadowing-global-worker': noShadowingGlobalWorker,

		// ── Output safety ────────────────────────────────────────
		'no-string-concat-output': noStringConcatOutput,
		'no-console-log-output': noConsoleLogOutput,

		// ── File structure ───────────────────────────────────────
		'stack-in-alchemy-run-file': stackInAlchemyRunFile,
		'platform-main-import-meta-path-when-collocated':
			platformMainImportMetaPathWhenCollocated
	}
});
