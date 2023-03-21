'use strict';

(function () {

  function AuthService($location, $http, $cookies, $q, appConfig, Util, User) {
    var safeCb = Util.safeCb;
    var currentUser = {};
    var userRoles = appConfig.userRoles || [];

    var Auth = {

      /**
       * Authenticate user and save token
       *
       * @param  {Object}   user     - login info
       * @param  {Function} callback - optional, function(error, user)
       * @return {Promise}
       */
      login({
        email,
        password
      }, callback) {
        return $http.post('/auth/local', {
          email: email,
          password: password
        })
          .then(res => {
            $cookies.put('token', res.data.token);
            this.setCurrentUser(User.get());
            return currentUser.$promise;
          })
          .then(user => {
            safeCb(callback)(null, user);
            return user;
          })
          .catch(err => {
            Auth.logout();
            safeCb(callback)(err.data);
            return $q.reject(err.data);
          });
      },

      /**
       * Delete access token and user info
       */
      logout() {
        $cookies.remove('token');
        this.setCurrentUser({});
      },

      /**
       * Set a new user
       *
       * @param  {Object}   user     - user info
       * @return {Object|Promise}
       */
      setCurrentUser(user) {
        return currentUser = user;
      },

      /**
       * Create a new user
       *
       * @param  {Object}   user     - user info
       * @param  {Function} callback - optional, function(error, user)
       * @return {Promise}
       */
      createUser(user, callback) {
        return User.save(user,
          (data) => {
            $cookies.put('token', data.token);
            this.setCurrentUser(User.get());
            return safeCb(callback)(null, user);
          },
          (err) => {
            Auth.logout();
            return safeCb(callback)(err);
          }).$promise;
      },

      /**
       * Change password
       *
       * @param  {String}   oldPassword
       * @param  {String}   newPassword
       * @param  {Function} callback    - optional, function(error, user)
       * @return {Promise}
       */
      changePassword(oldPassword, newPassword, callback) {
        return User.changePassword({
          id: currentUser.id
        }, {
          oldPassword: oldPassword,
          newPassword: newPassword
        }, function () {
          return safeCb(callback)(null);
        }, function (err) {
          return safeCb(callback)(err);
        }).$promise;
      },

      /**
       * Gets all available info on a user
       *   (synchronous)
       *
       * @param  {Function|*} callback - optional, funciton(user)
       * @return {Object|Promise}
       */
      getCurrentUser(callback) {

        var value = (currentUser.hasOwnProperty('$promise')) ?
          currentUser.$promise : currentUser;
        return $q.when(value)
          .then(user => {
            safeCb(callback)(user);
            return user;
          }, () => {
            safeCb(callback)({});
            return {};
          });
      },

      /**
       * Gets User Real Name on a user
       *   (synchronous)
       *
       * @return {Object}
       */
      getCurrentUserRealName() {
        return (currentUser.firstName || '') + (currentUser.firstName && currentUser.lastName ? ' ' : '') + (currentUser.lastName || '');
      },

      /**
       * Gets User Email on a user
       *   (synchronous)
       *
       * @return {Object}
       */
        getCurrentUserEmail() {
          return currentUser.email;
        },

      /**
       * Gets User Name on a user
       *   (synchronous|asynchronous)
       *
       * @return {Object}
       */
      getCurrentUserName() {
        return (currentUser.userName || '');
      },

      /**
       * Check if a user is logged in
       *   (synchronous|asynchronous)
       *
       * @param  {Function|*} callback - optional, function(is)
       * @return {Bool|Promise}
       */
      isLoggedIn(callback) {
        if (arguments.length === 0) {
          return currentUser.hasOwnProperty('role');
        }

        return Auth.getCurrentUser(null)
          .then(user => {
            var is = user.hasOwnProperty('role');
            safeCb(callback)(is);
            return is;
          });
      },

      /**
       * Check if a user has a specified role or higher
       *   (synchronous|asynchronous)
       *
       * @param  {String}     role     - the role to check against
       * @param  {Function|*} callback - optional, function(has)
       * @return {Bool|Promise}
       */
      hasRole(role, callback) {
        var hasRole = function (r, h) {
          return userRoles.indexOf(r) >= userRoles.indexOf(h);
        };

        if (arguments.length < 2) {
          return hasRole(currentUser.role, role);
        }

        return Auth.getCurrentUser(null)
          .then(user => {
            var has = (user.hasOwnProperty('role')) ?
              hasRole(user.role, role) : false;
            safeCb(callback)(has);
            return has;
          });
      },

      /**
       * Check if a user is an admin
       *   (synchronous|asynchronous)
       *
       * @param  {Function|*} callback - optional, function(is)
       * @return {Bool|Promise}
       */
      isAdmin() {
        return Auth.hasRole
          .apply(Auth, [].concat.apply(['admin'], arguments));
      },

      /**
       * Get auth token
       *
       * @return {String} - a token string used for authenticating
       */
      getToken() {
        return $cookies.get('token');
      }

    };

    if ($cookies.get('token') && $location.path() !== '/logout') {
      Auth.setCurrentUser(User.get());
    }

    return Auth;
  }

  angular.module('chronopinNodeApp.auth')
    .factory('Auth', AuthService);

})();
