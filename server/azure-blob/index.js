import { BlobServiceClient } from '@azure/storage-blob';
import config from '../config/environment';
import * as log from '../util/log';

const THUMB_CONTAINER = 'thumb';

if (!config.azureStorage.AZURE_STORAGE_CONNECTION_STRING) {
  log
    .error("Environment:", process.env.NODE_ENV)
    .error("Missing Azure Storage Connection String, 'config.azureStorage.AZURE_STORAGE_CONNECTION_STRING'.");
}

let thumbContainer = null;

function getThumbContainer() {
  if (!thumbContainer) {
    thumbContainer = BlobServiceClient
      .fromConnectionString(config.azureStorage.AZURE_STORAGE_CONNECTION_STRING)
      .getContainerClient(THUMB_CONTAINER);
  }
  return thumbContainer;
}

export function createThumbContainer() {
  return getThumbContainer().createIfNotExists({ access: 'blob' });
}

export function deleteThumbContainer() {
  return getThumbContainer().deleteIfExists();
}

export function getBlobUrl(fileName) {
  return getThumbContainer().getBlockBlobClient(fileName).url;
}

export function uploadThumb(fileName, buffer, contentType) {
  return getThumbContainer()
    .getBlockBlobClient(fileName)
    .uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType }
    });
}

export function deleteThumb(fileName) {
  return getThumbContainer().getBlockBlobClient(fileName).deleteIfExists();
}
