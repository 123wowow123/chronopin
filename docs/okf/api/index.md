# API

* [Restaurant specials](restaurant-specials.md) - Manage database-backed offers from a session without redeploying (admin)
* [Restaurant seed](restaurant-seed.md) - POST to load the bundled restaurant catalogs (pins, photos, special venues) into a deployed server's database, dry run first (admin)
* [Admin table API](admin-db.md) - GET, POST, PATCH and DELETE the rows of any table, every write audited; make users that can log in (curator desks); how job results reach prod (admin)
* [Pin sources](pin-sources.md) - GET a pin's links and wikis, POST to run the pipeline now (admin)
* [Source wikis](source-wikis.md) - Send wikis written on the dev machine to the server: GET the pending links, POST finished wikis, or carry them on an admin pin post (admin)
* [Pin OKF bundle](pin-okf.md) - GET a pin and its links as an OKF bundle (admin)
* [Scraping API](scraping-api.md) - Design of a job-based scraping API with a pluggable LLM driver (not built yet)
* [Named searches](saved-searches.md) - Shared names for searches (pin lists especially), shown in everyone's popular searches with who named them; signed-in users name, anyone reads
* [Embed widget](embed-widget.md) - Public countdown/thread widget for any pin, one snippet for blogs, with a backlink to the pin page (/embed guide)
* [Calendar feeds](calendar-feeds.md) - Public .ics feeds for a tag, company, person or thread, to subscribe to in Google Calendar
* [Weekly digest email](weekly-digest.md) - Monday "my timeline" email of watched pins and followed companies/people, opt-in, admin switch and /admin/digest dashboard
