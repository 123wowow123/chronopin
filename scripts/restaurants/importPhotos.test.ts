import { describe, expect, it } from 'vitest';
import { resolveImportPhotos } from './importPhotos';
const source = 'https://example.com/osaka/happy-hour';
const url = 'https://chronopin.blob.core.windows.net/thumb/osaka.webp';
const photo = { src: url, credit: 'Osaka operator', sourceUrl: source, alt: 'Branch promotion' };

describe('restaurant import gallery recovery', () => {
  it('recovers the saved specials photo when the imported gallery is empty', () => {
    expect(resolveImportPhotos(source, [], undefined, { enabled: true, profile: { pinSourceUrl: source, photo } })).toEqual([{ url, credit: photo.credit, note: photo.alt, sourcePage: source }]);
  });
  it('recovers the saved tile photo without duplicating an explicit gallery image', () => {
    const gallery = [{ url, credit: 'Photographer', sourcePage: source, note: 'Full gallery caption', sha256: 'hash' }];
    expect(resolveImportPhotos(source, gallery, { enabled: true, profile: { pinSourceUrl: source, tile: { image: url, imageCredit: photo.credit, imageSourceUrl: source } } })).toEqual(gallery);
  });
  it('does not revive a disabled saved profile', () => {
    expect(resolveImportPhotos(source, [], { enabled: false, profile: { pinSourceUrl: source, tile: { image: url, imageCredit: photo.credit, imageSourceUrl: source } } })).toEqual([]);
  });
  it('rejects photos belonging to another branch', () => {
    expect(() => resolveImportPhotos(source, [], undefined, { enabled: true, profile: { pinSourceUrl: 'https://example.com/tokyo', photo } })).toThrow('another restaurant branch');
  });
  it('requires provenance for a recovered guide photo', () => {
    expect(() => resolveImportPhotos(source, [], { enabled: true, profile: { pinSourceUrl: source, tile: { image: url, imageCredit: '' } } })).toThrow('provenance');
  });
});
