# Lawyer Images via R2 Signed-URL Upload

Scope: profile image for a lawyer, surfaced in the admin lawyer table and the public `/lawyers` listing.

## Flow

```
Admin modal → POST /admin/uploads/presign { contentType }
           → { uploadUrl, key, publicUrl, method, headers }
           → PUT uploadUrl (headers from ticket) → R2
           → include imageKey in POST/PATCH /admin/lawyers
Public GET /lawyers → imageUrl = `${R2_PUBLIC_BASE_URL}/${imageKey}`
```

## Decisions

- **Presigned PUT, browser uploads direct to R2.** Bytes never pass through the Worker in production. Only the S3 API credentials are needed to sign.
- **R2 bucket is public → no read route in production.** `<img>` loads the object directly. The Worker read route exists only as the local-dev path and a fallback.
- **Store the object key, derive the public URL.** `image_key` column (nullable); API builds `imageUrl` from `R2_PUBLIC_BASE_URL`. Domain/bucket changes don't require a data migration.
- **Content-Type pinned in the signature.** `image/jpeg | image/png | image/webp` only; R2 rejects a mismatched upload with 403. Size (5MB) is client-checked only — presigned PUT can't express `content-length-range`.
- **Presign endpoint sits behind the existing admin Basic auth.** Only authenticated admins can mint upload URLs.
- **Local dev uses the `IMAGES` R2 binding, not S3.** Miniflare's local R2 has no S3 endpoint, so when `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` are unset the presign endpoint returns a same-origin `PUT /admin/uploads/dev/:key` URL, and the client PUTs through the Worker. The ticket echoes the request's `Authorization` header so the client uses one uniform "PUT with returned headers" flow. The public `GET /uploads/:key` route reads from the binding. Setting real S3 credentials switches both paths to signed URLs automatically.
- **`ZPublicLawyer` and `ZLawyerWithImage` live in `@vidhan/schema`.** The admin response adds a resolved `imageUrl`; the public projection exposes `imageUrl` only (internal fields stay private). The web app now consumes `ZPublicLawyer`, so per AGENTS §3 it belongs in the shared package.
- **No cleanup on replace/remove yet.** Old objects orphan; deferred (see below).

## Schema — `packages/schema/src/db/schema.ts`

- `imageKey: text("image_key")` (nullable) on `lawyers` → flows into `ZLawyer` / `ZLawyerCreate` / `ZLawyerUpdate`.
- `ZLawyerWithImage = ZLawyer.extend({ imageUrl: string | null })` — admin response shape.
- `ZPublicLawyer` — public response shape (`imageUrl` in, internal fields out).
- Migration `20261002112315_fast_maestro` adds `image_key` (nullable, no backfill).

## API — `apps/api`

- `aws4fetch` dependency.
- `Env` gains `IMAGES: R2Bucket` + `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`.
- `wrangler.toml`: `[[r2_buckets]] IMAGES`; `R2_ACCOUNT_ID` / `R2_BUCKET_NAME` / `R2_PUBLIC_BASE_URL` as `[vars]` (empty by default). Access key + secret via `wrangler secret put`.
- `src/uploads/r2.ts`: content-type allowlist, `createImageKey`, `imageUrlFor`, `createUploadTicket` (signed when credentials exist, local proxy otherwise).
- `src/routes/admin/uploads.ts`: `POST /presign`; dev-only `PUT /dev/:key{.+}` (disabled once S3 credentials exist) storing via `IMAGES`.
- `src/routes/admin/lawyers.ts`: responses include `imageUrl`; POST defaults `imageKey` to null.
- `src/routes/public/uploads.ts`: `GET /:key{.+}` served from `IMAGES` (dev/fallback).
- `src/lawyers/index.ts`: public projection adds `imageUrl`; `searchLawyers` / `findPublicLawyer` take `env` + `origin`.

## Admin UI — `apps/admin`

- `src/features/uploads/api.ts`: type/size validation, `uploadImage(file)` (presign → PUT with returned headers).
- `LawyerFormModal.tsx`: photo field — avatar preview, upload/replace/remove, inline errors.
- `LawyerRow.tsx` + `Avatar.tsx`: avatar before the name; initial fallback.
- `features/lawyers/api.ts`, `hooks.ts`, `page.tsx`, `LawyerTable.tsx`: use `TLawyerWithImage`.

## Public listing — `apps/web`

- `src/lib/api.ts`, `src/features/lawyers/{api,labels}.ts`, `components/LawyerCard.tsx`.
- `app/lawyers/page.tsx` is a client component (static export → runtime fetch) with loading/error/empty states.

## Production config

- Create the bucket and a public access domain (or custom domain) → set `R2_PUBLIC_BASE_URL`.
- R2 API token with Object Read & Write scoped to the bucket → `wrangler secret put R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
- Bucket CORS for the admin origin: `PUT`, `AllowedHeaders: ["Content-Type"]`.

## Deferred (flagged, not dropped)

- Server-side size enforcement (`content-length-range` needs a POST policy).
- Orphan cleanup on replace/remove (delete via the `IMAGES` binding, or a lifecycle rule).
- Sharing label maps between admin and web.

## Verification

`pnpm --filter @vidhan/{api,admin,web} build` all pass. Local smoke test against miniflare: presign → PUT via binding → `GET /uploads/:key` 200 → create lawyer → admin and public responses both carry `imageUrl`.

## Open question

- Avatar in the Name cell vs a dedicated "Image" column in the admin table (currently avatar-in-name).
