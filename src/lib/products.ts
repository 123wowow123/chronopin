// Computing is left off: its pins are chips, supercomputers and retired
// headsets, news rather than something to buy.
// The /products landing page: product pins by shelf, each with where to buy
// it. The shelves are the categories whose pins are goods you can buy (not
// films, restaurants or events); see src/server/model/products.ts.

// A shelf is a category or a tag its pins carry, shown under its label. Order
// is the page's tab order, and a pin sits on the first shelf that has it.
export const PRODUCT_SHELVES = [
  { name: 'Electronics', label: 'Electronics' },
  { name: 'Audio', label: 'Audio' },
  { name: 'Fashion', label: 'Fashion' },
  { name: 'Watches', label: 'Watches' },
  { name: 'Gaming', label: 'Video Games' },
  { name: 'Tabletop', label: 'Board & Card Games' },
  { name: 'Collectibles', label: 'Collectibles' },
  { name: 'Snack', label: 'Snacks' },
  { name: 'Alcoholic Drinks', label: 'Beer & Alcoholic Drinks' },
  { name: 'Comics', label: 'Comics' },
];

// Products on one shelf.
export const SHELF_SIZE = 12;

// Fewer than this and the page is thin: it asks not to be indexed.
export const MIN_INDEXED_PRODUCTS = 8;
