// Facebook Permission Doc: https://developers.facebook.com/docs/facebook-login/permissions
// Graph API Explorer: https://developers.facebook.com/tools/explorer/145634995501895/?method=GET&path=%7Buser-id%7D&version=v2.8

import passport from 'passport';
import {
  Strategy as FacebookStrategy
} from 'passport-facebook';
import * as userController from '../../api/user/user.controller';
import { User, facebookMapper } from '../../model'
import * as log from '../../util/log';
import * as _ from 'lodash';

export function setup(config) {
  passport.use(new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
    profileFields: [
      'first_name',
      'last_name',
      'emails',
      //'age_range',
      'locale',
      'picture',
      'timezone',
      'updated_time',
      'verified',
      'gender',
      'about'
      //'birthday',
      //'education',
      //'location'
    ]
  },
    function (accessToken, refreshToken, profile, done) {
      User.getByEmail(_.get(profile, "emails[0].value"))
        .then(({
          user
        }) => {
          log.info('facebook profile', log.stringify(profile));
          log.infoBlue('current chronopin user', log.stringify(user));

          // update empty fields
          let { user: updatedUser, updatedFields } = facebookMapper(user, profile);


          if (user && !updatedFields.length) {
            return done(null, user);
          }

          if (user && updatedFields.length) {
            log.info("user updated the following profile properties", log.stringify(updatedFields));
            return updatedUser
              .patchWithoutPassword()
              .then(({
                user
              }) => {
                done(null, user);
              })
              .catch(err => done(err));
          }

          updatedUser.role = 'user';
          updatedUser.provider = 'facebook';

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
