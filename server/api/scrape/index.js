'use strict';

var express = require('express');
var controller = require('./scrape.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.isAuthenticated(), controller.getContent); // add authentication

module.exports = router;
//# sourceMappingURL=index.js.map
