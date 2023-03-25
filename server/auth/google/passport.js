// Facebook Permission Doc: https://developers.facebook.com/docs/facebook-login/permissions
// Graph API Explorer: https://developers.facebook.com/tools/explorer/145634995501895/?method=GET&path=%7Buser-id%7D&version=v2.8

import passport from 'passport';
import {
  Strategy as GoogleStrategy
} from 'passport-google-oauth20';
import * as userController from '../../api/user/user.controller';
import { User, googleMapper } from '../../model'
import * as log from '../../util/log';
import * as _ from 'lodash';

export function setup(config) {
  passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackURL,
  },
    function (accessToken, refreshToken, profile, done) {
      User.getByEmail(_.get(profile, "emails[0].value"))
        .then(({
          user
        }) => {
          log.info('google profile', log.stringify(profile));
          log.infoBlue('current chronopin user', log.stringify(user));

          // update empty fields
          let { user: updatedUser, updatedFields } = googleMapper(user, profile);

          if (user && !updatedFields.length) {
            return done(null, user);
          }

          if (user && updatedFields.length) {
            log.info("user updated the following profile properties", log.stringify(updatedFields));
            return updatedUser
              .update()
              .then(({
                user
              }) => {
                done(null, user);
              })
              .catch(err => done(err));
          }

          updatedUser.role = 'user';
          updatedUser.provider = 'google';

          log.infoBlue('new chronopin user', log.stringify(updatedUser));

          userController.addEntity(updatedUser)
            .then(({
              user
            }) => {
              done(null, user)
            })
            .catch(err => done(err));
        })
        .catch(err => done(err));
    }));
}
