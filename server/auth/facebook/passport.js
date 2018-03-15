// Facebook Permission Doc: https://developers.facebook.com/docs/facebook-login/permissions
// Graph API Explorer: https://developers.facebook.com/tools/explorer/145634995501895/?method=GET&path=%7Buser-id%7D&version=v2.8

import passport from 'passport';
import {
  Strategy as FacebookStrategy
} from 'passport-facebook';
import * as userController from '../../api/user/user.controller';

export function setup(User, config) {
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
      // console.log('facebook profile', profile);

      User.getByFacebookId(profile.id)
        .then(({
          user
        }) => {
          // console.log('found facebook user', user);
          // debugger;
          if (user) {
            //console.log('found facebook user', user);
            return done(null, user);
          }

          // console.log('facebook user data', {
          //   facebookId: profile.id,
          //   firstName: profile.name.givenName,
          //   lastName: profile.name.familyName,
          //   gender: profile.gender,
          //   locale: profile._json.locale,
          //   pictureUrl: profile.photos && profile.photos.value,
          //   fbUpdatedTime: profile._json.updated_time,
          //   fbverified: profile._json.verified,
          //   email: profile.emails[0].value,
          //   role: 'user',
          //   provider: 'facebook'
          // });

          user = new User({
            facebookId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            gender: profile.gender,
            locale: profile._json.locale,
            pictureUrl: profile.photos && profile.photos[0] && profile.photos[0].value,
            fbUpdatedTime: profile._json.updated_time,
            fbverified: profile._json.verified,
            email: profile.emails[0].value,
            about: profile.about,
            role: 'user',
            provider: 'facebook'
          });

          // console.log('facebook user', user);

          // var request = require('request');
          // request.post((process.env.DOMAIN || '') + '/api/users', user, function (error, response, body) {
          //   if (!error && response.statusCode == 200) {
          //     console.log(body) // Print the google web page.
          //   }
          // })

          userController.addEntity(user)
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
