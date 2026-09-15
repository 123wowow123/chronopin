// Playwright runs (tests/e2e) sign up throwaway users against the dev database
// and leave them, their pins and the company their pin names behind. These
// filters keep that residue out of the seed files so a backup never needs
// hand-editing afterwards.

type Row = Record<string, any>;

// tests/e2e/account.spec.ts signs up as e2e-<stamp>@example.com.
const E2E_EMAIL = /^e2e-[a-z0-9]+@example\.com$/i;

export function e2eUserIds(users: Row[]): Set<number> {
  return new Set(users.filter((u) => typeof u.email === 'string' && E2E_EMAIL.test(u.email)).map((u) => u.id));
}

export function excludeE2e<P extends Row>(
  data: { users: Row[]; pins: P[]; companies: Row[]; comments: Row[]; follows: Row[] },
) {
  const userIds = e2eUserIds(data.users);
  const isE2eUser = (id: unknown) => userIds.has(id as number);

  const droppedPins = data.pins.filter((p) => isE2eUser(p.userId));
  const pins = data.pins.filter((p) => !isE2eUser(p.userId));
  for (const pin of pins) {
    if (Array.isArray(pin.favorites)) (pin as Row).favorites = pin.favorites.filter((f: Row) => !isE2eUser(f.userId));
    if (Array.isArray(pin.likes)) (pin as Row).likes = pin.likes.filter((l: Row) => !isE2eUser(l.userId));
    // A reference an e2e user added to a kept pin stays, uncredited: that user is not restored.
    for (const r of Array.isArray(pin.references) ? pin.references : []) {
      if (isE2eUser(r.addedByUserId)) Object.assign(r, { addedByUserId: null, addedByUserName: null, addedByUserPictureUrl: null });
    }
  }

  // Only a company that e2e pins named and no kept pin uses; an unused company
  // that predates the tests stays.
  const keptCompanyIds = new Set(pins.map((p) => p.companyId));
  const droppedCompanyIds = new Set(droppedPins.map((p) => p.companyId).filter((id) => id != null && !keptCompanyIds.has(id)));
  const droppedPinIds = new Set(droppedPins.map((p) => p.id));

  return {
    users: data.users.filter((u) => !isE2eUser(u.id)),
    pins,
    companies: data.companies.filter((c) => !droppedCompanyIds.has(c.id)),
    comments: data.comments.filter((c) => !isE2eUser(c.userId) && !droppedPinIds.has(c.pinId)),
    follows: data.follows.filter((f) => !isE2eUser(f.followerId) && !isE2eUser(f.followeeId)),
    dropped: { users: userIds.size, pins: droppedPins.length, companies: droppedCompanyIds.size },
  };
}
