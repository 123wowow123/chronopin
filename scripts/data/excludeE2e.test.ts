import { describe, expect, it } from 'vitest';
import { excludeE2e } from './excludeE2e';

const users = [
  { id: 1, email: 'flynni2008@gmail.com' },
  { id: 64, email: 'e2e-mu1kdr1d@example.com' },
  { id: 71, email: 'E2E-mu1kmu51@example.com' },
  { id: 80, email: 'e2e-someone@gmail.com' },
];

const data = () => ({
  users,
  pins: [
    { id: 277, userId: 1, companyId: 7, favorites: [{ userId: 1 }, { userId: 64 }], likes: [{ userId: 71 }] },
    { id: 416, userId: 64, companyId: 141 },
    { id: 418, userId: 71, companyId: 141 },
    { id: 500, userId: 71, companyId: 7 },
  ],
  companies: [{ id: 7 }, { id: 141 }, { id: 200 }],
  comments: [
    { id: 1, userId: 1, pinId: 277 },
    { id: 2, userId: 64, pinId: 277 },
    { id: 3, userId: 1, pinId: 416 },
  ],
  follows: [
    { id: 1, followerId: 1, followeeId: 22 },
    { id: 2, followerId: 64, followeeId: 1 },
    { id: 3, followerId: 1, followeeId: 71 },
  ],
});

describe('excludeE2e', () => {
  it('drops e2e users and everything that belongs to them', () => {
    const out = excludeE2e(data());
    expect(out.users.map((u) => u.id)).toEqual([1, 80]);
    expect(out.pins.map((p) => p.id)).toEqual([277]);
    expect(out.comments.map((c) => c.id)).toEqual([1]);
    expect(out.follows.map((f) => f.id)).toEqual([1]);
    expect(out.dropped).toEqual({ users: 2, pins: 3, companies: 1 });
  });

  it('strips e2e favourites and likes from pins that are kept', () => {
    const [pin] = excludeE2e(data()).pins;
    expect(pin.favorites).toEqual([{ userId: 1 }]);
    expect(pin.likes).toEqual([]);
  });

  it('drops an account whose address names the spec it came from', () => {
    const out = excludeE2e({ ...data(), users: [...users, { id: 90, email: 'e2e-return-mu1kmu51@example.com' }] });
    expect(out.users.map((u) => u.id)).toEqual([1, 80]);
  });

  it('keeps a company a real pin still uses, and unused companies that predate the tests', () => {
    expect(excludeE2e(data()).companies.map((c) => c.id)).toEqual([7, 200]);
  });
});
