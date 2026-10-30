# Papertrail Security Notes

This document records the practical safeguards currently implemented for the single-user recruitment demo. It is not a claim that arbitrary Office files are safe or that Papertrail provides production user isolation.

## Audit summary

| Area | Status | Result |
| --- | --- | --- |
| SQL injection | PASS | Search, filters, and pagination values are passed as TypeORM parameters; order fields are fixed in code. |
| Request validation | PARTIAL | Route IDs, query values, metadata, template fields, and upload limits are checked. DTO validation is explicit in services/controllers; a global `ValidationPipe` is not enabled because the current DTOs do not use validation decorators. |
| Upload package validation | PASS WITH LIMITS | Extension, MIME signal, ZIP structure, size/ratio/count limits, CRC, expected OOXML parts, and relationships are checked. Full OOXML schema validation and malware scanning are not provided. |
| Filesystem traversal/symlinks | PASS | Paths are constrained to configured roots and canonical paths; output names are UUID based. |
| Generated downloads | PASS FOR DEMO MODEL | The database record is required, its path must match its UUID and file type, and its filename is sanitized before setting download headers. |
| User isolation | NOT PROVIDED | All visitors share the unauthenticated Demo User. UUIDs are identifiers, not authorization. |
| Frontend XSS sinks | PASS BY SOURCE REVIEW | React renders template and document values as text; no `dangerouslySetInnerHTML`, `innerHTML`, or `eval` usage was found in `frontend/src`. |
| Rendering isolation | NOT APPLICABLE | The application does not invoke LibreOffice or another Office renderer. Slide/document previews are metadata-based illustrations. |

## Implemented controls

- **Upload size and request shape:** The upload interceptor limits a single file and multipart fields. `TEMPLATE_UPLOAD_MAX_BYTES` accepts 1–50 MiB and defaults to 10 MiB. Multer size errors return HTTP 413 without returning internal details.
- **Office package checks:** `backend/src/common/office-package.ts` inspects ZIP central-directory metadata before JSZip processing. It rejects split/ZIP64 archives, encrypted or unsupported compression methods, duplicate/unsafe paths, symlinks, excessive entries, files larger than 32 MiB expanded, total expansion over 128 MiB, and compression ratios over 200:1. It inflates entries with an output ceiling and verifies actual size and CRC before inspecting the bounded OOXML parts.
- **OOXML checks and active content:** Uploads must have the correct document/presentation content type, root office-document relationship, main part, and resolvable internal relationships. Macro-enabled declarations, VBA parts, embedded objects, ActiveX, custom UI, external data links, and suspicious executable/script part extensions are rejected. External hyperlinks are limited to HTTP(S) and mailto. These checks are structural safeguards, not a complete Office conformance parser or malware scanner.
- **MIME handling:** `TemplateService` requires the expected Office MIME type or the generic `application/octet-stream` signal, then validates the package itself. A declared MIME type is not considered proof that a file is safe.
- **Path and write safety:** `backend/src/common/storage.ts` checks canonical real paths to prevent root escapes through symlinks. New files use exclusive creation (`O_EXCL` and `O_NOFOLLOW` where supported) and restrictive mode `0600`; a collision cannot overwrite or delete a pre-existing file. Template files are never edited during generation.
- **Output cleanup and download:** DOCX/PPTX output names use UUIDs. A generated file is removed if metadata persistence fails. Download lookup requires a saved record, a canonical UUID, a matching `{documents|presentations}/{id}.{extension}` path, and an existing nonempty file. Download responses set `X-Content-Type-Options: nosniff` and use a sanitized filename.
- **Database and request handling:** `TemplateService` uses parameterized query-builder filters, fixed sort fields, bounded pagination, allowlisted update fields, and validation of template placeholder values. Internal errors return generic upload/download messages; API response headers include `nosniff`, frame denial, a restrictive referrer policy, and `no-store` caching.
- **CORS:** `CORS_ORIGIN` is an explicit comma-separated origin list with credentials disabled. A wildcard is rejected when `NODE_ENV=production`. CORS controls browser access only; it is not authentication.
- **Document ownership:** Document listing, metadata, and downloads are scoped to the server-resolved Demo User when the user repository is configured. Since there is no login or authorization, this does not provide privacy between visitors.

## Verification performed

The backend suite validates uploaded DOCX/PPTX packages, rejects an arbitrary ZIP and a high-ratio archive, rejects incorrect MIME and oversized service input, tests the 413 error mapping, checks traversal and symlink escapes, verifies exclusive writes and concurrent independent outputs, ensures source templates remain unchanged, and checks cleanup after metadata persistence failure. It also validates all eight bundled OOXML packages and generation flows.

Commands run with the installed Node 24 binary because the system npm is an older npm 6 that recursively invokes the workspace scripts:

```text
NestJS build: PASS
Backend TypeScript typecheck: PASS
Backend ESLint source check: PASS
Backend tests: PASS (24 tests)
Frontend unsafe HTML/eval source scan: PASS (no matches)
Database-backed HTTP integration: NOT RUN
Browser workflow/security interaction: NOT RUN
Microsoft Office/LibreOffice validation of newly uploaded arbitrary files: NOT RUN
```

