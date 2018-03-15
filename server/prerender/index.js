/**
 * https://github.com/prerender/prerender
 * https://github.com/prerender/prerender-node
 * https://developers.google.com/webmasters/ajax-crawling/docs/specification
 * 
 * https://redis.io/
 * Run redis: redis-server
 * Run redis CLI: redis-cli
 * Shutdown redis, in redis-cli: shutdown
 * 
 * https://prerender.io/
 * free limit of 250 cached pages
 */

'use strict';

import { Router } from 'express';
//import redis from 'redis';
//import prerenderServer from 'prerender';
import prerenderMiddleware from 'prerender-node';

//const path = require('path');

//const client = redis.createClient();
// const server = prerenderServer({
//     port: 3000,
//     //chromeLocation: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
//     chromeLocation: '../../node_modules/puppeteer/local-chromium/mac-515411/chrome-mac/Chromium.app/Contents/MacOS/Chromium'
// });
// server.start();

prerenderMiddleware
    //.set('prerenderServiceUrl', 'http://localhost:3000')
    .set('forwardHeaders', true)
    .set('prerenderToken', 'G3NowTshSC0XWAnEV62Z')

    .set('beforeRender', function (req, done) {
        console.log('beforeRender', req.url);
        done();
        //client.get(req.url, done);
    }).set('afterRender', function (err, req, prerender_res) {
        console.log('afterRender', "fired");
        //console.log('afterRender', prerender_res.body);
        //client.set(req.url, prerender_res.body)
    });


// server.use(prerender.sendPrerenderHeader());
// server.use(prerender.blockResources());
// server.use(prerender.removeScriptTags());
// server.use(prerender.httpHeaders());



module.exports = prerenderMiddleware;
