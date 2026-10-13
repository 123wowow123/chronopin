// Whether an account is still being asked to confirm its email (0071).
//
// Alibaba Cloud never shares an address, so an account opened with it has
// none to confirm: it is neither nagged nor kept from posting. The exemption
// ends the moment it has an email - adding one on the profile page clears the
// confirmation like any other change of address, and the usual link applies.
// Shared by the server's posting gate and the banner, so they cannot disagree.

const NO_EMAIL_PROVIDERS = ['alibaba', 'alibabacn'];

export function emailConfirmationPending(user: {
  email?: string | null;
  emailVerifiedDateTime?: Date | string | null;
  provider?: string | null;
}): boolean {
  if (user.emailVerifiedDateTime) return false;
  if (!user.email && NO_EMAIL_PROVIDERS.includes(user.provider ?? '')) return false;
  return true;
}
