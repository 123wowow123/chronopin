import { describe, expect, it } from 'vitest';
import { cityOf } from './city';

// Addresses as pins carry them, hand-written and reverse-geocoded.
describe('cityOf', () => {
  it.each([
    ['Anthropic, 500 Howard Street, San Francisco, CA', 'San Francisco'],
    ['Etsy, Inc., 117, Adams Street, Dumbo, Brooklyn, Kings County, New York, 11201, United States', 'Brooklyn'],
    ['Steinway Tower, 111 West 57th Street, New York, New York, United States', 'New York'],
    ['Little Island, Hudson River Park, New York, NY, USA', 'New York'],
    ['New York City, New York, United States', 'New York City'],
    ['Indianapolis, Indiana', 'Indianapolis'],
    ['19th Avenue South, Nashville, Davidson County, Middle Tennessee, Tennessee, 37203, United States', 'Nashville'],
    ['Johnson & Johnson World Headquarters, 1 Johnson and Johnson Plaza, New Brunswick, New Jersey 08933, United States', 'New Brunswick'],
    ['White House, 1600 Pennsylvania Avenue NW, Washington, D.C. 20500, United States', 'Washington'],
    ['Roberts Children\'s Health, 3401 Civic Center Boulevard, Philadelphia, PA 19104', 'Philadelphia'],
    ['Guadalupe Street at Republic Square, downtown Austin, TX 78701, United States', 'Austin'],
    ['Nakano, Nakano-ku, Tokyo, Japan', 'Tokyo'],
    ['3-31-1 Nakano, Japan', 'Nakano'],
    ['Metro Toronto Convention Centre - North Building, Front Street West, Toronto, Ontario M5V 3H6, Canada', 'Toronto'],
    ['British Columbia Parliament Buildings, 501 Belleville Street, Victoria, British Columbia V8W 9W2, Canada', 'Victoria'],
    ['Rod Laver Arena, Melbourne Park, Olympic Boulevard, Melbourne VIC 3000, Australia', 'Melbourne'],
    ['London Bridge Station, London SE1 9SP, UK', 'London'],
    ['Royal Astronomical Society, Piccadilly, St. James\'s, Westminster, Mayfair, City of Westminster, Greater London, England, W1J 0PA, United Kingdom', 'London'],
    ['Rayleigh, Essex, England, UK', 'Rayleigh'],
    ['Bewley\'s Café, 78-79, Grafton Street, Royal Exchange B Ward 1986, Dublin, County Dublin, Leinster, D02 F798, Ireland', 'Dublin'],
    ['Via Modena 12, 40019 Sant\'Agata Bolognese (BO), Italy', 'Sant\'Agata Bolognese'],
    ['Europa-Park-Straße 2, 77977 Rust, Germany', 'Rust'],
    ['FOUR Frankfurt, Junghofstraße, Innenstadt, Frankfurt am Main, Hessen, Germany', 'Frankfurt am Main'],
    ['50, Bålyveien, Båly, Nyresnes, Spangereid, Lindesnes, Agder, 4521, Norge', 'Lindesnes'],
    ['Chembur, Mumbai, Maharashtra, India', 'Mumbai'],
    ['Palacio do Planalto, Praca dos Tres Poderes, Brasilia, Brazil', 'Brasilia'],
    ['Lok Ma Chau Loop, New Territories, Hong Kong', 'Hong Kong'],
    ['Asagaya-minami 1-18-6, Suginami, Tokyo, Japan (Topcraft, dissolved 1985)', 'Tokyo'],
    ['花江峡谷大桥, 关岭布依族苗族自治县, 安顺市, 贵州省, 中国', '安顺市'],
    ['Lima, Peru', 'Lima'],
  ])('%s -> %s', (address, city) => {
    expect(cityOf(address)).toBe(city);
  });

  it.each([
    'New South Wales, Australia',
    'Somerset, England',
    'Chesterfield County, Virginia, United States',
    'Point of greatest eclipse at sea, off Chile',
    'Abbott Labs, 100, Abbott Park Road, Illinois, 60064, United States',
    'Peru',
    '',
  ])('%s has no city', (address) => {
    expect(cityOf(address)).toBeNull();
  });
});
