import { describe, expect, it } from 'vitest';
import { HttpError } from '../util/httpError';
import { generatedPassword, newUserFields } from './adminUsers';

const desk = { userName: '@ArtDesk', firstName: 'Art', lastName: 'Desk', email: 'artdesk.curator@chronopin.local' };
const message = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return ((err as HttpError).body as { message: string }).message;
  }
  throw new Error('did not throw');
};

describe('newUserFields', () => {
  it('makes up a password, a plain user role and a confirmed email by default', () => {
    const made = newUserFields(desk);
    expect(made.generated).toBe(true);
    expect(made.password).toMatch(/^[A-Za-z0-9_-]{20}$/);
    expect(made.fields).toEqual({ ...desk, role: 'user', phone: null });
    expect(made.emailVerified).toBe(true);
  });

  it('keeps a given password, role and unconfirmed email', () => {
    const made = newUserFields({ ...desk, password: 'correct horse', role: 'admin', emailVerified: false });
    expect(made).toMatchObject({ password: 'correct horse', generated: false, emailVerified: false, fields: { role: 'admin' } });
  });

  it('ignores columns a create must not set', () => {
    const made = newUserFields({ ...desk, id: 1, salt: 'x', provider: 'google', emailVerifiedDateTime: null });
    expect(Object.keys(made.fields).sort()).toEqual(['email', 'firstName', 'lastName', 'phone', 'role', 'userName']);
  });

  it('refuses a missing name, an unknown role and a bad password or flag', () => {
    expect(message(() => newUserFields({ ...desk, lastName: ' ' }))).toBe('lastName is required');
    expect(message(() => newUserFields({ ...desk, role: 'owner' }))).toContain('role must be one of');
    expect(message(() => newUserFields({ ...desk, password: '' }))).toContain('password');
    expect(message(() => newUserFields({ ...desk, emailVerified: 'yes' }))).toContain('emailVerified');
    expect(message(() => newUserFields([desk]))).toBe('Expected a user object');
  });
});

describe('generatedPassword', () => {
  it('differs each time', () => {
    expect(generatedPassword()).not.toBe(generatedPassword());
  });
});
