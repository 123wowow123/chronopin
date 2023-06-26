'use strict';

const express = require('express');
const controller = require('./stock.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/quotes', controller.quotes);

module.exports = router;
