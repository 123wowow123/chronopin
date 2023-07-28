'use strict';

const express = require('express');
const controller = require('./mention.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/autocomplete', auth.isAuthenticated(), controller.autocomplete);

module.exports = router;