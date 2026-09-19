import { describe, expect, it } from 'vitest';
import BasePin from './basePin';

describe('BasePin author', () => {
  it('takes the author from a pin read back from its JSON (the seed backup)', () => {
    const pin = new BasePin({ id: 845, title: 'Pyramid', user: { id: 76, userName: '@BuildDesk', email: 'x@example.com' } });
    expect(pin.userId).toBe(76);
    // Only the public fields come along.
    expect(pin.toJSON().user).toEqual({ id: 76, userName: '@BuildDesk' });
  });

  it('prefers a userId column, as a database row has', () => {
    expect(new BasePin({ id: 1, userId: 5, user: { id: 9 } }).userId).toBe(5);
  });
});
