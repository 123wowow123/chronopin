-- 'update' notifications: a pin you watch was updated.
--
-- Watching a pin only ever told the watcher about its day and its start
-- (0022, 0084); a pin whose date moved, or whose article was rewritten from
-- newer sources, changed without a word. Now its watchers are told once the
-- article has been rewritten (the rewrite recorded in its Updates pane,
-- PinUpdate 0081), so what they open already says what changed; an edit or a
-- new link that brings no rewrite tells nobody. Everyone watching it is told
-- but the person who brought the update, who is the row's actor (the pin's
-- author for a rewrite no one person brought).
--
-- No new column. The unique index keeps one unread 'update' per watcher and
-- pin: a pin edited five times before they look is one bell entry, brought
-- up to date by each edit, and once read the next update is a new one.

CREATE UNIQUE INDEX "UX_Notification_update" ON "Notification" ("userId", "pinId")
  WHERE "type" = 'update' AND "utcReadDateTime" IS NULL AND "utcDeletedDateTime" IS NULL;
