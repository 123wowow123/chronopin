'use strict';

var express = require('express');
var controller = require('./main.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', auth.tryGetUser(), controller.index);

module.exports = router;
//# sourceMappingURL=index.js.map
