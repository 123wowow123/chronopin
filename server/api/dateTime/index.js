'use strict';

var express = require('express');
var controller = require('./dateTime.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
//
// router.get('/create/db', controller.createDatabase);
//
// router.get('/create/data', controller.createData);

// // Search Date
// router.get('/search', auth.tryGetUser(), controller.searchPin);

module.exports = router;
//# sourceMappingURL=index.js.map
