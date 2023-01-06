/*jshint -W030, -W109, -W003, camelcase: false */
/* disable 'Expected an assignment or function call and instead saw an expression', 'strings must use single quote', 'was used before it was defined' */
'use strict';

describe('Component: createComponent', function() {

  // load the controller's module
  beforeEach(module('chronopinNodeApp'));
  beforeEach(module('stateMock'));
  beforeEach(module('socketMock'));

  var $scope;
  var createComponent;
  var state;
  var $httpBackend;
  var $q;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(_$httpBackend_, $http, $componentController, $rootScope, $state,
    socket, _$q_) {

    $httpBackend = _$httpBackend_;
    $q = _$q_;
    // var dateTime = new Date();
    // var dateTimeQuery = new Date(dateTime.setMonth(dateTime.getMonth() - (5 * 12))).toISOString();
    // var pinsUrlRegx = /\/api\/pins\?from_date_time=.*/;
    // $httpBackend.whenGET(pinsUrlRegx)
    //   .respond(pinsResponse(), linkHeader());

    $scope = $rootScope.$new();
    state = $state;
    createComponent = $componentController('create', {
      $http: $http,
      $scope: $scope,
      socket: socket
    });
  }));

  describe('set default values', function() {
    let baseDate,
      dateOptions,
      timeOptions,
      datePickerOptions,
      timePickerOptions;

    beforeEach(function() {
      baseDate = new Date();
      dateOptions = {
        //formatYear: 'yy',
        // maxDate: new Date(2020, 5, 22),
        // minDate: new Date(),
        startingDay: 1,
        baseDate: baseDate
      };
      timeOptions = {
        hstep: 1,
        mstep: 15,
        ismeridian: true
      };
      datePickerOptions = {
        opened: false,
        options: angular.extend({}, dateOptions)
      };
      timePickerOptions = {
        options: angular.extend({}, timeOptions)
      };
    });

    it('should set title to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.title)
        .to.equal('Create Pin');
    });
    it('should set #isAdmin to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.isAdmin)
        .to.be.an.instanceof(Function);
    });
    it('should set mode to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.mode)
        .to.be.equal('create');
    });
    it('should set formDisabled to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.formDisabled)
        .to.be.false;
    });
    it('should init pin with allDay : true to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.pin)
        .to.deep.equal({
          allDay: true
        });
    });
    it('should set altInputFormats to the controller', function() {
      createComponent.$onInit();
      expect(createComponent.altInputFormats)
        .to.have.lengthOf(1);
      expect(createComponent.altInputFormats)
        .to.include.members(['shortDate']);
    });
    it('should set datePickerStart to the controller pre and post init', function() {
      // expect(createComponent.datePickerStart)
      //   .to.deep.equal(datePickerOptions);
      createComponent.$onInit();
      expect(createComponent.datePickerStart.opened)
        .to.equal(datePickerOptions.opened);
    });
    it('should set datePickerEnd to the controller pre and post init', function() {
      // expect(createComponent.datePickerEnd)
      //   .to.deep.equal(datePickerOptions);
      createComponent.$onInit();
      expect(createComponent.datePickerEnd.opened)
        .to.equal(datePickerOptions.opened);
    });
    it('should set timePickerStart to the controller pre and post init', function() {
      expect(createComponent.timePickerStart)
        .to.deep.equal(timePickerOptions);
      createComponent.$onInit();
      expect(createComponent.timePickerStart.opened)
        .to.equal(timePickerOptions.opened);
    });
    it('should set timePickerEnd to the controller pre and post init', function() {
      expect(createComponent.timePickerEnd)
        .to.deep.equal(timePickerOptions);
      createComponent.$onInit();
      expect(createComponent.timePickerEnd.opened)
        .to.equal(timePickerOptions.opened);
    });
    it('should eval pin.allDay to true', function() {
      createComponent.$onInit();
      expect(createComponent.pin.allDay)
        .to.be.true;
    });
  });

  it('#selectImage should set pin.selectedMedia to argument image', function() {
    let firstImage = scrapeResponse().media[0];
    createComponent.$onInit();
    expect(createComponent.pin.selectedMedia)
      .to.be.undefined;
    createComponent.selectImage(firstImage);
    expect(firstImage)
      .to.eql(createComponent.pin.selectedMedia);
  });

  it('#openDatePickerStart should set datePickerStart.opened to true and call #closeDatePicker', function() {
    sinon.stub(createComponent, 'closeDatePicker');
    createComponent.$onInit();
    createComponent.openDatePickerStart();
    expect(createComponent.datePickerStart.opened)
      .to.be.true;
    expect(createComponent.closeDatePicker.calledOnce)
      .to.be.true;
    createComponent.closeDatePicker.restore();
  });

  it('#openDatePickerEnd should set datePickerEnd.opened to true and call #closeDatePicker', function() {
    sinon.stub(createComponent, 'closeDatePicker');
    createComponent.$onInit();
    expect(createComponent.openDatePickerEnd())
      .to.equal(createComponent);
    expect(createComponent.datePickerEnd.opened)
      .to.be.true;
    expect(createComponent.closeDatePicker.calledOnce)
      .to.be.true;
    createComponent.closeDatePicker.restore();
  });

  it('#closeDatePicker should set all datePicker open to false', function() {
    createComponent.$onInit();
    expect(createComponent.closeDatePicker())
      .to.equal(createComponent);
    expect(createComponent.datePickerStart.opened)
      .to.be.false;
    expect(createComponent.datePickerEnd.opened)
      .to.be.false;
  });

  it('#toggleTimePicker should toggle pin.allDay from true to false and vice versa', function() {
    createComponent.$onInit();
    expect(createComponent.pin.allDay)
      .to.be.true;
    expect(createComponent.toggleTimePicker())
      .to.equal(createComponent);
    expect(createComponent.pin.allDay)
      .to.be.false;
    expect(createComponent.toggleTimePicker())
      .to.equal(createComponent);
    expect(createComponent.pin.allDay)
      .to.be.true;
  });

  it('#startChange & #endChange should set createComponent.datePickerEnd.options.minDate and createComponent.pin.end', function() {
    let pin,
      start = new Date('October 14, 2016 11:15:00'),
      end = new Date('October 14, 2016 11:20:00');
    createComponent.$onInit();
    pin = createComponent.pin;

    // null is pass as arg
    pin.start = null;
    pin.end = end;

    expect(createComponent.startChange(null))
      .to.be.equal(createComponent);
    expect(pin.start)
      .to.be.equal(createComponent.datePickerEnd.options.minDate);

    // set with start is null and end is new value
    pin.start = null;
    pin.end = end;

    expect(createComponent.endChange(end))
      .to.be.equal(createComponent);
    expect(pin.start)
      .to.be.equal(createComponent.datePickerEnd.options.minDate);

    // set with start arg
    pin.start = start;
    createComponent.startChange(start);
    expect(createComponent.datePickerEnd.options.minDate)
      .to.be.equal(start);

    // set with start arg less then end value
    pin.start = start;
    pin.end = end;
    createComponent.startChange(start);
    expect(createComponent.datePickerEnd.options.minDate)
      .to.be.equal(start);
    expect(createComponent.pin.end)
      .to.be.equal(end);

    // set with start arg greater then end value
    start.setDate(15);
    pin.start = start;
    createComponent.startChange(start);
    expect(createComponent.datePickerEnd.options.minDate)
      .to.be.equal(start);
  });

  it('#startChange should set appropriate dateTime for createComponent.pin.start and createComponent.pin.end', function() {
    let pin,
      start = new Date('October 14, 2016 11:15:00'),
      end = new Date('October 14, 2016 11:20:00');

    createComponent.$onInit();
    pin = createComponent.pin;

    // null is pass as arg
    pin.start = start;
    pin.end = end;

    expect(createComponent.startChange(null))
      .to.be.equal(createComponent);
    expect(pin.start)
      .to.be.equal(start);
    expect(pin.end)
      .to.be.equal(end);

    // Both dates time are null
    pin.start = null;
    pin.end = null;

    pin.start = start;
    createComponent.startChange(start);

    expect(pin.start)
      .to.be.equal(start);
    expect(pin.end)
      .to.be.equal(start);

    // start date is greater then end date
    start.setDate(15);
    pin.start = start;
    pin.end = end;

    createComponent.startChange(start);
    expect(createComponent.pin.end)
      .to.be.equal(start);

    // end date is greater then end date
    start.setDate(14);
    end.setDate(15);
    pin.start = start;
    pin.end = end;

    createComponent.startChange(start);
    expect(createComponent.pin.start)
      .to.be.equal(start);
    expect(createComponent.pin.end)
      .to.be.equal(end);
  });

  it('#endChange should set appropriate dateTime for createComponent.pin.start and createComponent.pin.end', function() {
    let pin,
      start = new Date('October 14, 2016 11:15:00'),
      end = new Date('October 14, 2016 11:20:00');

    createComponent.$onInit();
    pin = createComponent.pin;

    // null is pass as arg
    pin.start = start;
    pin.end = end;

    expect(createComponent.endChange(null))
      .to.be.equal(createComponent);
    expect(pin.start)
      .to.be.equal(start);
    expect(pin.end)
      .to.be.equal(end);

    // set with start is null and end is new value
    pin.start = null;
    pin.end = end;

    expect(createComponent.endChange(end))
      .to.be.equal(createComponent);
    expect(pin.start)
      .to.be.equal(end);
    expect(pin.end)
      .to.be.equal(end);

    // Both dates time are null
    pin.start = null;
    pin.end = null;

    pin.utcEndDateTime = end;
    createComponent.endChange(end);

    expect(pin.end)
      .to.be.equal(end);
    expect(pin.start)
      .to.be.equal(end);

    // end date is greater then end date
    end.setDate(15);
    pin.start = start;
    pin.end = end;

    createComponent.endChange(end);
    expect(createComponent.pin.start)
      .to.be.equal(start);
    expect(createComponent.pin.end)
      .to.be.equal(end);
  });

  it('#setPin should set pin to the controller', function() {
    let pin = pinModel1();
    createComponent.$onInit();
    // set pin model
    createComponent.setPin(pin);
    expect(createComponent.pin.id)
      .to.be.equal(pin.id);
    expect(createComponent.pin.sourceUrl)
      .to.be.equal(pin.sourceUrl);
    expect(createComponent.pin.title)
      .to.be.equal(pin.title);
    expect(createComponent.pin.description)
      .to.be.equal(pin.description);
    expect(createComponent.pin.address)
      .to.be.equal(pin.address);
    expect(createComponent.pin.price)
      .to.be.equal(pin.price);
    expect(createComponent.pin.start.getTime())
      .to.be.equal((new Date(pin.utcStartDateTime)).getTime());
    expect(createComponent.pin.end.getTime())
      .to.be.equal((new Date(pin.utcEndDateTime)).getTime());
    expect(createComponent.pin.media)
      .to.be.equal(pin.media);
    expect(createComponent.pin.selectedMedia)
      .to.be.equal(pin.media[0]);
    // set pin model properties to empty
    createComponent.setPin({});
    expect(createComponent.pin.id)
      .to.be.undefined;
    expect(createComponent.pin.sourceUrl)
      .to.be.undefined;
    expect(createComponent.pin.title)
      .to.be.undefined;
    expect(createComponent.pin.description)
      .to.be.undefined;
    expect(createComponent.pin.address)
      .to.be.undefined;
    expect(createComponent.pin.price)
      .to.be.undefined;
    expect(createComponent.pin.start)
      .to.be.undefined;
    expect(createComponent.pin.end)
      .to.be.undefined;
    expect(createComponent.pin.media)
      .to.be.undefined;
    expect(createComponent.pin.selectedMedia)
      .to.be.undefined;
  });

  it('#setPinFromScrape should set pin to the controller from scraping response', function() {
    let scrapedPin = scrapeResponse();
    createComponent.$onInit();
    // set pin model
    createComponent.setPinFromScrape(scrapedPin);
    expect(createComponent.pin.title)
      .to.be.equal(scrapedPin.titles[0]);
    expect(createComponent.pin.description)
      .to.be.equal(scrapedPin.descriptions[0]);
    expect(createComponent.pin.start.getTime())
      .to.be.equal((new Date(scrapedPin.dates[0].start)).getTime());
    expect(createComponent.pin.end.getTime())
      .to.be.equal((new Date(scrapedPin.dates[0].end)).getTime());
    expect(createComponent.pin.allDay)
      .to.be.false;
    expect(createComponent.pin.media)
      .to.be.equal(scrapedPin.media);
    expect(createComponent.pin.selectedMedia)
      .to.be.equal(scrapedPin.media[0]);
  });

  it('#scrapePage should request /api/scrape endpoint for scraped content - positive path', function() {
    let scrapeRes = scrapeResponse(),
      scrapeUrl = 'https://test.com',
      escapedScrapeUrl = 'https:%2F%2Ftest.com';
    sinon.stub(createComponent, 'setPinFromScrape').returns(createComponent);
    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    createComponent.$onInit();

    $httpBackend
      .expect('GET', '/api/scrape' + '?url=' + escapedScrapeUrl)
      .respond(200, scrapeRes);

    createComponent.scrapePage(scrapeUrl);
    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;

    $httpBackend.flush();

    expect(createComponent.setPinFromScrape.calledWith(scrapeRes))
      .to.be.true;
    expect(createComponent.enableForm.calledWith(true))
      .to.be.true;

    createComponent.setPinFromScrape.restore();
    createComponent.enableForm.restore();
  });

  it('#scrapePage should request /api/scrape endpoint for scraped content - negative path', function() {
    let promise,
      errorMsg = 'Page Not Found',
      scrapeUrl = 'https://test.com',
      escapedScrapeUrl = 'https:%2F%2Ftest.com';

    sinon.stub(createComponent, 'setPinFromScrape').returns(createComponent);
    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    createComponent.$onInit();

    $httpBackend
      .expect('GET', '/api/scrape' + '?url=' + escapedScrapeUrl)
      .respond(404, errorMsg);

    promise = createComponent.scrapePage(scrapeUrl);
    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;

    $httpBackend.flush();

    expect(createComponent.setPinFromScrape.notCalled)
      .to.be.true;
    expect(createComponent.enableForm.calledWith(true))
      .to.be.true;

    createComponent.setPinFromScrape.restore();
    createComponent.enableForm.restore();
  });

  it('#urlChanged should reset pin model and call $scrapePage', function() {
    let pin1 = pinModel1(),
      pin;

    sinon.stub(createComponent, 'resetForScrape').returns(createComponent);
    sinon.stub(createComponent, 'scrapePage').returns(createComponent);

    createComponent.$onInit();
    pin = createComponent.setPin(pin1).pin;
    createComponent.urlChanged();

    expect(createComponent.resetForScrape.calledOnce)
      .to.be.true;
    expect(createComponent.scrapePage.calledWith(pin.sourceUrl))
      .to.be.true;

    createComponent.resetForScrape.restore();
    createComponent.scrapePage.restore();
  });

  it('#clearFormButSourceUrl should clear pin model except sourceUrl', function() {
    let pin = pinModel1();
    createComponent.$onInit();
    createComponent.setPin(pin);
    expect(createComponent.pin.sourceUrl)
      .to.be.equal(pin.sourceUrl);
    createComponent.clearFormButSourceUrl();
    expect(createComponent.pin.sourceUrl)
      .to.be.equal(pin.sourceUrl);
    expect(createComponent.pin.id)
      .to.be.undefined;
    expect(createComponent.pin.title)
      .to.be.undefined;
    expect(createComponent.pin.description)
      .to.be.undefined;
    expect(createComponent.pin.address)
      .to.be.undefined;
    expect(createComponent.pin.price)
      .to.be.undefined;
    expect(createComponent.pin.start)
      .to.be.undefined;
    expect(createComponent.pin.end)
      .to.be.undefined;
    expect(createComponent.pin.media)
      .to.be.undefined;
    expect(createComponent.pin.selectedMedia)
      .to.be.undefined;
  });

  it('#resetForScrape should clear pin model except sourceUrl and allDay', function() {
    let pin,
      pinModel = pinModel1();
    createComponent.$onInit();
    pin = createComponent.setPin(pinModel).pin;
    createComponent.resetForScrape();
    expect(createComponent.pin.id)
      .to.be.undefined;
    expect(createComponent.pin.sourceUrl)
      .to.be.equal(pin.sourceUrl);
    expect(createComponent.pin.title)
      .to.be.undefined;
    expect(createComponent.pin.description)
      .to.be.undefined;
    expect(createComponent.pin.address)
      .to.be.undefined;
    expect(createComponent.pin.price)
      .to.be.undefined;
    expect(createComponent.pin.start)
      .to.be.undefined;
    expect(createComponent.pin.end)
      .to.be.undefined;
    expect(createComponent.pin.allDay)
      .to.be.true;
    expect(createComponent.pin.media)
      .to.be.undefined;
    expect(createComponent.pin.selectedMedia)
      .to.be.undefined;
  });

  it('#submitPin should submit pin model', function() {
    // edit feature not tested
    let promise,
      promiseRes,
      ctrlPin,
      pin = pinModel1();
    sinon.stub(createComponent, '_forceValidate');
    sinon.stub(createComponent, '_updatePin').returns($q.resolve('pass'));
    sinon.stub(createComponent, '_addPin').returns($q.resolve('pass'));

    createComponent.$onInit();
    ctrlPin = createComponent.setPin(pin).pin;
    //valid form case
    promise = createComponent.submitPin(ctrlPin, true);
    expect(createComponent._forceValidate.calledOnce)
      .to.be.true;
    expect(createComponent._updatePin.notCalled)
      .to.be.true;
    expect(createComponent._addPin.calledWith(ctrlPin))
      .to.be.true;
    expect(promise.then)
      .to.be.an.instanceof(Function);
    // reset stubs
    createComponent._forceValidate.reset();
    createComponent._updatePin.reset();
    createComponent._addPin.reset();
    //invalid form case
    promise = createComponent.submitPin(ctrlPin, false);
    expect(createComponent._forceValidate.calledOnce)
      .to.be.true;
    expect(createComponent._updatePin.notCalled)
      .to.be.true;
    expect(createComponent._addPin.notCalled)
      .to.be.true;

    promise.catch(err => {
      promiseRes = err;
    });
    createComponent.$scope.$apply();
    expect(promiseRes)
      .to.be.equal('form not valid');

    createComponent._forceValidate.restore();
    createComponent._updatePin.restore();
    createComponent._addPin.restore();
  });

  it.skip('UI TEST: #checkOverlapped should show floating footer if form body is not overlapping', function() {

  });

  it('#enableForm should toggle formDisabled on controller based on argument', function() {
    createComponent.$onInit();
    createComponent.enableForm(true);
    expect(createComponent.formDisabled)
      .to.be.false;
    createComponent.enableForm(false);
    expect(createComponent.formDisabled)
      .to.be.true;
  });

  it.skip('UI TEST: #_forceValidate should force form fields to validate based', function() {
    createComponent.$onInit();
    createComponent._forceValidate();
    angular.forEach(createComponent.$scope.pinForm.$error.required, (field) => {
      expect(field.$dirty)
        .to.be.true;
    });
  });

  it('#_addPin should POST pin data to server - positive path', function() {
    let scrapedPin = scrapeResponse(),
      pinModel = pinModel1(),
      pin,
      postFormatedPin,
      promise,
      promiseRes;

    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    sinon.stub(createComponent, '_formatSubmitPin').returns(createComponent);
    state.expectTransitionTo('main');

    createComponent.$onInit();
    // set pin model
    pin = createComponent.setPinFromScrape(scrapedPin).pin;
    postFormatedPin = createComponent._formatSubmitPin(pin);

    $httpBackend
      .expect('POST', '/api/pins', postFormatedPin)
      .respond(200, pinModel);

    promise = createComponent._addPin(pin);

    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;
    expect(createComponent._formatSubmitPin.calledWith(pin))
      .to.be.true;

    promise.then(res => {
      promiseRes = res.data;
    });

    $httpBackend.flush();

    expect(createComponent.enableForm.calledOnce)
      .to.be.true;

    expect(createComponent.success)
      .to.be.eql(pinModel);

    state.ensureAllTransitionsHappened();
    createComponent.enableForm.restore();
    createComponent._formatSubmitPin.restore();
  });

  it('#_addPin should POST pin data to server - negative path', function() {
    let scrapedPin = scrapeResponse(),
      pin,
      postFormatedPin,
      promise,
      errorMsg = 'Page Not Found';

    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    sinon.stub(createComponent, '_formatSubmitPin').returns(createComponent);

    createComponent.$onInit();
    // set pin model
    pin = createComponent.setPinFromScrape(scrapedPin).pin;
    postFormatedPin = createComponent._formatSubmitPin(pin);

    $httpBackend
      .expect('POST', '/api/pins', postFormatedPin)
      .respond(404, errorMsg);

    promise = createComponent._addPin(pin);

    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;
    expect(createComponent._formatSubmitPin.calledWith(pin))
      .to.be.true;

    $httpBackend.flush();

    expect(createComponent.enableForm.calledWith(true))
      .to.be.true;

    expect(createComponent.success)
      .to.be.undefined;

    state.ensureAllTransitionsHappened();
    createComponent.enableForm.restore();
    createComponent._formatSubmitPin.restore();
  });

  it('#_updatePin should PUT pin data to server - positive path', function() {
    let scrapedPin = scrapeResponse(),
      pinModel = pinModel1(),
      pin,
      postFormatedPin,
      promise,
      promiseRes;

    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    sinon.stub(createComponent, '_formatSubmitPin').returns(createComponent);
    state.expectTransitionTo('main');

    createComponent.$onInit();
    // set pin model
    pin = createComponent.setPinFromScrape(scrapedPin).pin;
    postFormatedPin = createComponent._formatSubmitPin(pin);

    $httpBackend
      .expect('PUT', '/api/pins/' + pin.id, postFormatedPin)
      .respond(200, pinModel);

    promise = createComponent._updatePin(pin);

    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;
    expect(createComponent._formatSubmitPin.calledWith(pin))
      .to.be.true;

    promise.then(res => {
      promiseRes = res.data;
    });

    $httpBackend.flush();

    expect(createComponent.enableForm.calledOnce)
      .to.be.true;

    expect(createComponent.success)
      .to.be.eql(pinModel);

    state.ensureAllTransitionsHappened();
    createComponent.enableForm.restore();
    createComponent._formatSubmitPin.restore();
  });

  it('#_updatePin should PUT pin data to server - negative path', function() {
    let scrapedPin = scrapeResponse(),
      pin,
      postFormatedPin,
      promise,
      errorMsg = 'Page Not Found';

    sinon.stub(createComponent, 'enableForm').returns(createComponent);
    sinon.stub(createComponent, '_formatSubmitPin').returns(createComponent);

    createComponent.$onInit();
    // set pin model
    pin = createComponent.setPinFromScrape(scrapedPin).pin;
    postFormatedPin = createComponent._formatSubmitPin(pin);

    $httpBackend
      .expect('PUT', '/api/pins/' + pin.id, postFormatedPin)
      .respond(404, errorMsg);

    promise = createComponent._updatePin(pin);

    expect(createComponent.enableForm.calledWith(false))
      .to.be.true;
    expect(createComponent._formatSubmitPin.calledWith(pin))
      .to.be.true;

    $httpBackend.flush();

    expect(createComponent.enableForm.calledWith(true))
      .to.be.true;

    expect(createComponent.success)
      .to.be.undefined;

    state.ensureAllTransitionsHappened();
    createComponent.enableForm.restore();
    createComponent._formatSubmitPin.restore();
  });

  it('#_getDateTimeToDayBegin should set time portion to midnight', function() {
    let endDateTime, initDateTime,
      initDateTimeString = '2017-06-16T12:34:56.78-0700';
    createComponent.$onInit();
    initDateTime = new Date(initDateTimeString);
    expect(initDateTime.getUTCFullYear()).to.be.equal(2017);
    expect(initDateTime.getUTCMonth()).to.be.equal(5);
    expect(initDateTime.getUTCDate()).to.be.equal(16);
    expect(initDateTime.getUTCHours()).to.be.equal(19);
    expect(initDateTime.getUTCMinutes()).to.be.equal(34);
    expect(initDateTime.getUTCSeconds()).to.be.equal(56);
    expect(initDateTime.getUTCMilliseconds()).to.be.equal(780);

    endDateTime = createComponent._getDateTimeToDayBegin(initDateTime);
    expect(initDateTime !== endDateTime).to.be.true;

    expect(endDateTime.getUTCFullYear()).to.be.equal(2017);
    expect(endDateTime.getUTCMonth()).to.be.equal(5);
    expect(endDateTime.getUTCDate()).to.be.equal(16);
    expect(endDateTime.getUTCHours()).to.be.equal(7);
    expect(endDateTime.getUTCMinutes()).to.be.equal(0);
    expect(endDateTime.getUTCSeconds()).to.be.equal(0);
    expect(endDateTime.getUTCMilliseconds()).to.be.equal(0);
  });

  it('#_getDateTimeToDayEnd should set time portion to 1 tick before midnight', function() {
    let endDateTime, initDateTime,
      initDateTimeString = '2017-06-16T12:34:56.78-0700';
    createComponent.$onInit();
    initDateTime = new Date(initDateTimeString);
    expect(initDateTime.getUTCFullYear()).to.be.equal(2017);
    expect(initDateTime.getUTCMonth()).to.be.equal(5);
    expect(initDateTime.getUTCDate()).to.be.equal(16);
    expect(initDateTime.getUTCHours()).to.be.equal(19);
    expect(initDateTime.getUTCMinutes()).to.be.equal(34);
    expect(initDateTime.getUTCSeconds()).to.be.equal(56);
    expect(initDateTime.getUTCMilliseconds()).to.be.equal(780);

    endDateTime = createComponent._getDateTimeToDayEnd(initDateTime);
    expect(initDateTime !== endDateTime).to.be.true;

    expect(endDateTime.getUTCFullYear()).to.be.equal(2017);
    expect(endDateTime.getUTCMonth()).to.be.equal(5);
    expect(endDateTime.getUTCDate()).to.be.equal(17);
    expect(endDateTime.getUTCHours()).to.be.equal(6);
    expect(endDateTime.getUTCMinutes()).to.be.equal(59);
    expect(endDateTime.getUTCSeconds()).to.be.equal(59);
    expect(endDateTime.getUTCMilliseconds()).to.be.equal(999);
  });

  it('#_formatSubmitPin should map pin to server required format - allDay: true path', function() {
    let ctrlPin, formatedPin, pin = pinModel1();

    pin.utcStartDateTime = '2017-06-16T12:34:56.78-0700';
    pin.utcEndDateTime = '2017-06-17T12:34:56.78-0700';

    createComponent.$onInit();
    ctrlPin = createComponent.setPin(pin).pin;
    expect(createComponent.pin.allDay)
      .to.be.true;

    formatedPin = createComponent._formatSubmitPin(ctrlPin);

    expect(formatedPin)
      .to.be.eql({
        title: 'Frankfurt, 65th International Motor Show (2013)',
        description: 'Passenger cars, motorcycles, motor caravans, parts and accessories, telematics, products for servicing, repair and maintenance',
        sourceUrl: 'http://www.iaa.de',
        utcStartDateTime: new Date('2017-06-16T07:00:00.000Z'),
        utcEndDateTime: new Date('2017-06-18T06:59:59.999Z'),
        allDay: true,
        media: [{
          originalUrl: 'http://www.iaa.de/fileadmin/user_upload/2016/slider/IAA2016_NMWL_KV_Slider_1080x640px.png',
          width: 1080,
          height: 640
        }],
      });
  });

  it('#_formatSubmitPin should map pin to server required format - allDay: false path', function() {
    let ctrlPin, formatedPin, pin = pinModel1();

    pin.utcStartDateTime = '2017-06-16T12:34:56.78-0700';
    pin.utcEndDateTime = '2017-06-17T12:34:56.78-0700';

    createComponent.$onInit();
    ctrlPin = createComponent.setPin(pin).pin;
    expect(createComponent.toggleTimePicker().pin.allDay)
      .to.be.false;

    formatedPin = createComponent._formatSubmitPin(ctrlPin);

    expect(formatedPin)
      .to.be.eql({
        title: 'Frankfurt, 65th International Motor Show (2013)',
        description: 'Passenger cars, motorcycles, motor caravans, parts and accessories, telematics, products for servicing, repair and maintenance',
        sourceUrl: 'http://www.iaa.de',
        utcStartDateTime: new Date('2017-06-16T19:34:56.780Z'),
        utcEndDateTime: new Date('2017-06-17T19:34:56.780Z'),
        allDay: false,
        media: [{
          originalUrl: 'http://www.iaa.de/fileadmin/user_upload/2016/slider/IAA2016_NMWL_KV_Slider_1080x640px.png',
          width: 1080,
          height: 640
        }],
      });
  });

});

