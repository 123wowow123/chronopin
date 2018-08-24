'use strict';

const express = require('express');
const controller = require('./pin.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/', auth.tryGetUser(), controller.index);
router.post('/', auth.isAuthenticated(), controller.create);

// Search Pins
router.get('/search', auth.tryGetUser(), controller.searchPins);
router.get('/autocomplete', auth.tryGetUser(), controller.autocompletePins);
// router.post('/search', auth.isAuthenticated(), controller.createPin);
// router.put('/search/:id', auth.isAuthenticated(), controller.updatePin);
// router.patch('/search/:id', auth.isAuthenticated(), controller.update);

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