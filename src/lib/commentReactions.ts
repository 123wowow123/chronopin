// The reactions a comment takes (0075), in the order the picker shows them
// (Messenger's), with the emoji each is drawn as. The names are what CommentReaction stores
// and its CHECK allows.
export const COMMENT_REACTIONS = [
  { name: 'love', emoji: '❤️', label: 'comments.reactionLove' },
  { name: 'haha', emoji: '😆', label: 'comments.reactionHaha' },
  { name: 'wow', emoji: '😮', label: 'comments.reactionWow' },
  { name: 'sad', emoji: '😢', label: 'comments.reactionSad' },
  { name: 'angry', emoji: '😡', label: 'comments.reactionAngry' },
  { name: 'like', emoji: '👍', label: 'comments.reactionLike' },
] as const;

export type CommentReactionName = (typeof COMMENT_REACTIONS)[number]['name'];

export function isCommentReaction(value: unknown): value is CommentReactionName {
  return COMMENT_REACTIONS.some((r) => r.name === value);
}