## Remaining risks and limitations

- Upload, template edit/delete, document metadata, and download routes are unauthenticated. The management endpoints must be protected before public deployment.
- Every browser visitor sees the same Demo User documents. The Demo User association is demo bookkeeping, not authorization or tenant isolation.
- Office validation covers ZIP structure, bounded decompression, key content types, and relationships; it does not implement every OOXML schema rule and does not scan for malware. Do not accept arbitrary public uploads without isolated scanning/processing.
- Uploaded content is held in memory up to the configured limit. Rate limiting and concurrent-upload resource quotas are not implemented.
- Storage checks reduce symlink/path escapes, but they are not a hardened multi-tenant storage boundary against an attacker with operating-system access to the server account or storage directories.
- The frontend does not render uploaded HTML. It displays text/metadata using React escaping; Office previews are not actual rendered pages.
- `synchronize` remains disabled. Database schema changes continue to use migrations.

## How to explain Papertrail security in a technical interview

### 1. Preventing ZIP bombs and malformed Office uploads

- **Threat:** A small compressed upload expands to huge data, contains invalid OOXML, or disguises a non-Office archive with a `.docx`/`.pptx` extension.
- **Implementation:** `backend/src/common/office-package.ts` (`preflightZip`, `validateOfficeArchive`, `loadValidatedOfficePackage`) and `TemplateService.uploadDocumentTemplate` / `uploadPresentationTemplate`.
- **How it works:** It checks ZIP headers and central-directory metadata, enforces entry/expanded-size/compression-ratio limits, inflates each entry with an output bound, verifies size and CRC, and confirms key OOXML parts and relationships.
- **Evidence:** Backend tests reject an arbitrary ZIP and a high-ratio archive; bundled five DOCX and three PPTX packages pass the validator.
- **Limit:** This is not antivirus and not a complete OOXML schema validator.

### 2. Preventing path traversal and symlink escapes

- **Threat:** A crafted metadata path or symlink causes the server to read or serve files outside template/generated storage.
- **Implementation:** `backend/src/common/storage.ts` (`safeTemplatePath`, `safeGeneratedPath`, `assertSafeDirectory`).
- **How it works:** It checks relative paths and canonical real paths against configured storage roots before reads/writes/downloads.
- **Evidence:** Tests reject traversal paths and a template symlink targeting `/etc/passwd`.
- **Limit:** A privileged attacker who can modify the server filesystem can still alter the storage environment; this is not an OS sandbox.

### 3. Preventing output overwrite and request collisions

- **Threat:** Two generations collide or a guessed output path overwrites an existing file.
- **Implementation:** `backend/src/common/storage.ts` (`writeNewFile`) and `TemplateService.createDocument` / `copyPresentation`.
- **How it works:** Each request gets a UUID path and the file is opened exclusively with no-follow behavior where supported. Persistence failure removes only the file created by that request.
- **Evidence:** An automated test confirms an existing file is not overwritten; generation tests confirm original templates remain unchanged and DB failure removes the output.
- **Limit:** Storage permissions and disk quotas still need operational management.

### 4. Preventing unsafe file downloads

- **Threat:** A caller supplies a path or manipulates metadata to retrieve server files, or a response is interpreted as active content.
- **Implementation:** `TemplateService.file`, `DocumentsService.getForDownload`, and `GeneratedFileController.download`.
- **How it works:** The UUID resolves through a saved record; the path must exactly match the UUID/type convention; the file must exist; filenames are sanitized; `nosniff` is set.
- **Evidence:** Tests cover missing records/files, public metadata omissions, and valid generated-file types.
- **Limit:** Without authentication, any visitor can request a known/obtained Demo User document ID.

### 5. Preventing SQL injection and unsafe field substitution

- **Threat:** Search/filter input changes SQL structure or injected document text corrupts OOXML.
- **Implementation:** `TemplateService.list`, `validateTemplateValues`, `replaceDocxPlaceholders`, and `replacePptxPlaceholders`.
- **How it works:** Query values use TypeORM parameters; sorting is fixed; only template-declared fields are accepted; XML-invalid characters are rejected and XML special characters are escaped.
- **Evidence:** Existing tests check combined filtering, invalid queries/fields, XML escaping, and split-run placeholder replacement.
- **Limit:** Future query/sort features must retain parameterization and allowlists.

### 6. Explaining the Demo User limitation

- **Threat:** Mistaking a shared demo identity or random UUID for real user authorization.
- **Implementation:** `DocumentsService` resolves the Demo User server-side and scopes records to that user, but there is no authentication module.
- **How it works:** The browser cannot select an arbitrary owner, but all unauthenticated visitors share this same demo owner.
- **Evidence:** Unit tests verify server-side assignment and list scoping.
- **Limit:** Add authentication and authorization on every document and management route before production or public deployment.
