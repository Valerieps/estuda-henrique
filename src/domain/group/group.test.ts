import { describe, expect, it } from 'vitest';
import { isPlausibleEmail, normalizeEmail } from './email';
import { normalizeName } from './profile';
import { canManageGroup, keepsAnAdmin, normalizeRoles, writesSystemCards } from './roles';

describe('roles', () => {
  it('lets only admins manage the group', () => {
    expect(canManageGroup({ roles: ['admin'] })).toBe(true);
    expect(canManageGroup({ roles: ['user'] })).toBe(false);
  });

  it('writes system cards for an admin, personal ones for a user, and asks one with both', () => {
    expect(writesSystemCards({ roles: ['admin'] }, false)).toBe(true);
    expect(writesSystemCards({ roles: ['user'] }, true)).toBe(false);
    expect(writesSystemCards({ roles: ['admin', 'user'] }, false)).toBe(false);
    expect(writesSystemCards({ roles: ['admin', 'user'] }, true)).toBe(true);
  });

  it('keeps an admin', () => {
    expect(keepsAnAdmin(['a', 'b'], 'a')).toBe(true);
    expect(keepsAnAdmin(['a'], 'a')).toBe(false);
  });

  it('drops unknown roles', () => {
    expect(normalizeRoles(['user', 'admin', 'king'])).toEqual(['admin', 'user']);
  });
});

describe('e-mail', () => {
  it('compares e-mails in one form', () => {
    expect(normalizeEmail(' Carla@Example.COM ')).toBe('carla@example.com');
    expect(isPlausibleEmail('carla@example.com')).toBe(true);
    expect(isPlausibleEmail('carla@')).toBe(false);
  });
});

describe('normalizeName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeName('  Carla   Souza ')).toBe('Carla Souza');
  });

  it('refuses empty and too long names', () => {
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('x'.repeat(41))).toBeNull();
    expect(normalizeName('x'.repeat(40))).toBe('x'.repeat(40));
  });
});
