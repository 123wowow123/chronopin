'use strict';

const express = require('express');
const controller = require('./main.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/', auth.tryGetUser(), controller.index);

module.exports = router;
