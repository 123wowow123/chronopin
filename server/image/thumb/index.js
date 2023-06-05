// import sharp from 'sharp';
import Jimp from 'jimp';

export function shrinkImage(bufferOrLocalPath, options) {
  return Jimp.read(bufferOrLocalPath)
    .then(image => {
      // do stuff with the image (if no exception)
      let originalWidth = image.bitmap.width;
      let originalHeight = image.bitmap.height;

      return new Promise((resolve, reject) => {
        let output;
        if (originalWidth <= options.uploadImageWidth) { // rename to max width?
          image
            .getBuffer(Jimp.AUTO, (err, buffer) => {
              if (err) {
                reject(err);
              }
              output = {
                buffer: buffer,
                width: image.bitmap.width,
                height: image.bitmap.height,
                originalWidth: originalWidth,
                originalHeight: originalHeight,
                type: image.getMIME()
              };
            });
          resolve(output);
        } else {
          image
            .resize(options.uploadImageWidth, Jimp.AUTO)
            .getBuffer(Jimp.AUTO, (err, buffer) => {
              if (err) {
                reject(err);
              }
              output = {
                buffer: buffer,
                width: image.bitmap.width,
                height: image.bitmap.height,
                originalWidth: originalWidth,
                originalHeight: originalHeight,
                type: image.getMIME()
              };
            });
          resolve(output);
        }
      });
    });
}


export function shrinkFromBuffer(buffer, options) {
  return shrinkImage(buffer, options);
}


export function shrinkFromPath(localPath, options) {
  return shrinkImage(localPath, options);
}