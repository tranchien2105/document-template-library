# Template manifest

`storage/templates/manifest.json` is the canonical starter catalog and metadata source. Names, categories, descriptions, Office document copy, and preview outlines are in Vietnamese. Technical slugs and file names remain stable English identifiers.

Each entry contains a stable integer `id`, unique technical `slug`, Vietnamese `name`, `type` (`document` or `presentation`), `category`, `description`, a relative `filePath`, optional `thumbnailPath`, and structured `preview` data. DOCX previews include `sections`, the exact `placeholders`, and `fields` used by the document creation form. PPTX previews include `slideCount`, slide titles, `slideFields` mapping placeholder keys to each slide, and `fields` used by the presentation form. A field has a storage `key`, source `label` (localized by the frontend), `required` flag, input `type` when needed, and `maxLength`.

The preview is an outline, not a rendered Office page. No thumbnail is referenced until a real thumbnail file exists; the website supplies a designed fallback.

## Canonical data and synchronization

The generator updates IDs 1–8 and preserves unrelated entries. IDs and slugs are stable. On backend startup, database migrations run first; the seed then checks each ID, slug, type, category, metadata, relative path, extension, and file existence before upserting manifest rows. Removed entries are marked inactive. The sync is repeatable and does not make duplicate records. PostgreSQL is the runtime query store; the manifest remains the source of truth for the starter template catalog.

## Adding a template

Add its Office content and definition in `scripts/generate-templates/generate.mjs`, assign a new stable integer ID and unique slug, and run `npm run templates:generate`. DOCX placeholders are detected from the generated document and PPTX placeholders from slide definitions; both provide the form field list. Preserve matching key names between Office content and generated metadata. Review the generated file and manifest before adding a new template to a release. Use `npm run templates:generate -- --presentations-only` to regenerate only PPTX files.
