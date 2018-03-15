'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setup = setup;

var _passport = require('passport');

var _passport2 = _interopRequireDefault(_passport);

var _passportFacebook = require('passport-facebook');

var _user = require('../../api/user/user.controller');

var userController = _interopRequireWildcard(_user);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function setup(User, config) {
  _passport2.default.use(new _passportFacebook.Strategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
    profileFields: ['first_name', 'last_name', 'emails',
    //'age_range',
    'locale', 'picture', 'timezone', 'updated_time', 'verified', 'gender', 'about'
    //'birthday',
    //'education',
    //'location'
    ]
  }, function (accessToken, refreshToken, profile, done) {
    // console.log('facebook profile', profile);

    User.getByFacebookId(profile.id).then(function (_ref) {
      var user = _ref.user;

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

      userController.addEntity(user).then(function (_ref2) {
        var user = _ref2.user;

        done(null, user);
      }).catch(function (err) {
        return done(err);
      });
    }).catch(function (err) {
      return done(err);
    });
  }));
} // Facebook Permission Doc: https://developers.facebook.com/docs/facebook-login/permissions
// Graph API Explorer: https://developers.facebook.com/tools/explorer/145634995501895/?method=GET&path=%7Buser-id%7D&version=v2.8
//# sourceMappingURL=passport.js.map
