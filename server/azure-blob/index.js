'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

exports.createThumbContainer = createThumbContainer;
exports.deleteThumbContainer = deleteThumbContainer;
exports.getBlobUrl = getBlobUrl;
exports.createBlob = createBlob;
exports.createBlock = createBlock;

var _azureStorage = require('azure-storage');

var _azureStorage2 = _interopRequireDefault(_azureStorage);

var _environment = require('../config/environment');

var _environment2 = _interopRequireDefault(_environment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var retryOperations = new _azureStorage2.default.ExponentialRetryPolicyFilter();
var blobSvc = _azureStorage2.default.createBlobService(_environment2.default.azureStorage.AZURE_STORAGE_CONNECTION_STRING).withFilter(retryOperations);

function createThumbContainer() {
  var promise = new _promise2.default(function (resolve, reject) {
    blobSvc.createContainerIfNotExists('thumb', {
      publicAccessLevel: 'blob'
    }, function (error, containerCreated, response) {
      if (!error) {
        resolve({
          containerCreated: containerCreated,
          response: response
        });
      } else {
        reject(error);
      }
    });
  });
  return promise;
}

function deleteThumbContainer() {
  var promise = new _promise2.default(function (resolve, reject) {
    blobSvc.deleteContainer('thumb', function (error, response) {
      if (!error) {
        resolve({
          response: response
        });
      } else {
        reject(error);
      }
    });
  });
  return promise;
}

function getBlobUrl(fileName) {
  return blobSvc.getBlobUrl('thumb', fileName);
}

function createBlob(fileName, stream, size, options) {
  var promise = new _promise2.default(function (resolve, reject) {
    try {
      blobSvc.createPageBlobFromStream('thumb', fileName, stream, size, options, function (error, result, response) {
        if (!error) {
          // file uploaded
          resolve({
            result: result,
            response: response
          });
        } else {
          reject(error);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

function createBlock(fileName, stream, size, options) {
  var promise = new _promise2.default(function (resolve, reject) {
    try {
      blobSvc.createBlockBlobFromStream('thumb', fileName, stream, size, options, function (error, result, response) {
        if (!error) {
          // file uploaded
          resolve({
            result: result,
            response: response
          });
        } else {
          reject(error);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
  return promise;
}
//# sourceMappingURL=index.js.map
