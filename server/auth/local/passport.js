import passport from 'passport';
import {
  Strategy as LocalStrategy
} from 'passport-local';
import { User } from '../../model'

function localAuthenticate(email, password, done) {
  console.log('localAuthenticate', email, password)
  User.getByEmail(email.toLowerCase())
    .then(({user}) => {
      if (!user) {
        return done(null, false, {
          message: 'This email is not registered.'
        });
      }
      user.authenticate(password, function(authError, authenticated) {
        if (authError) {
          return done(authError);
        }
        if (!authenticated) {
          return done(null, false, {
            message: 'This password is not correct.'
          });
        } else {
          return done(null, user);
        }
      });
      return null;
    })
    .catch(err => done(err));
}

export function setup(User, config) {
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password' // this is the virtual field on the model
  }, function(email, password, done) {
    return localAuthenticate(User, email, password, done);
  }));
}
