/*jshint -W030, -W109, -W003, camelcase: false */
/* disable 'Expected an assignment or function call and instead saw an expression', 'strings must use single quote', 'was used before it was defined' */
'use strict';

describe('Component: mainComponent', function() {

  // load the controller's module
  beforeEach(module('chronopinNodeApp'));
  beforeEach(module('stateMock'));
  beforeEach(module('socketMock'));

  var scope;
  var mainComponent;
  var state;
  var $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function(_$httpBackend_, $http, $componentController, $rootScope, $state,
    socket) {
    $httpBackend = _$httpBackend_;
    //var dateTime = new Date();
    //var dateTimeQuery = new Date(dateTime.setMonth(dateTime.getMonth() - (5 * 12))).toISOString();
    // debugger;
    var pinsUrlRegx = /\/api\/pins\?from_date_time=.*/;
    $httpBackend.expectGET(pinsUrlRegx)
      .respond(pinsResponse(), linkHeader());

    scope = $rootScope.$new();
    state = $state;
    mainComponent = $componentController('main', {
      $http: $http,
      $scope: scope,
      socket: socket
    });
  }));

  it('should attach a list of pinGroups to the controller', function() {
    mainComponent.$onInit();
    $httpBackend.flush();
    expect(mainComponent.pinGroups.length)
      .to.equal(4);
  });

  it('should set previous link header to controller', function() {
    mainComponent.$onInit();
    $httpBackend.flush();
    expect(mainComponent.prevParam)
      .to.eql(linkHeaderPrevious());
  });

  it('should set next link header to controller', function() {
    mainComponent.$onInit();
    $httpBackend.flush();
    expect(mainComponent.nextParam)
      .to.eql(linkHeaderNext());
  });

  it('should add like to Pin', function() {
    mainComponent.$onInit();
    $httpBackend.flush();
    let pin = mainComponent.pinGroups[0][1];
    // flush expect
    $httpBackend
      .expectPOST('/api/pins/' + pin.id + '/like')
      .respond(201, pinLikeFavoriteResponse());

    mainComponent.addLike(pin);
    $httpBackend.flush();

    expect(pin.likeCount)
      .to.eql(1);
  });

  it('should add favorite to Pin', function() {
    mainComponent.$onInit();
    $httpBackend.flush();

    let pin = mainComponent.pinGroups[0][1];
    // flush expect
    $httpBackend
      .expectPOST('/api/pins/' + pin.id + '/favorite')
      .respond(201, pinLikeFavoriteResponse());

    mainComponent.addFavorite(pin);
    $httpBackend.flush();

    expect(pin.favoriteCount)
      .to.eql(1);
  });

  it.skip('UI TEST: should find position of current Pin', function() {
    // mainComponent.$onInit();
    // $httpBackend.flush();
    //
    // let pin = mainComponent.pinGroups[0];
    // // flush expect
    // $httpBackend.expectPOST('/api/pins/' + pin.id + '/favorite', 'message content').respond(201, '');
    //
    // mainComponent.addFavorite(pin);
    //
    // expect(pin.favoriteCount)
    //   .to.eql(1);
  });

});

function linkHeaderPrevious() {
  return {
    from_date_time: '-2013-09-10T00:00:00.000Z',
    last_pin_id: '1',
    //url: 'http://localhost:9000/api/pins/?from_date_time=-2013-09-10T00:00:00.000Z&last_pin_id=1'
  };
}

function linkHeaderNext() {
  return {
    from_date_time: '2013-11-07T00:00:00.000Z',
    last_pin_id: '5',
    //url: 'http://localhost:9000/api/pins/?from_date_time=2013-11-07T00:00:00.000Z&last_pin_id=5'
  };
}

function linkHeader() {
  return {
    'Link': '<http://localhost:9000/api/pins/?from_date_time=-2013-09-10T00:00:00.000Z&last_pin_id=1>; rel="previous", <http://localhost:9000/api/pins/?from_date_time=2013-11-07T00:00:00.000Z&last_pin_id=5>; rel="next"'
  };
}

function pinLikeFavoriteResponse() {
  return {
    'media': [{
      'id': 2,
      'thumbName': '29b1ee75-d078-4427-96e5-fa58149a1750.png',
      'thumbWidth': 848,
      'thumbHeight': 480,
      'originalUrl': 'http://images.apple.com/apple-events/static/apple-events/september-2013/video/poster_large.jpg',
      'originalWidth': 848,
      'originalHeight': 480,
      'type': 'Image'
    }],
    'id': 2,
    'title': 'iPhone 5S Event',
    'description': "This should brighten everyone's day",
    'sourceUrl': 'http://www.apple.com/apple-events/september-2013/',
    'utcStartDateTime': '2013-09-10T00:00:00.000Z',
    'allDay': true,
    'utcCreatedDateTime': '2017-05-23T04:50:21.704Z',
    'favoriteCount': 1,
    'likeCount': 1,
    'hasFavorite': false,
    'hasLike': true
  };
}

