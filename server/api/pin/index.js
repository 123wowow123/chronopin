'use strict';

const express = require('express');
const controller = require('./pin.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.post('/', auth.isAuthenticated(), controller.create);
//router.get('/sizeof', controller.getImageSize);

router.get('/', auth.tryGetUser(), controller.index);

// Search Pins
router.get('/search', auth.tryGetUser(), controller.searchPin);

router.get('/:id', auth.tryGetUser(), controller.show); ///:id(\\d+)/

router.put('/:id', auth.isAuthenticated(), controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.update);
router.delete('/:id', auth.isAuthenticated(), controller.destroy);

// Create Like association
router.post('/:id/like', auth.isAuthenticated(), controller.createPinLike);
router.delete('/:id/like', auth.isAuthenticated(), controller.removePinLike);

// Create Favorite association
router.post('/:id/favorite', auth.isAuthenticated(), controller.createPinFavorite);
router.delete('/:id/favorite', auth.isAuthenticated(), controller.removePinFavorite);


module.exports = router;