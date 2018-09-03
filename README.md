[![Build Status](https://travis-ci.org/123wowow123/chronopin.svg?branch=master)](https://travis-ci.org/123wowow123/chronopin) [![Dependency Status](https://david-dm.org/123wowow123/chronopin.svg)](https://david-dm.org/123wowow123/chronopin) [![devDependency Status](https://david-dm.org/123wowow123/chronopin/dev-status.svg)](https://david-dm.org/123wowow123/chronopin#info=devDependencies) [![Coverage Status](https://coveralls.io/repos/github/123wowow123/chronopin/badge.svg?branch=master)](https://coveralls.io/github/123wowow123/chronopin?branch=master)

# Chronopin

This project was generated with the [Angular Full-Stack Generator](https://github.com/DaftMonk/generator-angular-fullstack) version 3.7.6.

## Getting Started

### Developing

1. Run `npm install` to install server dependencies.

2. Run `bower install` to install front-end dependencies.

3. Run `grunt serve` to start the development server. It should automatically open the client in your browser when ready.

## Build & development

Run `grunt build` for building and `grunt serve` for preview.

## Run Docker Build

Run Prod Build `docker build -t chronopin -f Docker/Dockerfile .`

Or

Run Dev Build `docker build -t chronopin-dev -f Docker/Dev.Dockerfile .`

## Run Docker Container

Run Prod `docker run --rm -p 9000:9000 --name chronopin --env-file Docker/env.prod.list chronopin`

Or

Only mounts client and server folders for development
Run Dev `docker run --rm -p 9000:9000 --name chronopin-dev --env-file Docker/env.dev.list -v $(pwd)/server:/code/server -v $(pwd)/client:/code/client chronopin-dev`

## Upload Docker Image

Run `docker login`

Or

Run `docker login -u 123wowow123 -p <my secret password>`

Run `docker tag chronopin 123wowow123/chronopin:latest`

Run `docker push 123wowow123/chronopin:latest`

## Download Docker Image

Run `docker image pull docker.io/library/123wowow123/chronopin:latest`

## Run Docker Service

Run `docker-compose up` to build and serve site on `localhost:9000`

Run `docker-compose down` to shut it down

## Deploy to cloud

Open shell that's logged in to the manager node

Run `docker stack deploy -c docker-compose.yml chronopin`

To remove run `docker stack rm chronopin`

## Docker Utility Commands

Run `docker container rm -f $(docker container ls -a -q)` to stop and remove all docker containers

Run `docker rmi $(docker images -q)` to remove all docker images

Run `docker container exec -i -t chronopin /bin/sh` to open shell inside of running container

Run `exit` after `exec -i -t` to exit TTY

Run `docker rmi <IMAGE ID>` to remove image from local system

Run `docker container attach quotes` to attach our Terminal's standard input, output, and error 

To quit the container without stopping or killing it, we can press the key combination `Ctrl+P Ctrl+Q`. This detaches us from the container while leaving it running in the background. On the other hand, if we want to detach and stop the container at the same time, we can just press `Ctrl+C`.

Run `docker system df` to see docker disk space usage

Run `docker image prune --force --all` to remove all images that are not currently in use on our system

## Kubernetes Docker Hub Password Set Up

Run `kubectl create secret docker-registry regcred --docker-server=https://index.docker.io/v1/ --docker-username=123wowow123 --docker-password=<password> --docker-email=flynni2008@gmail.com` to create a regcred as a Kubernetes cluster uses the Secret of docker-registry type to authenticate with a container registry to pull a private image.

Run `kubectl get secret regcred --output=yaml` to inspect the Secret regcred

Run `kubectl get secret regcred --output="jsonpath={.data.\.dockerconfigjson}" | base64 -D` to convert .dockerconfigjson field to a readable format and view credetials

## Kubernetes 

### VM

Run `minikube start` 

### ConfigMap

Run -`kubectl create configmap env-config --from-file=kube/`-

Run `kubectl create configmap env-file --from-env-file=Docker/env.dev.list`

Run `kubectl get configmaps env-file -o yaml`

---

Run `kubectl delete configmap env-config`

Run `kubectl delete configmap env-file`

### Pod

Run `kubectl create -f pod.yaml` to create a pod

Run `kubectl logs -f chronopin-pod` to see logs

Run `kubectl get pods` to check if pods have been created

---

Run `kubectl delete po/chronopin-pod` to delete created pod

### Pod Utility

Run `kubectl exec -it chronopin-pod -c chronopin /bin/sh`

Run `kubectl exec -it chronopin-pod -- /bin/bash`

Run `wget -qO - localhost:9000`

Run `node` 
    `process.env` to get env variables

Run `kubectl get pods`
    `kubectl exec -it chronopin-pod<guid> -- /bin/sh`
    `nslookup chronopin-pod<guid>`

### Deploy All

Run `kubectl create -f kube/deployment.yaml` to deploy all

Run `kubectl describe deployment`

---

Run `kubectl delete deployment chronopin-dep`

### Deploy/Clean All

First time run `chmod +x ./kube/deploy.sh` & `chmod +x ./kube/clean.sh` to set execute permission

Run `./kube/deploy.sh` to deploy deployment and services

Run `./kube/clean.sh` to clean deployment and services

### Rolling Update

Run to start rolling update
```sh
kubectl set image deployment/chronopin-dep \
    chronopin=123wowow123/chronopin:latest
```

Run to check rollout status
`kubectl rollout status deploy/chronopin-dep`

Run `rollout undo` to undo rollout

### Service

Run `kubectl create -f web-service.yaml`

Run `minikube service chronopin-lb --url` to check url

Run `minikube service chronopin-lb` to open in browser

Run `kubectl get services`
Run `IP=$(minikube ip)`
Run `curl -4 $IP:<port>/` port is equal to NodePort value

---

Run `kubectl delete svc/chronopin-web`

### Proxy

Run `kubectl proxy`

Run 

```sh
export POD_NAME=$(kubectl get pods -o go-template --template '{{range .items}}{{.metadata.name}}{{"\n"}}{{end}}')
echo Name of the Pod: $POD_NAME
```

Run 
```sh
curl http://localhost:8001/api/v1/namespaces/default/pods/$POD_NAME/proxy/
```

## VirtualBox 

Run `rm -rf ~/.minikube`
    `minikube start` to reinstall minikube

Run `minikube dashboard` to open the Kubernetes dashboard in a browser

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

Run `node --inspect-brk scripts/db/index.js` for debugging Node :: create:db

Run `node --inspect-brk scripts/data/index.js --seed` for debugging Node :: create:data

Run `node --inspect-brk scripts/search/index.js --delete --index=pins` for debugging Node :: delete:search:pins

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

## Good Design
<https://www.anker.com/>
<https://images.template.net/wp-content/uploads/2015/07/Timeline-Web-Element-Template-PSD.jpg>
<http://www.grubstreet.com/>
<https://flipboard.com/>
<https://news360.com/home>
Use of top banner news feed: <http://www.latimes.com/entertainment/arts/la-et-cm-hammer-made-paggett-wiegmann-20180606-story.html>

## Practical Design

<https://www.msn.com/en-us/health/wellness/10-minute-moves-for-strength-speed-and-agility/ss-AAzWFok?OCID=ansmsnnews11>

## Email Templates
<https://elements.envato.com/web-templates/email-templates>

### API Endpoints used
Equinoxes, Solstices, Perihelion, and Aphelion:
<http://aa.usno.navy.mil/data/docs/EarthSeasons.php>
<https://github.com/barrycarter/bcapps/blob/master/ASTRO/solstices-and-equinoxes.txt.bz2>

## To Do

### High Priority

- Back up watch
- Remove QueryCount model/script
- Add Index on Pin Begin Time

- Search Paging
- Faceted Search bubbles like Bing
- Fix loading on correct timeline on mobile tag wrapping 
- Fix image centering issue

- Fix watch pins board
- Drilldown view reorganize (Use reading mode to show full article)
  - RSS/Atom summary

- SSL
- Put location in place of "THE CHAIN GANG"

- Fix scrape timeout issue
- Scrape should stream data with sockets
- facebook login check for fbid and matching email in system to get user



### Search

- Faceted Navigation that slides in one by one from the left in bubble blocks (https://alistapart.com/article/design-patterns-faceted-navigation)(https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-post-filter.html)

- https://en.wikipedia.org/wiki/Word2vec
- https://wordnet.princeton.edu/
- https://arxiv.org/pdf/1402.3722.pdf
- https://nlp.stanford.edu/software/sempre/
- http://jupyter.org/

### Map
- Plot pins on map relative to a specified date time and draw drill map time arrow indicating possible itinerary
- Save and share itinerary (https://travefy.com/pro?km_marketing=homepage)
  - Serve ads for hotels to flights to cruise
  - See who else is going in your network
  - If flight information is entered or flight booked through site then delays and be tracked and shared

### Time Series
- Read book for more ideas

### Machine Learning
- review algebra, then linear algebra, analysis, stat, calculus, graph theory in that order
-- https://www.pinterest.com/mathematicsprof/

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
- Extract scaper code to new project

### Misc

- Follow other people and get notified when they post
- GeoHash grid aggregation of close events during breakdown of 1/3/5/10 days
- Extract scrape core selector in config file
- Pin feed needs to include if user have clicked on watch/like per min exclude deleted
- Change Medium.type to NVarChar
- General Sentiment Graph for a Company or Product
- Search (Amazon) to buy product to support our website
```
This is a promotional article about one of the company partners with Interesting Engineering. By shopping with us, you not only get the materials you need, but you’re also supporting our website.
```

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

- Add FB privacy policy page
- https://gist.github.com/muddylemon/2671176
- https://developers.facebook.com/apps/560731380662615/settings/basic/

- https://prerender.io/
- facebook comment jumps @ pin page

## Architecture
- Externalize image processing to AWS Lamda
- Externalize pre render to AWS Lamda
- Add Redis to serve prender pages
- Externalize search to Algolia or ElastiSearch
- Convert to Angular 5
- Grafana activity dashboard
- [Use Firebase DB for denormalized push notification of app data] <https://www.youtube.com/watch?v=LAWjdZYrUgI>
- GeoLite2 City: IP => City / lat:long

## Bugs
- When in specific pin view and clicking logout will show blank screen
- Date tag mobile view broken
