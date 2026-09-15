import Pin from '../model/pin';
import { HttpError } from '../util/httpError';

// A user may post a given source URL only once. The body names the existing
// pin so the form can link to it.
export async function rejectDuplicateSourceUrl(pin: Pin) {
  const existing = await Pin.findBySourceUrl(pin.userId, pin.sourceUrl, pin.id);
  if (existing) {
    const message = 'You have already posted a pin with this source URL.';
    throw new HttpError(409, message, { message, pin: existing });
  }
}
