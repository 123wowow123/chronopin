import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => ({ query: vi.fn(), exactListing: vi.fn(), hasKeys: vi.fn() }));
vi.mock('@/server/db', () => ({ query: mock.query }));
vi.mock('@/server/ebay', () => ({ exactListing: mock.exactListing, hasKeys: mock.hasKeys }));
import { GET } from './route';

const request = () => new NextRequest('http://localhost:3000/api/pins/20445/shop');
const ctx = () => ({ params: Promise.resolve({ id: '20445' }) });

beforeEach(() => {
  vi.resetAllMocks();
  mock.hasKeys.mockReturnValue(true);
  mock.query.mockResolvedValue([{ productName: 'Gemini 4 Carbon', hasEbay: false, tagNames: ['AI Models', 'Gemini'], categories: ['AI', 'Cybersecurity'] }]);
});

describe('live marketplace eligibility', () => {
  it('never searches eBay for an AI model, even with a populated product name', async () => {
    expect((await GET(request(), ctx())).status).toBe(204);
    expect(mock.exactListing).not.toHaveBeenCalled();
  });

  it('still looks up physical products', async () => {
    mock.query.mockResolvedValue([{ productName: 'Google Pixel Watch 5', hasEbay: false, tagNames: [], categories: ['Electronics'] }]);
    const match = { store: 'eBay', title: 'Google Pixel Watch 5', price: 349, currency: 'USD', url: 'https://www.ebay.com/itm/123' };
    mock.exactListing.mockResolvedValue(match);
    const response = await GET(request(), ctx());
    expect(await response.json()).toEqual({ matches: [match] });
    expect(mock.exactListing).toHaveBeenCalledWith('Google Pixel Watch 5');
  });

  it('does not look up full-size cars', async () => {
    mock.query.mockResolvedValue([{ productName: 'Xiaomi SU7 Ultra', hasEbay: false, tagNames: [], categories: ['Automotive'] }]);
    expect((await GET(request(), ctx())).status).toBe(204);
    expect(mock.exactListing).not.toHaveBeenCalled();
  });
});
