'use strict';

(function () {

  function LocationFactory(modelInjector) {
    let Pin;

    // _pin
    let prop = [
      'id',
      "address"
    ];

    return class Location {
      constructor(location, pin) {
        // Lazy load to prevent Angular circular dependency
        Pin = Pin || modelInjector.getPin();

        Object.defineProperty(this, '_pin', {
          enumerable: false,
          configurable: false,
          writable: true
        });

        if (location) {
          this.set(location, pin);
        }
      }

      set(location, pin) {
        if (location) {
          for (let i = 0; i < prop.length; i++) {
            this[prop[i]] = location[prop[i]];
          }
          if (pin instanceof Pin) {
            this._pin = pin;
          }

        } else {
          throw 'location cannot set value of arg';
        }

        return this;
      }

      setPin(pin) {
        this._pin = pin;
        return this;
      }

    };
  }

  angular.module('chronopinNodeApp.model')
    .factory('LocationFactory', LocationFactory);

})();
