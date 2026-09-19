import { describe, expect, it } from 'vitest';
import { picturesNeeded } from './mediaTarget';

describe('picturesNeeded', () => {
  it('tops an empty pin up to three pictures', () => {
    expect(picturesNeeded(0, 0)).toBe(3);
  });
  it('counts a video toward the three, but still asks for a picture', () => {
    expect(picturesNeeded(1, 0)).toBe(2);
    expect(picturesNeeded(3, 0)).toBe(1);
  });
  it('needs nothing once there are three media with a picture among them', () => {
    expect(picturesNeeded(3, 1)).toBe(0);
    expect(picturesNeeded(4, 2)).toBe(0);
  });
  it('asks for the difference when pictures are the only media', () => {
    expect(picturesNeeded(1, 1)).toBe(2);
    expect(picturesNeeded(2, 2)).toBe(1);
  });
});
