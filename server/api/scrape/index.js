'use strict';

const express = require('express');
const controller = require('./scrape.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/', auth.isAuthenticated(), controller.getContent); // add authentication

module.exports = router;
