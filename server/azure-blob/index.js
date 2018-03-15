import azure from 'azure-storage';
import config from '../config/environment';

const retryOperations = new azure.ExponentialRetryPolicyFilter();
const blobSvc = azure.createBlobService(config.azureStorage.AZURE_STORAGE_CONNECTION_STRING)
  .withFilter(retryOperations);


export function createThumbContainer() {
  let promise = new Promise((resolve, reject) => {
    blobSvc.createContainerIfNotExists(
      'thumb', {
        publicAccessLevel: 'blob'
      },
      (error, containerCreated, response) => {
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

export function deleteThumbContainer() {
  let promise = new Promise((resolve, reject) => {
    blobSvc.deleteContainer(
      'thumb',
      (error, response) => {
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

export function getBlobUrl(fileName) {
  return blobSvc.getBlobUrl(
    'thumb',
    fileName);
}

export function createBlob(fileName, stream, size, options) {
  let promise = new Promise((resolve, reject) => {
    try {
      blobSvc.createPageBlobFromStream(
        'thumb',
        fileName,
        stream,
        size,
        options,
        (error, result, response) => {
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

export function createBlock(fileName, stream, size, options) {
  let promise = new Promise((resolve, reject) => {
    try {
      blobSvc.createBlockBlobFromStream(
        'thumb',
        fileName,
        stream,
        size,
        options,
        (error, result, response) => {
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
