import azure from 'azure-storage';
import config from '../config/environment';
import * as log from '../util/log';

const containerName = 'thumb';
const retryOperations = new azure.ExponentialRetryPolicyFilter();

if (!config.azureStorage.AZURE_STORAGE_CONNECTION_STRING) {
  log
    .error("Environment:", process.env.NODE_ENV)
    .error("Missing Azure Storage Connection String, 'config.azureStorage.AZURE_STORAGE_CONNECTION_STRING'.")
    .info(log.stringify(config));
}

const blobSvc = azure.createBlobService(config.azureStorage.AZURE_STORAGE_CONNECTION_STRING)
  .withFilter(retryOperations);

export function iterateOverAllBlobsInThumbContainer(properties) {
  let promise = new Promise((outerResolve, outerReject) => {
    let blobs = [];
    function listBlobs(continuationToken, callback) {
      // Also includes upgrade to latest code samples: https://github.com/search?q=repo%3AAzure%2Fazure-sdk-for-js%20setproperties&type=code
      blobSvc.listBlobsSegmented(containerName, continuationToken, function (error, result) {
        blobs.push.apply(blobs, result.entries);
        const continuationToken = result.continuationToken;
        if (continuationToken) {
          listBlobs(continuationToken, callback);
        } else {
          console.log("completed listing all blobs");
          callback();
        }
      });
    }

    listBlobs(null, () => {

      console.log(blobs);
      let promises = blobs.map((b) => {
        return new Promise((resolve, reject) => {
          // https://stackoverflow.com/questions/41680131/add-cache-control-and-expires-headers-to-azure-blob-storage-node-js
          blobSvc.setBlobProperties(containerName, b.name, properties, (error, result, response) => {
            console.log(JSON.stringify(result));
            if (error) {
              reject(result);
            }
            resolve(result);
          })
        });

      });
      return Promise.all(promises)
        .then(outerResolve)
        .catch(outerReject);

    });
  });
  return promise;
}

export function createThumbContainer() {
  let promise = new Promise((resolve, reject) => {
    blobSvc.createContainerIfNotExists(
      containerName, {
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
      containerName,
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
    containerName,
    fileName);
}

export function createBlob(fileName, stream, size, options) {
  let promise = new Promise((resolve, reject) => {
    try {
      blobSvc.createPageBlobFromStream(
        containerName,
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
        containerName,
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
