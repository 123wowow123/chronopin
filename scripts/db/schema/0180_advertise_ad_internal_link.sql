-- Our own "Advertise on Chronopin" tile opens the advertiser page of this
-- site itself (the Ads tab of the profile, which asks signed-out visitors to
-- sign in first), not the production address, so it works on any host.
UPDATE "Ad" SET "url" = '/profile/ads' WHERE "program" = 'advertise';
