'use strict';

import express from 'express';
import passport from 'passport';
import {setTokenCookie} from '../auth.service';

var router = express.Router();

router
  .get('/', passport.authenticate('google', {
    scope: ['email', 'profile'],
    failureRedirect: '/signup',
    session: false
  }))
  .get('/callback', passport.authenticate('google', {
    failureRedirect: '/signup',
    session: false
  }), setTokenCookie);

export default router;
