/*jshint unused:false*/
'use strict';

(function () {

  //let PinGroups;

  class CreateController {

    constructor($window, $state, $scope, Auth, $q, $rootScope, $stateParams, $http, pinWebService, scrapeService, appConfig /*, $log, modelInjector */) {
      //PinGroups || (PinGroups = modelInjector.getPinGroups());

      this.$window = $window;
      this.$rootScope = $rootScope;

      // different states of pin
      this.pin = { useMedia: true };
      this.pinSuggestion = {};
      this.previewPin = {};

      let baseDate = new Date();
      let dateOptions = {
        //formatYear: 'yy',
        // maxDate: new Date(2020, 5, 22),
        // minDate: new Date(),
        startingDay: 1,
        baseDate: baseDate
      };

      let timeOptions = {
        hstep: 1,
        mstep: 15,
        ismeridian: true
      };

      // bind function so each digest loop it get re-evaluated to determin latest state
      this.Auth = Auth;
      this.isAdmin = Auth.isAdmin;
      this.getTimeZoneName = moment.tz.guess;

      // this.mode = this.mode || 'create';

      this.appConfig = appConfig;
      this.scrapeType = appConfig.scrapeType;
      this.pinWebService = pinWebService;
      this.scrapeService = scrapeService;
      this.$http = $http;
      this.$q = $q;
      this.$stateParams = $stateParams;
      this.$state = $state;
      this.$scope = $scope;

      this.title = 'Create Pin';
      this.formDisabled = false;
      this.scraping = false;
      this.hasScrapedText = false;
      this.hasScrapedImage = false;

      this.pin.allDay = true;
      //this.timePicker = {};
      //this.timePicker.openedBefore = false; ////////////

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

      this.pin.locations = this.scrapeService.getResetLocation();

      this.activeTabs = {
        title: 0,
        content: 0,
        location: 0,
        footer: 0
      }

    }

    $onInit() {
      this.Auth.getCurrentUser()
        .then((user) => {
          this.user = user;
        });

      let id = this.$stateParams.id;
      let respondId = this.$stateParams.respondId;
      this.mode = id ? "edit" : respondId ? 'respond' : 'create';
      if (this.mode === 'edit' && id !== undefined) {
        this.enableForm(false);
        this.pinWebService.get(id)
          .then(res => {
            return this.scrapeService
              .setPin(this.pin, res.data);
          })
          .finally(() => {
            this.enableForm(true);
          });
      } else if (this.mode === 'respond' && respondId !== undefined) {
        this.enableForm(false);
        this.pinWebService.get(+respondId)
          .then(res => {
            this.respondPinTitle = _.get(res, 'data.title');
            this.pin.parentId = +respondId;
            return this.pin;
          })
          .finally(() => {
            this.enableForm(true);
          });
      }

    }

    selectMedia(media) {
      this.pin.selectedMedia = media;
      return this;
    }

    openDatePickerStart() {
      this.closeDatePicker();
      this.datePickerStart.opened = true;
      return this;
    }

    openDatePickerEnd() {
      this.closeDatePicker();
      this.datePickerEnd.opened = true;
      return this;
    }

    closeDatePicker() {
      this.datePickerStart.opened = false;
      this.datePickerEnd.opened = false;
      return this;
    }

    toggleTimePicker() {
      this.pin.allDay = !_.get(this, 'pin.allDay', undefined);
      return this;
    }

    startChange(newStart) {
      this.datePickerEnd.options.minDate = newStart;
      if (!newStart) {
        return this;
      }

      if (!this.pin.end) {
        this.pin.end = newStart;
      } else if (this.pin.end.getTime() < newStart.getTime()) {
        this.pin.end = newStart;
      }
      return this;
    }

    endChange(newEnd) {
      if (!newEnd) {
        return this;
      }

      if (!this.pin.start) {
        this.pin.start = newEnd;
        this.startChange(newEnd);
      }
      return this;
    }

    matchEndDateToStartDate() {
      this.pin.end = this.pin.start;
      return this;
    }

    urlChanged() {
      let sourceUrl = this.pin.sourceUrl;
      if (sourceUrl) {
        this
          .resetForScrape()
          .scrapePage(sourceUrl);
      }
      return this;
    }

    scrapePage(url) {
      this.setScraping(true);
      this.scrapeService.scrapePage(this.pinSuggestion, url)
        .then(() => {
          this.postScrapeCopy();
        })
        .finally(() => {
          this.setScraping(false);
          this.hasScrapedText = true;
          this.hasScrapedImage = true;
        });
      return this;
    }

    scrapeImage(url) {
      this.setScraping(true);
      this.scrapeService.scrapeImage(this.pinSuggestion, url)
        .then(() => {
          this.postScrapeCopy();
        })
        .finally(() => {
          this.setScraping(false);
          this.hasScrapedImage = true;
        });
      return this;
    }

    postScrapeCopy() {
      this.selectMedia(this.pinSuggestion.selectedMedia);
      this.pin.start = this.pinSuggestion.start ? this.pinSuggestion.start : this.pin.start;
      this.pin.end = this.pinSuggestion.end ? this.pinSuggestion.end : this.pin.end;
    }

    clearFormButSourceUrl() {
      this.scrapeService
        .setPin(this.pin, {
          sourceUrl: this.pin.sourceUrl
        });
      return this;
    }

    resetForScrape() {
      let newPin = _.pick(this.pin, ['sourceUrl', 'allDay', 'parentId', 'useMedia']);
      this.scrapeService
        .setPin(this.pin, newPin);
      return this;
    }

    submitPin() {
      // Form needs to settle
      setTimeout(() => {
        this._forceValidate();
        if (!this.$scope.pinForm.$valid) {
          return this.$q.reject('form not valid');
        }

        const pin = {
          ...this.pin,
          ...this._resolveActiveTabPinData(),
        };

        let submitPromise;
        if (this.mode === 'edit') {
          submitPromise = this.scrapeService.updatePin(pin);
        } else {
          submitPromise = this.scrapeService.addPin(pin);
        }
        return submitPromise
          .then(response => {
            this.$state.go('main');
            return response;
          });
      }, 0);
    }

    checkOverlapped($event) {
      if (this.showCreateFooter === $event.isOverlapping) {
        this.$scope.$evalAsync(() => {
          this.showCreateFooter = !$event.isOverlapping;
        }, 0);
      }
    }

    enableForm(enable) {
      this.formDisabled = !enable;
      return this;
    }

    setScraping(scraping) {
      this.scraping = scraping;
      return this;
    }

    addMerchantPrice() {
      if (!this.pin.merchants) {
        this.pin.merchants = this.scrapeService.getResetMerchant();
      }

      this.pin.merchants.push(this.scrapeService.getMerchantObject());
    }

    addLocation() {
      if (!this.pin.locations) {
        this.pin.locations = this.scrapeService.getResetLocation();
      }

      this.pin.locations.push(this.scrapeService.getLocationObject());
    }

    removeMerchantPrice(merchant) {
      this.pin.merchants.splice(this.pin.merchants.indexOf(merchant), 1);
    }

    removeLocation(location) {
      this.pin.locations.splice(this.pin.locations.indexOf(location), 1);
    }


    tabChange(name, value) {
      this.activeTabs[name] = value;
      return this;
    }

    scrapingMessage(content) {
      if (this.scraping) {
        return { message: "Generating Suggestion", code: 0 };
      }
      else if (!this.scraping && !content) {
        return { message: "Suggestion Not Found", code: 1 };
      }
      else if (!this.scraping && content) {
        return { message: "Suggestion", code: 2 };
      }
    }

    scrapingMediaMessage() {
      const hasMedia = !!_.get(this, 'pinSuggestion.media.length');
      if (this.scraping) {
        return "Generating Heading Media Suggestions";
      }
      else if (!this.scraping && hasMedia) {
        return "Heading Media Suggestions";
      }
      else if (!this.scraping && !hasMedia) {
        return "Heading Media Suggestions Not Found";
      }
    }

    getPreviewPin() {
      let defaultView = {
        // use default value
        user: _.get(this, 'user'),
        utcCreatedDateTime: new Date(),
        utcStartDateTime: this.pin.start,
        utcEndDateTime: this.pin.end,
        media: this.pin.useMedia && this.pin.selectedMedia ? [this.pin.selectedMedia] : undefined,
        ...this._resolveActiveTabPinData(),
      };

      defaultView.title = defaultView.title ? defaultView.title : "Preview Your Pin";

      const reducePinView = Object.entries(this.pin).filter(([k, v]) => {
        return !(k === "media" || k === "title" || k === "description");
      }).reduce((a, [k, v]) => {
        return { ...a, [k]: v };
      }, {});

      const tempPin = Object.assign(
        this.previewPin,
        defaultView,
        reducePinView
      );
      return tempPin;
    }

    multPrice(mult) {
      this.pin.price = (this.pin.price || 1) * mult;
    }

    _resolveActiveTabPinData() {
      const view = {
        title: (this.activeTabs['title'] === 0 ? this.pin.title : this.pinSuggestion.title),
        description: this.activeTabs['content'] === 0 ? this.pin.description : this.pinSuggestion.description,
      };
      return view;
    }

    _forceValidate() {
      angular.forEach(this.$scope.pinForm.$error.required, field => {
        field.$setDirty();
      });
      return this;
    }

  }

  angular.module('chronopinNodeApp')
    .component('create', {
      templateUrl: 'app/create/create.html',
      controller: CreateController
    });
})();
