[![Build Status](https://travis-ci.org/123wowow123/chronopin_node.svg?branch=master)](https://travis-ci.org/123wowow123/chronopin_node) [![Dependency Status](https://david-dm.org/123wowow123/chronopin_node.svg)](https://david-dm.org/123wowow123/chronopin_node) [![devDependency Status](https://david-dm.org/123wowow123/chronopin_node/dev-status.svg)](https://david-dm.org/123wowow123/chronopin_node#info=devDependencies) [![Coverage Status](https://coveralls.io/repos/github/123wowow123/chronopin_node/badge.svg?branch=master)](https://coveralls.io/github/123wowow123/chronopin_node?branch=master)

# chronopin-node

This project was generated with the [Angular Full-Stack Generator](https://github.com/DaftMonk/generator-angular-fullstack) version 3.7.6.

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js and npm](nodejs.org) Node ^4.2.3, npm ^2.14.7
- [Bower](bower.io) (`npm install --global bower`)
- [Ruby](https://www.ruby-lang.org) and then `gem install sass`
- [Grunt](http://gruntjs.com/) (`npm install --global grunt-cli`)
- [SQLite](https://www.sqlite.org/quickstart.html)

### Developing

1. Run `npm install` to install server dependencies.

2. Run `bower install` to install front-end dependencies.

3. Run `grunt serve` to start the development server. It should automatically open the client in your browser when ready.

## Build & development

Run `grunt build` for building and `grunt serve` for preview.

## Run Docker Build

Run `docker build -t chronopin_node .`

## Run Docker Container

Run `docker run -p 9000:9000 chronopin_node`

Or

Run `docker run chronopin_node`

## Upload Docker Image

Run `docker login`

Run `docker tag chronopin_node 123wowow123/chronopin_node:latest`

Run `docker push 123wowow123/chronopin_node:latest`

## Run Docker Service

Run `docker-compose up` to build and serve site on `localhost:9000`

## Deploy to cloud

Open shell that's logged in to the manager node

Run `docker stack deploy -c docker-compose.yml chronopin`

To remove run `docker stack rm chronopin`

## Azure Deployment

Go To App Service Console

Run `ls` to see if folder structure is correct

Run `rm -r node_modules` to remove outdated node_modules folder

Run `npm install --only=prod` to install and build latest node_modules

## Remote SSH to VM

Run `ssh -p 50000 wowow@20.190.57.28`

Run `ssh -p 50000 -i chronopin_docker.pub -v wowow@20.190.57.28`

## DB Management

Run `npm run create:db` for create tables and stored procedures

Run `npm run create:data` for adding data

Run `npm run backup:data` for backing up data

Run `npm run remediate:data` for remediation of data

## Debug Node

Run `node --inspect-brk server/index.js` for debugging Node

Legacy node 6 run `node --inspect --debug-brk server/index.js` for debugging Node

Run `node --inspect-brk scripts/db/index.js` for debugging Node :: create:db

Legacy node 6 run `node --inspect --debug-brk scripts/db/index.js` for debugging Node

Run `node --inspect-brk scripts/data/index.js --seed` for debugging Node :: create:data

Legacy node 6 run `node --inspect --debug-brk scripts/data/index.js --seed` for debugging Node :: create:data

## Update Node

Clear NPM's cache

`sudo npm cache clean -f`

Install a little helper called 'n'

`sudo npm install -g n`

Install latest stable Node.js version

`sudo n stable`

Check Node.js version

`node --version`

Run this from the command line:

`node -p "process.arch"`

`ECHO %PROCESSOR_ARCHITECTURE%`

It will return 'arm', 'ia32', or 'x64'.

## Update Node packages

Install `npm install -g npm-check-updates`

Run `npm-check-updates` to list what packages are out of date
(basically the same thing as running `npm outdated`)

Run `npm-check-updates -u` to update all the versions in your package.json (this is the magic sauce)

Run `npm update` as usual to install the new versions of your packages based on the updated package.json

## Update Bower packages

Install `npm install -g npm-check-updates`

Run `ncu -m bower` to list what packages are out of date

Run `ncu -m bower -u` to update all the versions in your bower.json (this is the magic sauce)

Run `bower update` as usual to install the new versions of your packages based on the updated bower.json

## Run Sharp Hack in Azure until they support 64 bit node

`npm install sharp@0.11.4 --save-dev --arch=ia32`

https://github.com/lovell/sharp/issues/379

https://github.com/projectkudu/kudu/issues/1914

https://social.msdn.microsoft.com/Forums/en-US/871cc7c7-2917-4c96-b98d-f1e488937b43/azure-website-nodejs-doesnt-run-64-bit?forum=windowsazurewebsitespreview

## Testing

Running `npm test` will run the unit tests with karma.

## Status check

- [Azure Node Versions](https://chronopin.scm.azurewebsites.net/api/diagnostics/runtime)
- [Kudu Console](https://chronopin.scm.azurewebsites.net/DebugConsole)
- [Azure Node Inspector](https://docs.microsoft.com/en-us/azure/app-service-web/app-service-web-nodejs-get-started)

## Debugging Reference

[https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27](mailto:https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27)

## External API

[Public holidays](http://kayaposoft.com/enrico/) eg: <http://kayaposoft.com/enrico/json/v1.0/?action=getPublicHolidaysForYear&year=2020&country=usa>
[Rise & set times for the Sun and the Moon, twilight start & end, day length, moon phases, and more.](https://www.timeanddate.com/services/api/) eg: <hhttps://www.timeanddate.com/services/api/>

## ICO Images
[Calendar Clock Icon](http://www.iconarchive.com/show/small-n-flat-icons-by-paomedia/calendar-clock-icon.html)
[Clock-icon](http://www.iconarchive.com/show/childish-icons-by-double-j-design/Clock-icon.html)
[Blue clock Icon](http://www.iconarchive.com/show/origami-colored-pencil-icons-by-double-j-design/blue-clock-icon.html)

## Cool Things

### Loaders Animations
<https://codepen.io/collection/HtAne/>
<https://codepen.io/ChainsawBaby/pen/xbogNZ>
<https://codepen.io/hexagonest/pen/waaGqj>
<https://codepen.io/jonitrythall/pen/dNJRRK>

## Good design
<https://www.anker.com/>
<https://images.template.net/wp-content/uploads/2015/07/Timeline-Web-Element-Template-PSD.jpg>
<http://www.grubstreet.com/>

## Email Templates
<https://elements.envato.com/web-templates/email-templates>

### API Endpoints used
Equinoxes, Solstices, Perihelion, and Aphelion:
<http://aa.usno.navy.mil/data/docs/EarthSeasons.php>
<https://github.com/barrycarter/bcapps/blob/master/ASTRO/solstices-and-equinoxes.txt.bz2>

## To Do

### Web Scraper

- Amazon Price Scrape
- eBay Price Scrape
- Address Scrape
- Weather of location for that date
- Weather of your location for that date
- Movie Rotten Tomato scrape
- As you type in a url a bottom horizontal scrollable pin list will show up for closely matched existing pins. There you can immediately track or upvote
- Editing image will delete image so make sure it's marked deleted in join table ++
- Add price on contract icon
- Add Free Cost Text rather then $0

### Misc

- Extract scrape core selector in config file
- Pin feed needs to include if user have clicked on watch/like per min exclude deleted
- Change Medium.type to NVarChar

### Partially Completed:

- Activated Google Analytics / Facebook upgrade to non development mode
- Flat design <http://www.androidcentral.com/> <http://spectrum.ieee.org/>
- Check out upcoming side calendar <https://cafeastrology.com/astrologyof2017horoscopes.html>
- provides horoscope info for sun signs such as Lucky Number, Lucky Color, Mood, Color, Compatibility with other sun signs, description of a sign for that day etc. <https://aztro.readthedocs.io/en/latest>
- add flyout for different types of like (on time). Watch should show modal to add or select grouping pin will live in
- Add unique constraint on like and favorite so one user can like / favorite a pin once
- promise return null to suppress warnings
- Unit / Integration test on User and Pin model
- Change readFileSync to Async in scrape code to load scrape file or cache it
- Prevent user from posting the same pin of same url more then once
- Pin save should be wrapped in transaction
- format money with comma's on pin form
- Socket io updates - like will replace pin causing flicker ++
- cancel scraping button ++
- add edit ability to scraping modal ++

- Create watch view ++
- inherit main and watch view ++
- extract timeline into directive ++
- pin page media query
- facebook / tweet like button and counter need to show / move watch to top right of image
- scrape alt text for image and save
- get title in header bound correctly per page
- remove border from pins
- linking on watch/link and being redirected to login should fulfill request after logged in
- Extract GA code in auth.service.js into it's own module
- GA: Outbound link / non-interaction events / Social Interactions tracking / User Timings / set clientId on tracker creation
- searching on anything other then main page should bring you to main page
- multiline description support
- Accessory feature listing below main pin

- Side panel for favorite events: https://cafeastrology.com/articles/daysoftheweek.html
- convert to use jQuery.scrollTo https://github.com/flesler/jquery.scrollTo
- Chinese Lunar Calendar (Nong Li)
- display error banner on create page when failed scrape

- add holiday and perforated placeholder block for holiday and special events
- search with infinit scroll
- check scrolling to the end as link header is not responsed

- Extract scrapping js to own repo and used typescript
- side info panel with summation of 'tagged' categories of items and mode/median/mean
- Add tags and allow upvoting of existing tags to gain meta data for search engine to process +
- search feature bug / show tag button when searched to jump to different section like pinterest +++
- show pixil dimention / size via tooltip?? of scraped image

- https://prerender.io/
- facebook comment jumps @ pin page

## Architecture
- Externalize image processing to AWS Lamda
- Externalize web scrape to AWS Lamda
- Externalize pre render to AWS Lamda
- Add Redis to serve prender pages
- Externalize search to Algolia
- Convert to Angular 5
- Grafana activity dashboard
- [Use Firebase DB for denormalized push notification of app data] <https://www.youtube.com/watch?v=LAWjdZYrUgI>

## Bugs
- When in specific pin view and clicking logout will show blank screen
- Date tag mobile view broken

### To do once Azure supports Node 64bit:
- add to package.json once Azure supports Node 64bit /*"sharp": "^0.18.4",*/


unable to get presigned websocket URL and connect to it.
