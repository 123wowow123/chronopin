'use strict';

(function() {

  function PinFactory(modelInjector) {

    let User, Medium;

    // _user, userId, media
    let prop = [
      'id',
      'title',
      'description',
      'sourceUrl',
      'address',
      'priceLowerBound',
      'priceUpperBound',
      'price',
      'tip',
      {
        'utcStartDateTime': Date
      },
      {
        'utcEndDateTime': Date
      },
      {
        'utcCreatedDateTime': Date
      },
      {
        'utcUpdatedDateTime': Date
      },
      'allDay',
      'favoriteCount',
      'likeCount',
      'hasFavorite',
      'hasLike',
      'searchScore'
    ];

    return class Pin {
      constructor(pin, user) {
        // Lazy load to prevent Angular circular dependency
        User = User || modelInjector.getUser();
        Medium = Medium || modelInjector.getMedium();

        Object.defineProperty(this, '_user', {
          enumerable: false,
          configurable: false,
          writable: true
        });

        Object.defineProperty(this, 'userId', {
          get: function() {
            return this._user && this._user.id;
          },
          set: function(id) {
            if (this._user) {
              this._user.id = id;
            } else {
              this._user = new User({
                id: id
              });
            }
          },
          enumerable: true,
          configurable: false
        });
        this.media = [];

        if (pin) {
          this.set(pin, user);
        }
      }

      set(pin, user) {
        if (pin) {
          for (let i = 0; i < prop.length; i++) {
            if (typeof prop[i] === 'object') {
              this[Object.keys(prop[i])[0]] = pin[Object.keys(prop[i])[0]] != null ? new prop[i][Object.keys(prop[i])[0]](pin[Object.keys(prop[i])[0]]) : undefined; // jshint ignore:line
            } else {
              this[prop[i]] = pin[prop[i]];
            }
          }
          this.media = pin.media && pin.media.map(m => {
            return new Medium(m, this);
          }) || [];

          if (user instanceof User) {
            this._user = user;
          }

        } else {
          throw 'Pin cannot set value of arg';
        }
        return this;
      }

      setUser(user) {
        this._user = user;
        this.userId = user.id;
        return this;
      }

      addMedium(medium) {
        if (medium instanceof Medium) {
          medium.setPin(this);
          this.media.push(medium);
        } else {
          throw ' ';
        }
        return this;
      }

    };

  }

  angular.module('chronopinNodeApp.model')
    .factory('PinFactory', PinFactory);

})();
