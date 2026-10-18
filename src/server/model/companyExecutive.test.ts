import { describe, expect, it } from 'vitest';
import { executiveRank } from './companyExecutive';

describe('executiveRank', () => {
  it('orders the chief executive first and a seat named with others by the highest', () => {
    expect(executiveRank('Chief Executive Officer')).toBe(1);
    expect(executiveRank('Chairman and CEO')).toBe(1);
    expect(executiveRank('President and Chief Financial Officer')).toBe(2);
    expect(executiveRank('Executive Vice President, CFO')).toBe(3);
    expect(executiveRank('Chief Operating Officer')).toBe(4);
    expect(executiveRank('Chief Technology Officer')).toBe(5);
    expect(executiveRank('Chief Legal Officer')).toBe(6);
  });
});
