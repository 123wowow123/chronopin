// An error that knows the HTTP status it should be answered with. Route
// handlers turn it into a response (see src/server/http.ts).
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
