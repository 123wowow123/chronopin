'use strict';

(function () {

  function MerchantFactory(modelInjector) {
    let Pin;

    // _pin
    let prop = [
      'id',
      "address"
    ];

    return class Merchant {
      constructor(merchant, pin) {
        // Lazy load to prevent Angular circular dependency
        Pin = Pin || modelInjector.getPin();

        Object.defineProperty(this, '_pin', {
          enumerable: false,
          configurable: false,
          writable: true
        });

        if (merchant) {
          this.set(merchant, pin);
        }
      }

      set(merchant, pin) {
        if (merchant) {
          for (let i = 0; i < prop.length; i++) {
            this[prop[i]] = merchant[prop[i]];
          }
          if (pin instanceof Pin) {
            this._pin = pin;
          }

        } else {
          throw 'merchant cannot set value of arg';
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
    .factory('MerchantFactory', MerchantFactory);

})();
