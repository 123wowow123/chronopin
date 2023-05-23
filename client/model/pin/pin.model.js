'use strict';

(function () {

  function PinFactory(modelInjector) {

    let User, Medium;

    // user, userId, media
    let prop = [
      'id',
      'parentId',
      'title',
      'description',
      'sourceUrl',
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
      'rootThread',
      'hasFavorite',
      'hasLike',
      'searchScore'
    ];

    return class Pin {
      constructor(pin, user) {
        // Lazy load to prevent Angular circular dependency
        User = User || modelInjector.getUser();
        Medium = Medium || modelInjector.getMedium();

        Object.defineProperty(this, 'userId', {
          get: function () {
            return this.user && this.user.id;
          },
          set: function (id) {
            if (this.user) {
              this.user.id = id;
            } else {
              this.setUser(new User({
                id: id
              }));
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
            this.user = user;
          } else if (pin.user) {
            this.setUser(new User(pin.user));
          }

        } else {
          throw 'Pin cannot set value of arg';
        }
        return this;
      }

      setUser(user) {
        this.user = user;
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
