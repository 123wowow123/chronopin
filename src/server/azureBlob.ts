import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import config from './config';
import log from './util/log';

const THUMB_CONTAINER = 'thumb';

let thumbContainer: ContainerClient | null = null;

function getThumbContainer(): ContainerClient {
  if (!thumbContainer) {
    if (!config.azureStorage.connectionString) {
      log.error('Missing AZURE_STORAGE_CONNECTION_STRING; thumbnails cannot be stored.');
    }
    thumbContainer = BlobServiceClient.fromConnectionString(config.azureStorage.connectionString).getContainerClient(
      THUMB_CONTAINER,
    );
  }
  return thumbContainer;
}

export function createThumbContainer() {
  return getThumbContainer().createIfNotExists({ access: 'blob' });
}

export function deleteThumbContainer() {
  return getThumbContainer().deleteIfExists();
}

export function getBlobUrl(fileName: string) {
  return getThumbContainer().getBlockBlobClient(fileName).url;
}

export function uploadThumb(fileName: string, buffer: Buffer, contentType: string) {
  return getThumbContainer()
    .getBlockBlobClient(fileName)
    .uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
}

export function deleteThumb(fileName: string) {
  return getThumbContainer().getBlockBlobClient(fileName).deleteIfExists();
}
