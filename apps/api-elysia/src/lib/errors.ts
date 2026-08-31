export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message: string): never {
  throw new HttpError(400, message);
}

export function unauthorized(message = "Unauthorized"): never {
  throw new HttpError(401, message);
}

export function forbidden(message = "Forbidden"): never {
  throw new HttpError(403, message);
}

export function notFound(message: string): never {
  throw new HttpError(404, message);
}

export function conflict(message: string): never {
  throw new HttpError(409, message);
}
