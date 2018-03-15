'use strict';

(function() {

  function MediumFactory(modelInjector) {
    let Pin;

    // _pin
    let prop = [
      'id',
      'thumbName',
      'thumbWidth',
      'thumbHeight',
      'originalUrl',
      'originalWidth',
      'originalHeight',
      'type',
      'utcCreatedDateTime',
      'utcDeletedDateTime'
    ];

    return class Medium {
      constructor(medium, pin) {
        // Lazy load to prevent Angular circular dependency
        Pin = Pin || modelInjector.getPin();

        Object.defineProperty(this, '_pin', {
          enumerable: false,
          configurable: false,
          writable: true
        });

        if (medium) {
          this.set(medium, pin);
        }
      }

      set(medium, pin) {
        if (medium) {
          for (let i = 0; i < prop.length; i++) {
            this[prop[i]] = medium[prop[i]];
          }
          if (pin instanceof Pin) {
            this._pin = pin;
          }

        } else {
          throw 'medium cannot set value of arg';
        }

        return this;
      }

      setPin(pin) {
        this._pin = pin;
        return this;
      }

      static isValid(medium) {
        for (var i = 0; i < prop.length; i++) {
          if (medium.originalUrl) {
            return true;
          }
        }
        return false;
      }

    };
  }

  angular.module('chronopinNodeApp.model')
    .factory('MediumFactory', MediumFactory);

})();
