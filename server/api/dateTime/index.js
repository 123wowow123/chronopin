'use strict';

const express = require('express');
const controller = require('./dateTime.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/', controller.index);
//
// router.get('/create/db', controller.createDatabase);
//
// router.get('/create/data', controller.createData);

// // Search Date
// router.get('/search', auth.tryGetUser(), controller.searchPin);

module.exports = router;
