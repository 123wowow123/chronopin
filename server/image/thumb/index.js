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

// Crops to the centre square and scales it to size x size. PNG and GIF stay
// PNG so transparency survives; everything else becomes JPEG.
export function squareImage(bufferOrLocalPath, size) {
  return Jimp.read(bufferOrLocalPath)
    .then(image => {
      const type = image.mime === 'image/png' || image.mime === 'image/gif' ? 'image/png' : 'image/jpeg';
      image.cover({ w: size, h: size });
      return image.getBuffer(type, type === 'image/jpeg' ? { quality: 85 } : undefined)
        .then(buffer => ({
          buffer,
          type
        }));
    });
}
