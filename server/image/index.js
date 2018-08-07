import downloadImage from './download';
import * as thumb from './thumb';
import * as azureBlob from '../azure-blob';
import streamifier from '../util/streamifier';
import config from '../config/environment';
import * as url from 'url';
import * as path from 'path';
import * as log from '../util/log';

//pipe to sizeOf
//pipe to thumb
//pipe to check if name exist
//pipe to save azure blob
//pipe to save in Medium

const THUMB_OPTIONS = {
  width: config.thumbWidth
};

export function createThumb(imageUrl) {
  //create get image stream
  return downloadImage(imageUrl)
    .then(buffer => {
      return thumb
        .shrink(buffer, THUMB_OPTIONS)
        .then(newThumb => {
          return {
            buffer: buffer,
            thumbWidth: newThumb.width,
            thumbHeight: newThumb.height,

            originalUrl: imageUrl,
            originalWidth: newThumb.originalWidth,
            originalHeight: newThumb.originalHeight,
            type: newThumb.type,
            extention: _getExtention(imageUrl)
          };
        })
        .catch(err => {
          log.error('save-thumb error:', err);
          throw new Error(err);
        });
    }).catch(err => {
      log.error('download-image error:', err);
      throw new Error(err);
    });
}

export function saveThumb(thumbObj) {
  let bufferLength = thumbObj.buffer.length,
    pageBlobSize = Math.ceil(bufferLength / 512) * 512,
    sf = streamifier.createReadStream(thumbObj.buffer);
  return azureBlob.createBlock(thumbObj.thumbName, sf, pageBlobSize, {
    contentSettings: {
      contentType: thumbObj.type //'image/png'
    }
  })
    .then(() => {
      return thumbObj;
    })
    .catch(err => {
      log.error('save-thumb error:', err);
      throw new Error(err);
    });
}

// https://stackoverflow.com/questions/190852/how-can-i-get-file-extensions-with-javascript/12900504#12900504
function _getExtention(fname) {
  return path.extname(url.parse(fname).pathname); // '.jpg'
}

export {
  downloadImage
};