function scrapeResponse() {
  return {
    'dates': [{
      'start': '2017-06-05T00:54:50.000Z',
      'end': '2017-06-05T01:54:50.000Z',
      'allDay': false
    }],
    'descriptions': ['China recently unveiled the largest floating solar power plant on earth which supplies 40MW of power to the grid in Huainan, China.'],
    'titles': ["China Is Now Powered by the World's Largest Floating Solar Power Plant', 'China Is Now Powered by the World’s Largest Floating Solar Power Plant', 'Floating Solar Power Plants"],
    'media': [{
      'originalUrl': 'http://cdn.interestingengineering.com/wp-content/uploads/2017/05/floating-solar-plant-1.jpg',
      'width': 768,
      'height': 545
    }, {
      'originalUrl': 'http://cdn.interestingengineering.com/wp-content/themes/touchmedya/loading.gif',
      'width': 600,
      'height': 600
    }, {
      'originalUrl': 'http://cdn.interestingengineering.com/loading.gif',
      'width': 600,
      'height': 600
    }, {
      'originalUrl': 'http://cdn.interestingengineering.com/wp-content/uploads/2016/04/AAEAAQAAAAAAAAkeAAAAJGM3NzFmMjNhLWM0ODMtNDMxYy04ODk1LWU0OTI0NGNjNTBmOQ-150x150.jpg',
      'width': 150,
      'height': 150
    }, {
      'originalUrl': 'http://cdn.interestingengineering.com/wp-content/themes/touchmedya/images/logo-footer.png',
      'width': 247,
      'height': 54
    }, {
      'originalUrl': 'http://cdn.interestingengineering.com/wp-content/themes/touchmedya/images/logo.png',
      'width': 209,
      'height': 50
    }]
  };
}

function pinModel1() {
  return {
    'media': [{
      'originalUrl': 'http://www.iaa.de/fileadmin/user_upload/2016/slider/IAA2016_NMWL_KV_Slider_1080x640px.png',
      'width': 1080,
      'height': 640
    }],
    'id': 1,
    'title': 'Frankfurt, 65th International Motor Show (2013)',
    'description': 'Passenger cars, motorcycles, motor caravans, parts and accessories, telematics, products for servicing, repair and maintenance',
    'sourceUrl': 'http://www.iaa.de',
    'address': null,
    'priceLowerBound': null,
    'priceUpperBound': null,
    'price': null,
    'tip': null,
    'utcStartDateTime': '2013-09-10T00:00:00.000Z',
    'utcEndDateTime': '2013-09-22T00:00:00.000Z',
    'allDay': true,
    'utcCreatedDateTime': '2017-05-23T04:50:21.672Z',
    'utcUpdatedDateTime': null,
    'favoriteCount': 0,
    'likeCount': 0,
    'hasFavorite': false,
    'hasLike': false
  };
}
