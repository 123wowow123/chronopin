-- A pin that already existed and was just given a company is an update for that
-- company's followers, not a new pin: type 'companyUpdate', the same row shape
-- as 'company'. One per follower, pin and company, so editing again tells nobody twice.
CREATE UNIQUE INDEX "UX_Notification_companyUpdate" ON "Notification" ("userId", "pinId", "companyId") WHERE "type" = 'companyUpdate';
