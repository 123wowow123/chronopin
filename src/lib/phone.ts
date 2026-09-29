// A user's phone number: optional everywhere, like the birthday. The sign-up
// form and the profile check it to show a translated message; the API checks
// it again, because anyone can post to it.

export type PhoneProblem = 'format';

// Digits with the separators people type between them, and an optional
// leading +. E.164 allows at most 15 digits; fewer than 7 is not a number
// anyone can be reached on.
const PHONE_CHARS = /^\+?[0-9 ().-]+$/;
const MIN_DIGITS = 7;
const MAX_DIGITS = 15;
// The column's own ceiling (0065): 15 digits leave room for this many
// separators.
const MAX_LENGTH = 32;

// The number as it is saved: trimmed, runs of spaces made one, and null when
// nothing was given.
export function normalizePhone(phone: unknown): string | null {
  if (typeof phone !== 'string') return null;
  const tidy = phone.trim().replace(/\s+/g, ' ');
  return tidy || null;
}

// undefined when the number may be saved. Missing and empty are both fine:
// the field is optional, and clearing it is how a user takes it back.
export function phoneProblem(phone: unknown): PhoneProblem | undefined {
  if (phone == null || phone === '') return undefined;
  if (typeof phone !== 'string') return 'format';
  const tidy = normalizePhone(phone);
  if (!tidy) return undefined;
  if (tidy.length > MAX_LENGTH || !PHONE_CHARS.test(tidy)) return 'format';
  const digits = tidy.replace(/\D/g, '').length;
  return digits < MIN_DIGITS || digits > MAX_DIGITS ? 'format' : undefined;
}

// What an API client is told, in English; the forms translate the code instead.
export function phoneMessage(): string {
  return `phone must be ${MIN_DIGITS} to ${MAX_DIGITS} digits, with an optional leading + and spaces, dashes, dots or brackets between them.`;
}
