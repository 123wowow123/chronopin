-- Claude's read on a comment's tone, from -1 (hostile, disappointed) through
-- 0 (neutral, a question, a plain fact) to 1 (delighted, supportive). Null
-- until scored, and again after an edit until it is re-scored. The pin page
-- sums these into the comments' overall mood and which way it is moving.

ALTER TABLE "Comment"
  ADD COLUMN "sentiment" real CHECK ("sentiment" BETWEEN -1 AND 1);
