 /*jshint unused:false*/
'use strict';

(function() {

  class PinFormController {

    constructor($http, $stateParams, $state, $scope, Auth, $log) {
      //this.form.title = title;

      var baseDate = new Date();
      var dateOptions = {
        //formatYear: 'yy',
        // maxDate: new Date(2020, 5, 22),
        // minDate: new Date(),
        startingDay: 1,
        baseDate: baseDate
      };

      var timeOptions = {
        hstep: 1,
        mstep: 15,
        ismeridian: true
      };

      this.isAdmin = Auth.isAdmin; //bind function so each digest loop it get re-evaluated to determin latest state

      this.enableForm = true;

      this.$log = $log;
      this.$http = $http;
      this.$stateParams = $stateParams;
      this.$state = $state;
      this.$scope = $scope;
      this.pin = {};

      this.altInputFormats = ['shortDate'];

      this.datePickerStart = {
        opened: false,
        options: angular.extend({}, dateOptions)
      };

      this.datePickerEnd = {
        opened: false,
        options: angular.extend({}, dateOptions)
      };

      this.timePickerStart = {
        options: angular.extend({}, timeOptions)
      };

      this.timePickerEnd = {
        options: angular.extend({}, timeOptions)
      };

      this.timePicker = {
        show: false
      };

      // Fixed list mirrored from server/extract/index.js CATEGORIES - keep
      // both in sync if the list ever changes.
      this.categories = [
        'Consumer Electronics',
        'Software',
        'Computing & Semiconductors',
        'Gaming & Entertainment',
        'Space & Astronomy',
        'Infrastructure & Transportation',
        'Architecture & Real Estate',
        'Automotive',
        'Energy',
        'Corporate & Finance',
        'Policy & Legal',
        'Other'
      ];

    }

    $onInit() {
      var pinId = this.$stateParams.id;
      if (this.mode === 'edit' && pinId !== undefined) {
        this._enableForm(false);
        this.$http.get('/api/pins/' + pinId)
          .then(res => {
            this.setPin(res.data);
            this._enableForm(true);
          })
          .catch(err => {
            this._enableForm(true);
          });
      }
    }

    selectMedia(image) {
      this.pin.selectedImage = image;
    }

    openDatePickerStart() {
      this.closeDatePicker();
      this.datePickerStart.opened = true;
    }

    openDatePickerEnd() {
      this.closeDatePicker();
      this.datePickerEnd.opened = true;
    }

    closeDatePicker() {
      this.datePickerStart.opened = false;
      this.datePickerEnd.opened = false;
    }

    toggleTimePicker() {
      this.timePicker.show = !this.timePicker.show;
    }

    startChange() {
      this.$log.log(this.pin.start);
      this.datePickerEnd.options.minDate = this.pin.start;
      // Clear the end date once the new start has caught up to or overtaken
      // it, leaving the field empty to re-pick. This used to overwrite the
      // end on any start change, throwing away a date the user had
      // deliberately picked.
      if (this.pin.end && this.pin.end <= this.pin.start) {
        this.pin.end = undefined;
      }
    }

    stopPropagation(e) {
      e.stopPropagation();
    }

    timeChange() {
      this.$log.log(this.pin.start);
    }

    setPin(pin) {
      this.pin.id = pin.id;
      if (!this.pin.sourceUrl) {
        this.pin.pageUrl = pin.sourceUrl;
      }
      if (!this.pin.title) {
        this.pin.title = pin.title;
      }
      if (!this.pin.description) {
        this.pin.description = pin.description;
      }
      // Coordinates belong to the place they came with, so they are only
      // taken along with its address.
      if (!this.pin.address) {
        this.pin.address = pin.address;
        this.pin.latitude = pin.latitude;
        this.pin.longitude = pin.longitude;
      }
      if (!this.pin.price) {
        this.pin.price = pin.price;
      }
      if (!this.pin.company) {
        this.pin.company = pin.company;
      }
      if (!this.pin.category) {
        this.pin.category = pin.category;
      }
      // Carried for the same reason as dateConfidence/longFormSummary below -
      // the form has no inputs for merchant links, so an edit must resubmit
      // them or Pin.update() (which deletes and re-saves the whole list)
      // wipes them.
      if (!this.pin.merchants) {
        this.pin.merchants = pin.merchants;
      }
      if (!this.pin.start && pin.utcStartDateTime) {
        this.pin.start = new Date(pin.utcStartDateTime);
      }
      if (!this.pin.end && pin.utcEndDateTime) {
        this.pin.end = new Date(pin.utcEndDateTime);
      }
      if (!this.pin.images && pin.media && pin.media[0]) {
        this.pin.images = [pin.media[0]];
      }
      if (!this.pin.selectedImage) {
        this.pin.selectedImage = pin.media && pin.media[0];
      }
      // Carried so that editing a pin resubmits these rather than blanking
      // them - the form has no inputs for them, they come from the scrape.
      if (!this.pin.dateConfidence) {
        this.pin.dateConfidence = pin.dateConfidence;
        this.pin.dateConfidenceReasoning = pin.dateConfidenceReasoning;
      }
      if (!this.pin.longFormSummary) {
        this.pin.longFormSummary = pin.longFormSummary;
      }
    }

    // /api/scrape answers with a Pin, the same shape setPin reads. It used to
    // be given the raw scraper envelope instead - titles and descriptions as
    // arrays, dates[0].start, images - so indexing [0] into what is now a
    // string set the title to its first letter, and the dates and images
    // never arrived at all.
    setPinFromScrape(pin) {
      if (!this.pin.title) {
        this.pin.title = pin.title;
      }
      if (!this.pin.description) {
        this.pin.description = pin.description;
      }
      // Coordinates belong to the place they came with, so they are only
      // taken along with its address.
      if (!this.pin.address) {
        this.pin.address = pin.address;
        this.pin.latitude = pin.latitude;
        this.pin.longitude = pin.longitude;
      }
      if (!this.pin.price) {
        this.pin.price = pin.price;
      }
      if (!this.pin.company) {
        this.pin.company = pin.company;
      }
      if (!this.pin.category) {
        this.pin.category = pin.category;
      }
      if (!this.pin.merchants) {
        this.pin.merchants = pin.merchants;
      }
      if (!this.pin.start && pin.utcStartDateTime) {
        this.pin.start = new Date(pin.utcStartDateTime);
      }
      if (!this.pin.end && pin.utcEndDateTime) {
        this.pin.end = new Date(pin.utcEndDateTime);
      }
      if (!this.pin.dateConfidence) {
        this.pin.dateConfidence = pin.dateConfidence;
        this.pin.dateConfidenceReasoning = pin.dateConfidenceReasoning;
      }
      if (!this.pin.longFormSummary) {
        this.pin.longFormSummary = pin.longFormSummary;
      }
      this.pin.images = pin.media;
      this.pin.selectedImage = pin.media && pin.media[0];
    }

    scrapePage(url) {
      this._enableForm(false);
      var config = {
        params: {
          url: url
        }
      };
      this.$http.get('/api/scrape', config)
        .then(response => {
          this.setPinFromScrape(response.data);
          this._enableForm(true);
        })
        .catch(err => {
          this._enableForm(true);
        });
    }

    urlChanged() {
      this.reset();
      this.scrapePage(this.pin.pageUrl);
    }

    reset() {
      this.pin.title = undefined;
      this.pin.description = undefined;
      this.pin.address = undefined;
      this.pin.latitude = undefined;
      this.pin.longitude = undefined;
      this.pin.price = undefined;
      this.pin.company = undefined;
      this.pin.category = undefined;
      this.pin.merchants = undefined;
      this.pin.start = undefined;
      this.pin.end = undefined;
      this.pin.selectedImage = undefined;
    }


    submitPin(pin, valid) {
      this._forceValiate();
      if (!valid) {
        return;
      }
      if (this.mode === 'edit') {
        this._updatePin(pin);
      } else {
        this._addPin(pin);
      }
    }

    _addPin(pin) {
      this._enableForm(false);
      var newPin = this._formatSubmitPin(pin);
      this.$http.post('/api/pins', newPin)
        .then(response => {
          this.success = response.data;
        })
        .then(() => {
          this.$state.go('main');
        })
        .catch(err => {
          this._enableForm(true);
        });
    }

    _updatePin(pin) {
      var newPin = this._formatSubmitPin(pin);
      this.$http.put('/api/pins/' + pin.id, newPin)
        .then(response => {
          this.success = response.data;
        })
        .then(() => {
          this.$state.go('main');
        });
    }

    // The chosen image goes as `media`, which is the only image field the
    // server reads - BasePin.set builds Media from it, save() sends type 1
    // through createAndSaveToCDN to get a thumbnail, and update() diffs the
    // list by originalUrl. The old `imageUrl` was in no prop list, so it was
    // dropped on create, and sending no `media` at all made update() treat
    // every existing medium as removed and delete it.
    _formatSubmitPin(pin) {
      var newPin = {
        title: pin.title,
        description: pin.description,
        sourceUrl: pin.pageUrl,
        address: pin.address,
        latitude: pin.latitude,
        longitude: pin.longitude,
        price: pin.price,
        company: pin.company,
        category: pin.category,
        merchants: pin.merchants || [],
        dateConfidence: pin.dateConfidence,
        dateConfidenceReasoning: pin.dateConfidenceReasoning,
        longFormSummary: pin.longFormSummary,
        utcStartDateTime: pin.start,
        utcEndDateTime: pin.end,
        media: pin.selectedImage ? [pin.selectedImage] : [],
        allDay: !this.timePicker.show
      };
      return newPin;
    }

    _enableForm(enable) {
      this.enableForm = enable;
    }

    _forceValiate() {
      angular.forEach(this.$scope.pinForm.$error.required, function(field) {
        field.$setDirty();
      });
    }
  }

  angular.module('chronopinNodeApp')
    .component('pinForm', {
      templateUrl: 'components/modal-scroller/modal/shared/pin-form.html',
      controller: PinFormController,
      bindings: {
        title: '@?',
        mode: '@?'
      }
    });
})();
