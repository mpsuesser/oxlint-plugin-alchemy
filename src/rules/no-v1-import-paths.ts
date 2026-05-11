import * as Schema from 'effect/Schema';

import { Rule } from 'effect-oxlint';

/**
 * v1 used lowercase Alchemy subpath imports — `alchemy/cloudflare`,
 * `alchemy/aws`, `alchemy/planetscale`, etc. v2 standardizes on
 * PascalCase — `alchemy/Cloudflare`, `alchemy/AWS`, `alchemy/PlanetScale`.
 *
 * Recognized purely from path shape: any `alchemy/<segment>` where the
 * first subpath segment starts with a lowercase ASCII letter.
 *
 * @since 0.0.0
 */
const V1AlchemyImportSource = Schema.String.check(
	Schema.isPattern(/^alchemy\/[a-z]/, {
		identifier: 'V1AlchemyImportSourceCheck',
		title: 'Alchemy v1 lowercase subpath',
		description:
			'An alchemy/<segment> import where the first subpath segment starts with a lowercase ASCII letter — the v1 naming convention.'
	})
);

/**
 * Type guard for v1 Alchemy import sources.
 *
 * @since 0.0.0
 */
const isV1AlchemyImportSource = Schema.is(V1AlchemyImportSource);

/**
 * Ban v1 lowercase Alchemy subpath imports.
 *
 * @since 0.0.0
 */
export default Rule.banImport(isV1AlchemyImportSource, {
	meta: { type: 'problem' },
	message:
		'Alchemy v1 import paths use lowercase subpaths (`alchemy/cloudflare`). v2 uses PascalCase: `import * as Cloudflare from "alchemy/Cloudflare"`, `import * as AWS from "alchemy/AWS"`, etc. (AL-4)'
});
