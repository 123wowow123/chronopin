import * as db from '../../src/server/db';

export const RESORT_PRICE_RANGES: Record<number, { min: number; max: number; currency: string }> = {
  // Capella Kyoto: ¥185,000 to ¥360,000 ($1,250 - $2,400)
  15302: { min: 1250, max: 2400, currency: 'USD' },
  // Four Seasons Hotel and Residences Cartagena: $750 - $1,400
  15274: { min: 750, max: 1400, currency: 'USD' },
  // Waldorf Astoria Rabat-Salé: 5,500 MAD to 11,000 MAD ($550 - $1,100)
  15290: { min: 550, max: 1100, currency: 'USD' },
  // Corinthia Rome: €1,100 to €2,000 ($1,200 - $2,200)
  15292: { min: 1200, max: 2200, currency: 'USD' },
  // Six Senses London: £850 to £1,650 ($1,100 - $2,100)
  15303: { min: 1100, max: 2100, currency: 'USD' },
  // Aman New York: $2,200 - $3,800
  4058: { min: 2200, max: 3800, currency: 'USD' },
  // 1 Hotel Tokyo: ¥110,000 to ¥200,000 ($750 - $1,350)
  15283: { min: 750, max: 1350, currency: 'USD' },
  // Four Seasons Tokyo at Marunouchi: ¥165,000 to ¥290,000 ($1,100 - $1,950)
  15284: { min: 1100, max: 1950, currency: 'USD' },
  // The St. Regis Budapest: €650 to €1,200 ($700 - $1,300)
  15288: { min: 700, max: 1300, currency: 'USD' },
  // Amoh, a Luxury Collection Resort, Rhodes: €550 to €1,100 ($600 - $1,200)
  15289: { min: 600, max: 1200, currency: 'USD' },
  // Cheval Blanc Seychelles: €2,400 to €4,800 ($2,600 - $5,200)
  4129: { min: 2600, max: 5200, currency: 'USD' },
  // Amanvari, Baja: $1,950 - $3,500
  15278: { min: 1950, max: 3500, currency: 'USD' },
  // Four Seasons Hotel Mykonos: €1,200 to €2,400 ($1,300 - $2,600)
  15295: { min: 1300, max: 2600, currency: 'USD' },
  // Rosewood Mandarina: $1,450 - $2,800
  15275: { min: 1450, max: 2800, currency: 'USD' },
  // COMO Le Beauvallon, Gulf of Saint-Tropez: €1,150 to €2,300 ($1,250 - $2,500)
  15293: { min: 1250, max: 2500, currency: 'USD' },
  // Mandapa, a Ritz-Carlton Reserve, Bali: $1,100 - $2,200
  15279: { min: 1100, max: 2200, currency: 'USD' },
  // Amangiri, Utah: $2,800 - $4,600
  15280: { min: 2800, max: 4600, currency: 'USD' },
  // Danieli, Venezia, a Four Seasons Hotel: €1,350 to €2,700 ($1,450 - $2,900)
  15294: { min: 1450, max: 2900, currency: 'USD' },
  // Janu Tokyo, Azabudai Hills: ¥140,000 to ¥260,000 ($950 - $1,750)
  15282: { min: 950, max: 1750, currency: 'USD' },
  // Bulgari Hotel Roma: €1,600 to €3,100 ($1,750 - $3,400)
  15285: { min: 1750, max: 3400, currency: 'USD' },
  // Raffles London at The OWO: £1,100 to £2,000 ($1,400 - $2,600)
  15276: { min: 1400, max: 2600, currency: 'USD' },
  // Atlantis The Royal, Dubai: AED 3,200 to AED 7,200 ($870 - $1,950)
  15286: { min: 870, max: 1950, currency: 'USD' },
  // Raffles Jeddah: SAR 3,000 to SAR 6,000 ($800 - $1,600)
  15291: { min: 800, max: 1600, currency: 'USD' },
  // Passalacqua, Lake Como: €1,800 to €3,300 ($1,950 - $3,600)
  15281: { min: 1950, max: 3600, currency: 'USD' },
  // Royal Mansour Tamuda Bay: €950 to €1,950 ($1,050 - $2,100)
  15277: { min: 1050, max: 2100, currency: 'USD' },
  // ICEHOTEL 365, Sweden: SEK 8,500 to SEK 15,500 ($820 - $1,500)
  763: { min: 820, max: 1500, currency: 'USD' },
  // Amankora, Bhutan: $2,100 - $3,200
  15287: { min: 2100, max: 3200, currency: 'USD' },
  // Mashpi Lodge, Ecuador: $1,350 - $2,100
  520: { min: 1350, max: 2100, currency: 'USD' },
  // Bürgenstock Resort Lake Lucerne: CHF 1,200 to CHF 2,300 ($1,350 - $2,600)
  836: { min: 1350, max: 2600, currency: 'USD' },
  // Singita Kwitonda Lodge, Rwanda: $2,450 - $3,950
  5156: { min: 2450, max: 3950, currency: 'USD' },
  // Explora Patagonia, Chile: $1,650 - $2,600
  3234: { min: 1650, max: 2600, currency: 'USD' },
  // Arctic Bath, Sweden: SEK 9,200 to SEK 16,000 ($890 - $1,550)
  3404: { min: 890, max: 1550, currency: 'USD' },
};

async function main() {
  for (const [idStr, r] of Object.entries(RESORT_PRICE_RANGES)) {
    const id = Number(idStr);
    await db.query(
      `UPDATE "Pin" SET price = $1, "priceLowerBound" = $1, "priceUpperBound" = $2, "priceCurrency" = $3 WHERE id = $4`,
      [r.min, r.max, r.currency, id],
    );
    console.log(`Updated pin ${id} with price range $${r.min} - $${r.max} ${r.currency}`);
  }
  console.log('Finished updating resort price ranges in database.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
