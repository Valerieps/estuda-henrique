# ADR-012: Card images in the Group Durable Object, served by the Worker

**Status:** Accepted
**Date:** 2026-11-15
**Decision:** Card images (phase 2: image cards and image occlusion, `docs/spec/cartas.md`) are
stored as blobs in the `Group` Durable Object's SQLite, in an `images` table (`id`, `owner_id`
(null = system), `mime`, `width`, `height`, `bytes`, `data` BLOB, `created_at`). The app shrinks
every photo before upload with a canvas (longest side 1600 px, WebP, falling back to JPEG) in
`src/infrastructure/`; the server refuses anything over 1 MB or with a type other than
`image/webp`, `image/jpeg` or `image/png`. Upload is `POST /api/images` with the raw bytes as the
body (the one API call that is not JSON), session and `Origin` checked like every command; it
returns the image id. Reading is `GET /api/images/<id>`: session checked, a personal image only for
its owner, system images for every member, `Cache-Control: private, max-age=31536000, immutable`
(an id never changes content), `X-Content-Type-Options: nosniff`, and the stored `mime`. Images are
never deleted with a note (same rule as notes: history stays); an unreferenced-image cleanup can
come later. Since images come from the app's own origin, `IMAGE_ORIGINS` and the CSP do not change.
**Why:** ADR-004 keeps all group data in one Durable Object; images under the same access checks
keep the privacy rules of ADR-009 without a second store. Volume is small (one student, hundreds of
images, about 300 KB each after resizing), well within the Durable Object's SQLite limits and the
2 MB row limit. Branch previews already get their own empty Group, so images there need no setup.
**Alternatives:** R2: cheaper per GB and streams large files, but a new binding, a second place
for private data, its own access checks, and a separate bucket for previews. Images in a third-party
host: a new origin and a minor's photos leaving Cloudflare (`docs/SEGURANCA.md`).
