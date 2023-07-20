'use strict';

const express = require('express');
const controller = require('./ai.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.post('/sentiment', auth.isAuthenticated(), controller.sentiment);

module.exports = router;