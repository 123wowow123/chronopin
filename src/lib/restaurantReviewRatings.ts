import type { RestaurantDishReview } from './restaurantMenus';

// Editorial estimates from the saved excerpts, not scores published by their sources.
// Descriptions without an assessment deliberately have no estimate.
const estimates: Record<string, number> = {
  'decadently cheesy mushroom flan': 4.5,
  'delicate olive-flecked tuna tartare': 4,
  'This dish is why I could go vegetarian, but never vegan.': 5,
  'Cassineri’s are clouds': 4.5,
  'The balance was nonexistent for me.': 2,
  'fatty tuna is luscious': 4.5,
  'Skillful execution and creativity transform excellent quality product': 4.5,
  'the adult happy meal at Herb & Wood is more my speed.': 4,
  'It was delicious; maybe a wee bit too spicy for some, but we enjoyed the flavor.': 4,
  'I loved it that much.': 5,
  'the showstopper is a creamy, salty Caesar': 4.5,
  'The caesar salad bites? Yeah, that’s a non negotiable.': 5,
  'nicely paired with a side of purple sticky rice': 4,
  'the crispy provolone shone as the best appetizer': 4.5,
  'lacked that wow factor': 3,
  'a weighty slab of ricotta slathered atop a slice of bread': 2.5,
  'overpowering the other flavors': 2,
  'emerged as one of the stronger dishes': 4,
  'the squid is tender and the breading is incredibly light and crispy': 4.5,
  'a damn good kale salad': 4.5,
  "You'll see this in front of pretty much everyone at Socarrat. You should follow suit. It's good.": 4,
  'chorizo-wrapped dates are always a good choice': 4,
  "The rare oyster that catches you off guard, thanks to the hot sauce and the bivalve's creaminess.": 4.5,
  'Our favorite appetizer.': 5,
  'Toasty, togarashi-scented chile oil amplified the cloves’ mellow sweetness.': 4,
  'Menu standouts include the Wagyu picanha, steak frites and lobster tail with diavola butter, pickled shallot and scallions.': 4,
  'roasted oysters to morcilla (blood sausage) to steaks are excellent': 4.5,
  'we encourage you to give it a try. It’s really good': 4,
  'a simple but elegant appetizer that showcases pristine slices of silky butterfish': 4.5,
  'these tasted fresh and buttery': 4,
  'too bready and soft and the cheese was gooey': 2.5,
  'thick Calcutta pork ribs that come coated with a chutney glaze': 4,
  'Another go-to is their goat cheese-stuffed naan': 4,
  'you can’t go wrong with the parmesan truffle fries or potatoes gratin': 4.5,
  'this is just your standard bowl of miso soup': 2.5,
  'the fish doesn’t have much flavor to back it up': 2,
  'the tempura shrimp is stiff and tastes a bit stale': 2,
  'frying them, adding bacon, and coating them in a deliciously tangy dressing': 4.5,
  'A mix of sharp funky cheeses, springy noodles, and a golden brown top make this mac and cheese something we order on repeat': 4.5,
};

export function inferredReviewRating(review: RestaurantDishReview): number | null {
  const quote = review.quote.trim();
  return Object.hasOwn(estimates, quote) ? estimates[quote] : null;
}

export function inferredMenuItemRating(reviews: RestaurantDishReview[] = []): number | null {
  const ratings = reviews.map(inferredReviewRating).filter((rating): rating is number => rating != null);
  return ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : null;
}
