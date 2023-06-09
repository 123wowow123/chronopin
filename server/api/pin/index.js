'use strict';

const express = require('express');
const controller = require('./pin.controller');
const auth = require('../../auth/auth.service');

const router = express.Router();

router.get('/', auth.tryGetUser(), controller.index);
router.post('/', auth.isAuthenticated(), controller.create); // afterCreate

// Get Thread
router.get('/thread/:id', auth.tryGetUser(), controller.getThreadPins);

// Search Pins
router.get('/search', auth.tryGetUser(), controller.searchPins);
router.get('/autocomplete', auth.tryGetUser(), controller.autocompletePins);
// router.post('/search', auth.isAuthenticated(), controller.createPin);
// router.put('/search/:id', auth.isAuthenticated(), controller.updatePin);
// router.patch('/search/:id', auth.isAuthenticated(), controller.update);

router.get('/:id', auth.tryGetUser(), controller.show); ///:id(\\d+)/
router.get('/edit/:id', auth.isAuthenticated(), controller.showEdit);

router.put('/:id', auth.isAuthenticated(), controller.update); // afterUpdate
router.patch('/:id', auth.isAuthenticated(), controller.update); // afterUpdate
router.delete('/:id', auth.isAuthenticated(), controller.destroy); // afterDestroy

// Create Like association
router.post('/:id/like', auth.isAuthenticated(), controller.createPinLike); // afterLike
router.delete('/:id/like', auth.isAuthenticated(), controller.removePinLike); // afterUnlike

// Create Favorite association
router.post('/:id/favorite', auth.isAuthenticated(), controller.createPinFavorite); // afterFavorite
router.delete('/:id/favorite', auth.isAuthenticated(), controller.removePinFavorite); // afterUnfavorite


module.exports = router;