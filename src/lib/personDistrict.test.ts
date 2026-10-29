import { describe, expect, it } from 'vitest';
import { seatOf } from './personDistrict';

describe('seatOf', () => {
  it('reads a numbered House seat, with or without a committee note', () => {
    expect(seatOf("United States Representative from Florida's 28th congressional district")).toEqual({ state: 'Florida', district: 28, house: true });
    expect(seatOf("United States Representative from Ohio's 4th congressional district (Chair, House Committee on the Judiciary)")).toEqual({ state: 'Ohio', district: 4, house: true });
  });
  it('reads the newer "for ... district" wording', () => {
    expect(seatOf("U.S. Representative for Texas's 4th district (since 2021)")).toEqual({ state: 'Texas', district: 4, house: true });
  });
  it('reads an at-large seat', () => {
    expect(seatOf("United States Representative from Wyoming's at-large")).toEqual({ state: 'Wyoming', district: null, house: true });
  });
  it('reads a Senate seat', () => {
    expect(seatOf('United States Senator from Maine')).toEqual({ state: 'Maine', district: null, house: false });
    expect(seatOf('United States Senator from West Virginia (Chair, Committee)')).toEqual({ state: 'West Virginia', district: null, house: false });
  });
  it('has no seat for a leader title, a delegate or nothing', () => {
    expect(seatOf('Majority Leader of the United States Senate')).toBeNull();
    expect(seatOf("United States Delegate from Guam's at-large")).toBeNull();
    expect(seatOf(null)).toBeNull();
  });
});
