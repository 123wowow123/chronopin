import { describe, expect, it } from 'vitest';
import { signToken } from './auth';
import { readVerifyToken, signVerifyToken, verificationEmail } from './emailVerification';

describe('verification links', () => {
  it('reads back the user and the address the link was sent to', async () => {
    expect(await readVerifyToken(await signVerifyToken(7, 'sam@example.com'))).toEqual({ id: 7, email: 'sam@example.com' });
  });

  it('refuses a session token, signed with the same secret', async () => {
    expect(await readVerifyToken(await signToken(7, 'user'))).toBe('invalid');
  });

  it('refuses anything that is not a token', async () => {
    expect(await readVerifyToken('')).toBe('invalid');
    expect(await readVerifyToken('abc.def.ghi')).toBe('invalid');
  });
});

describe('verificationEmail', () => {
  const urls = { link: 'https://chronopin.com/auth/verify-email?token=a&b', profileUrl: 'https://chronopin.com/profile', homeUrl: 'https://chronopin.com/' };

  it('escapes the name and the link in the HTML, and keeps the text plain', () => {
    const email = verificationEmail({ firstName: '<b>Sam</b>', email: 'sam@example.com' }, urls);
    expect(email.to).toBe('sam@example.com');
    expect(email.html).toContain('Hello &lt;b&gt;Sam&lt;/b&gt;,');
    expect(email.html).toContain('token=a&amp;b');
    expect(email.text).toContain('Hello <b>Sam</b>,');
    expect(email.text).toContain('token=a&b');
  });

  it('links the address to the profile and carries the logo inline', () => {
    const email = verificationEmail({ email: 'sam@example.com' }, urls);
    expect(email.html).toMatch(/<a class="cp-link" href="https:\/\/chronopin.com\/profile" [^>]*>sam@example.com<\/a>/);
    expect(email.html).toContain('src="cid:chronopin-logo"');
    expect(email.attachments).toEqual([expect.objectContaining({ contentId: 'chronopin-logo', filename: 'chronopin.png' })]);
  });

  it('greets by first name, else by handle', () => {
    expect(verificationEmail({ firstName: '', userName: '@chronopin', email: 'x@example.com' }, urls).text).toContain('Hello chronopin,');
    expect(verificationEmail({ email: 'x@example.com' }, urls).text).toContain('Hello,');
  });
});
