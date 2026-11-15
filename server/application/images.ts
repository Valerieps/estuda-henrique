// Card images (ADR-012): blobs in the Group's SQLite. A personal image is its owner's alone, even
// against an admin (ADR-009); a system image is read by every active member and written only by an
// admin who asks for it.
import { writesSystemCards } from '../../src/domain/group/roles';
import { nowIso, type Context } from './context';
import type { Member } from './members';

export const IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export const MAX_IMAGE_BYTES = 1_000_000;
const MAX_SIDE = 10_000;

export interface ImageUpload {
  readonly mime: string;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
  /** An admin saving an image for every member. */
  readonly system?: boolean;
}

export interface StoredImage {
  readonly mime: string;
  readonly data: Uint8Array;
}

export type SaveImageResult = { ok: true; id: string } | { ok: false; error: 'invalid' | 'forbidden' };

const startsWith = (data: Uint8Array, bytes: readonly number[], offset = 0) => bytes.every((byte, i) => data[offset + i] === byte);

/** The stored mime is served back with nosniff, so the bytes must really be what the client says. */
function matchesMime(mime: string, data: Uint8Array): boolean {
  if (mime === 'image/png') return startsWith(data, [0x89, 0x50, 0x4e, 0x47]);
  if (mime === 'image/jpeg') return startsWith(data, [0xff, 0xd8, 0xff]);
  return startsWith(data, [0x52, 0x49, 0x46, 0x46]) && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8);
}

const validSide = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_SIDE;

export function saveImage(ctx: Context, actor: Member, upload: ImageUpload): SaveImageResult {
  const { mime, width, height, data } = upload;
  if (!(IMAGE_MIMES as readonly string[]).includes(mime)) return { ok: false, error: 'invalid' };
  if (data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES) return { ok: false, error: 'invalid' };
  if (!validSide(width) || !validSide(height) || !matchesMime(mime, data)) return { ok: false, error: 'invalid' };
  const system = upload.system === true;
  if (system && !writesSystemCards(actor, true)) return { ok: false, error: 'forbidden' };
  const id = ctx.ids.next();
  ctx.sql.run(
    'INSERT INTO images (id, owner_id, mime, width, height, bytes, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    system ? null : actor.id,
    mime,
    width,
    height,
    data.byteLength,
    data,
    nowIso(ctx),
  );
  return { ok: true, id };
}

/** The image, or null when it does not exist or is not the actor's to see (the same answer). */
export function readImage(ctx: Context, actor: Member, id: string): StoredImage | null {
  const [row] = ctx.sql.all<{ owner_id: string | null; mime: string; data: Uint8Array }>('SELECT owner_id, mime, data FROM images WHERE id = ?', id);
  if (!row || (row.owner_id !== null && row.owner_id !== actor.id)) return null;
  return { mime: row.mime, data: new Uint8Array(row.data) };
}
