'use strict';

const express = require('express');
const controller = require('./upload.controller');
const auth = require('../../auth/auth.service');

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const router = express.Router();

router.post('/uploadFile', auth.isAuthenticated(), upload.single('image'), controller.uploadFile);
router.post('/fetchUrl', auth.isAuthenticated(), controller.fetchUrl);

module.exports = router;
