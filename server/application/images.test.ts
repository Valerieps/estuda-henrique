import { beforeEach, describe, expect, it } from 'vitest';
import { fixedClock, emptyDeckSql, sequentialIds } from '../testing/node-sql';
import { GroupService } from './group-service';
import { MAX_IMAGE_BYTES, type ImageUpload } from './images';

const profile = (email: string) => ({ sub: `sub:${email}`, email, name: email.split('@')[0], picture: null });

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const upload = (over: Partial<ImageUpload> = {}): ImageUpload => ({ mime: 'image/png', width: 10, height: 20, data: PNG, ...over });

let service: GroupService;

beforeEach(() => {
  service = new GroupService(emptyDeckSql(), fixedClock('2026-10-21T12:00:00Z'), sequentialIds());
  service.migrate();
  service.signIn(profile('ana@example.com'), 'h-admin', ['ana@example.com']);
  for (const name of ['henrique', 'bia']) {
    service.command('h-admin', 'invite.create', { email: `${name}@example.com` });
    service.signIn(profile(`${name}@example.com`), `h-${name}`, []);
  }
});

const saved = (hash: string, over?: Partial<ImageUpload>) => {
  const result = service.saveImage(hash, upload(over));
  if (!result.ok) throw new Error(result.error);
  return result.id;
};

describe('images', () => {
  it('stores a personal image and gives the same bytes back to its owner', () => {
    const id = saved('h-henrique');
    expect(service.readImage('h-henrique', id)).toEqual({ mime: 'image/png', data: PNG });
  });

  it('keeps a personal image from everyone else, admin included', () => {
    const id = saved('h-henrique');
    expect(service.readImage('h-bia', id)).toBeNull();
    expect(service.readImage('h-admin', id)).toBeNull();
  });

  it('lets an admin save a system image that every member reads', () => {
    const id = saved('h-admin', { system: true });
    expect(service.readImage('h-henrique', id)).toMatchObject({ mime: 'image/png' });
    expect(service.readImage('h-bia', id)).toMatchObject({ mime: 'image/png' });
  });

  it('refuses the system flag from a member who is not an admin', () => {
    expect(service.saveImage('h-henrique', upload({ system: true }))).toEqual({ ok: false, error: 'forbidden' });
  });

  it('refuses unknown sessions', () => {
    expect(service.saveImage('nope', upload())).toEqual({ ok: false, error: 'unauthenticated' });
    expect(service.readImage('nope', 'x')).toBe('unauthenticated');
  });

  it('answers a missing image like a private one', () => {
    expect(service.readImage('h-henrique', 'missing')).toBeNull();
  });

  it('refuses other types, empty and oversized bodies, bad sizes and bytes that are not the type', () => {
    for (const bad of [
      upload({ mime: 'image/svg+xml' }),
      upload({ data: new Uint8Array(0) }),
      upload({ data: new Uint8Array(MAX_IMAGE_BYTES + 1).fill(0x89) }),
      upload({ width: 0 }),
      upload({ height: 1.5 }),
      upload({ mime: 'image/jpeg' }),
      upload({ mime: 'image/webp' }),
    ]) {
      expect(service.saveImage('h-henrique', bad)).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it('accepts webp and jpeg with the right signatures', () => {
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(service.saveImage('h-henrique', upload({ mime: 'image/webp', data: webp })).ok).toBe(true);
    expect(service.saveImage('h-henrique', upload({ mime: 'image/jpeg', data: new Uint8Array([0xff, 0xd8, 0xff, 0]) })).ok).toBe(true);
  });
});
