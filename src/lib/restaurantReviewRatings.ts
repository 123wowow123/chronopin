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
};

export function inferredReviewRating(review: RestaurantDishReview): number | null {
  const quote = review.quote.trim();
  return Object.hasOwn(estimates, quote) ? estimates[quote] : null;
}

export function inferredMenuItemRating(reviews: RestaurantDishReview[] = []): number | null {
  const ratings = reviews.map(inferredReviewRating).filter((rating): rating is number => rating != null);
  return ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : null;
}
