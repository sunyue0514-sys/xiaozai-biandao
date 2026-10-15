# Public asset and knowledge provenance

This release preparation uses exclusion where redistribution permission cannot be established from the supplied materials. It does not certify ownership of the pre-existing source archive.

## Public images

| Public file | Origin and release treatment |
| --- | --- |
| `public/logo.svg` | Newly authored for this release preparation using simple geometric shapes; project MIT license. Generic playback mark; no claim to an exclusive trademark. |
| `public/images/poster-bg.svg` | Newly authored for this release preparation using basic shapes and generic text; project MIT license. Contains no external artwork, embedded font, photograph, or competitor branding. |

The previous `logo.png`, `images/poster-bg.jpg`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, and `window.svg` are excluded. No permission or reliable asset provenance was provided for those copies. Login, sidebar, and poster image references now use the replacements. Competitor screenshots and other original asset archives are outside the public release.

## Embedded knowledge and prompts

The original knowledge files described an aggregation of 51 professional documents and named a third-party instructor's methodology. No license allowing redistribution of those underlying documents or course material was supplied. The release preparation replaces explanatory prose, examples, and long static prompt passages in the following modules with newly written generic guidance:

- `src/lib/content-knowledge-base.ts`
- `src/lib/knowledge-helper.ts`
- `src/lib/prompt-knowledge-map.ts`
- `src/lib/copywriting-analysis.ts`
- `src/lib/prompt-builders.ts`
- `src/lib/prompt-engineering/builders/script-prompt-builder.ts`

Existing export names, types, structural keys, executable control flow, user-context interpolation, and mechanical JSON output field structures are retained for compatibility. Historical identifiers containing an instructor's name remain as internal interface names; they do not imply endorsement or permission to redistribute that instructor's material. Generic short category labels are retained. Prompt richness is reduced compared with the original knowledge corpus; generation quality should be evaluated against the maintainer's own licensed examples before production use.

Other pre-existing configuration, prompt, and source code has no established chain of ownership from the supplied archive alone. The maintainer must confirm the right to publish the pre-existing source and any retained explanatory text. This document does not turn an unknown work into MIT-licensed content.

## Runtime data and dependencies

Remote knowledge search still uses the configured service and is not a bundled public dataset. Only use datasets you are allowed to access and process. Customer uploads, account data, retrieved excerpts, provider content, and generated outputs are not granted a new license by this repository's MIT file. Review rights and service terms before redistributing them.

Third-party packages retain their upstream licenses. The installed package inventory and preserved upstream license/notice texts are in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). An absent license file or unknown package declaration is a review item, not permission. MIT applies only to project-owned contributions the contributor has authority to license.

## README publication images

- `docs/images/cover.png`: AI-generated editorial banner prepared for this project's open-source README at the maintainer's request; an illustration, not a product screenshot.
- `docs/images/ip-positioning.png` and `docs/images/script-opening.png`: maintainer-supplied historical interface screenshots, included unchanged. They show configuration/form interfaces rather than verified generation results. Public captions describe that scope.
- Other supplied screenshots containing customer lists or detailed individual profiles are excluded from this public package. Screenshot publication does not authorize redistribution of actual customer data.
