'use strict';

const express = require('express');
const controller = require('./meta.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/fetchUrl', auth.isAuthenticated(), controller.fetchUrl);

module.exports = router;
