import { Jimp } from 'jimp';

export function shrinkImage(bufferOrLocalPath, options) {
  return Jimp.read(bufferOrLocalPath)
    .then(image => {
      const originalWidth = image.bitmap.width;
      const originalHeight = image.bitmap.height;
      const mime = image.mime;

      if (originalWidth > options.uploadImageWidth) {
        image.resize({ w: options.uploadImageWidth });
      }

      return image.getBuffer(mime)
        .then(buffer => ({
          buffer,
          width: image.bitmap.width,
          height: image.bitmap.height,
          originalWidth,
          originalHeight,
          type: mime
        }));
    });
}


export function shrinkFromBuffer(buffer, options) {
  return shrinkImage(buffer, options);
}


export function shrinkFromPath(localPath, options) {
  return shrinkImage(localPath, options);
}
