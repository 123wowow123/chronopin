// How a pin's comments feel, taken together, and which way that is moving.
// Each comment carries Claude's -1..1 score (null until scored, and those sit
// out). The trend sets the newest third of the scored comments against the
// ones before them.

export type Mood = 'positive' | 'mixed' | 'negative';
export type MoodTrend = 'warming' | 'cooling' | 'steady';

export type CommentMood = {
  // How many comments the mood is read from.
  scored: number;
  average: number;
  mood: Mood;
  // Null until there are enough scored comments to compare old with new.
  trend: MoodTrend | null;
};

// Beyond this, the average reads as positive or negative rather than mixed.
const MOOD_THRESHOLD = 0.25;
// How far the newest comments must sit from the older ones to count as a move.
const TREND_THRESHOLD = 0.2;
// Fewer scored comments than this is too few to call a direction.
const MIN_FOR_TREND = 4;

type Scored = { sentiment?: number | null; utcCreatedDateTime: string };

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

export function moodOf(average: number): Mood {
  if (average >= MOOD_THRESHOLD) return 'positive';
  if (average <= -MOOD_THRESHOLD) return 'negative';
  return 'mixed';
}

// Null when no comment has been scored yet.
export function commentMood(comments: Scored[]): CommentMood | null {
  const scores = comments
    .filter((c): c is Scored & { sentiment: number } => typeof c.sentiment === 'number')
    .sort((a, b) => Date.parse(a.utcCreatedDateTime) - Date.parse(b.utcCreatedDateTime))
    .map((c) => c.sentiment);
  if (!scores.length) return null;

  const average = mean(scores);
  let trend: MoodTrend | null = null;
  if (scores.length >= MIN_FOR_TREND) {
    const recentCount = Math.max(2, Math.round(scores.length / 3));
    const shift = mean(scores.slice(-recentCount)) - mean(scores.slice(0, -recentCount));
    trend = shift >= TREND_THRESHOLD ? 'warming' : shift <= -TREND_THRESHOLD ? 'cooling' : 'steady';
  }
  return { scored: scores.length, average, mood: moodOf(average), trend };
}
