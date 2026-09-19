import { scoreComment } from '../extract/sentiment';
import { expirePinPage } from './cache';

// Scores a comment after its response has gone out (a model call is too slow
// to hold up posting), then lets the pin's page pick the score up.
export async function refreshSentiment(commentId: number) {
  const pinId = await scoreComment(commentId);
  if (pinId != null) {
    expirePinPage(pinId);
  }
}