function pinsResponse() {
  return {
    'pins': [{
      'media': [{
        'id': 24,
        'thumbName': '46f0ad27-3bd2-47a5-977c-64f1f40fa585.png',
        'thumbWidth': 1080,
        'thumbHeight': 640,
        'originalUrl': 'http://www.iaa.de/fileadmin/user_upload/2016/slider/IAA2016_NMWL_KV_Slider_1080x640px.png',
        'originalWidth': 1080,
        'originalHeight': 640,
        'type': 'Image'
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
    }, {
      'media': [{
        'id': 2,
        'thumbName': '29b1ee75-d078-4427-96e5-fa58149a1750.png',
        'thumbWidth': 848,
        'thumbHeight': 480,
        'originalUrl': 'http://images.apple.com/apple-events/static/apple-events/september-2013/video/poster_large.jpg',
        'originalWidth': 848,
        'originalHeight': 480,
        'type': 'Image'
      }],
      'id': 2,
      'title': 'iPhone 5S Event',
      'description': "This should brighten everyone's day",
      'sourceUrl': 'http://www.apple.com/apple-events/september-2013/',
      'address': null,
      'priceLowerBound': null,
      'priceUpperBound': null,
      'price': null,
      'tip': null,
      'utcStartDateTime': '2013-09-10T00:00:00.000Z',
      'utcEndDateTime': null,
      'allDay': true,
      'utcCreatedDateTime': '2017-05-23T04:50:21.704Z',
      'utcUpdatedDateTime': null,
      'favoriteCount': 0,
      'likeCount': 0,
      'hasFavorite': false,
      'hasLike': false
    }, {
      'media': [{
        'id': 1,
        'thumbName': '72681bdb-2314-483a-bb8b-27375446c580.png',
        'thumbWidth': 290,
        'thumbHeight': 195,
        'originalUrl': 'http://www.eweek.com/imagesvr_ce/522/290_Windows8_1.jpg',
        'originalWidth': 290,
        'originalHeight': 195,
        'type': 'Image'
      }],
      'id': 3,
      'title': 'Windows 8.1 Release Date',
      'description': 'Freatures New Bings Apps',
      'sourceUrl': 'http://www.eweek.com/enterprise-apps/microsoft-windows-8.1-gets-october-release-date/',
      'address': null,
      'priceLowerBound': null,
      'priceUpperBound': null,
      'price': null,
      'tip': null,
      'utcStartDateTime': '2013-10-18T00:00:00.000Z',
      'utcEndDateTime': null,
      'allDay': true,
      'utcCreatedDateTime': '2017-05-23T04:50:21.750Z',
      'utcUpdatedDateTime': null,
      'favoriteCount': 0,
      'likeCount': 0,
      'hasFavorite': false,
      'hasLike': false
    }, {
      'media': [{
        'id': 6,
        'thumbName': '02894688-56b0-4d33-af73-b970652e06d5.png',
        'thumbWidth': 802,
        'thumbHeight': 404,
        'originalUrl': 'https://dri1.img.digitalrivercontent.net/Storefront/Site/msusa/images/promo/Homepage/en-US-Hm-Trip-L-SP4-Alcantara-Productivity.jpg',
        'originalWidth': 802,
        'originalHeight': 404,
        'type': 'Image'
      }],
      'id': 4,
      'title': 'Surface 2',
      'description': 'Thin, light tablet with up to 10-hour battery life',
      'sourceUrl': 'http://www.microsoftstore.com/store/msusa/en_US/html/pbPage.PDPS/productID.286867200',
      'address': null,
      'priceLowerBound': null,
      'priceUpperBound': null,
      'price': null,
      'tip': null,
      'utcStartDateTime': '2013-10-25T00:00:00.000Z',
      'utcEndDateTime': null,
      'allDay': true,
      'utcCreatedDateTime': '2017-05-23T04:50:21.782Z',
      'utcUpdatedDateTime': null,
      'favoriteCount': 0,
      'likeCount': 0,
      'hasFavorite': false,
      'hasLike': false
    }, {
      'media': [{
        'id': 36,
        'thumbName': 'd7673939-1bdb-4b72-8dde-a045b34bf845.png',
        'thumbWidth': 600,
        'thumbHeight': 317,
        'originalUrl': 'http://img.hexus.net/v2/news/nvidia/780Ti.jpg',
        'originalWidth': 600,
        'originalHeight': 317,
        'type': 'Image'
      }],
      'id': 5,
      'title': 'GeForce GTX 780 Ti Launch',
      'description': "best GPU that's ever been built.",
      'sourceUrl': 'http://hexus.net/tech/news/graphics/61677-nvidia-takes-axe-geforce-gtx-780-gtx-770-pricing/',
      'address': null,
      'priceLowerBound': null,
      'priceUpperBound': null,
      'price': 699,
      'tip': null,
      'utcStartDateTime': '2013-11-07T00:00:00.000Z',
      'utcEndDateTime': null,
      'allDay': true,
      'utcCreatedDateTime': '2017-05-23T04:50:21.813Z',
      'utcUpdatedDateTime': null,
      'favoriteCount': 0,
      'likeCount': 0,
      'hasFavorite': false,
      'hasLike': false
    }],
    'queryCount': 5
  };
}
