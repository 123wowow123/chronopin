import { describe, expect, it } from 'vitest';
import { emailConfirmationPending } from './emailConfirmation';

describe('emailConfirmationPending', () => {
  it('asks an unconfirmed password or social account to confirm', () => {
    expect(emailConfirmationPending({ email: 'a@b.co', provider: 'local' })).toBe(true);
    expect(emailConfirmationPending({ email: 'a@b.co', provider: 'google', emailVerifiedDateTime: null })).toBe(true);
  });

  it('leaves a confirmed account alone', () => {
    expect(emailConfirmationPending({ email: 'a@b.co', emailVerifiedDateTime: '2026-10-13T00:00:00Z' })).toBe(false);
  });

  it('exempts an Alibaba account that has no email', () => {
    expect(emailConfirmationPending({ email: null, provider: 'alibaba' })).toBe(false);
    expect(emailConfirmationPending({ provider: 'alibabacn' })).toBe(false);
  });

  it('asks again once an Alibaba account adds an email', () => {
    expect(emailConfirmationPending({ email: 'me@example.com', provider: 'alibaba', emailVerifiedDateTime: null })).toBe(true);
  });

  it('does not exempt other providers without an email', () => {
    expect(emailConfirmationPending({ email: null, provider: 'local' })).toBe(true);
  });
});
