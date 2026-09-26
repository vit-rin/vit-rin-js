/**
 * The shared error envelope every VIT-RIN API response uses on failure:
 *
 *   { error: { code, message, fields?, request_id? } }
 *
 * `code` is the stable, machine-readable identifier callers switch on
 * (e.g. `campaign.not_found`, `auth.refresh_reused`) — see
 * vit-rin-backend/api/openapi/shared/components.yaml. This shape is not
 * specific to any one surface, so it lives in `core/transport` rather than
 * in the temporary hand-written `types/auth.ts`.
 */
export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: ApiFieldError[];
  request_id?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorBody;
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const error = (value as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: unknown }).code;
  const message = (error as { message?: unknown }).message;
  return typeof code === 'string' && typeof message === 'string';
}

/** Base class for every error `core/transport` throws. */
export abstract class VitRinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * A non-2xx HTTP response whose body decoded as the shared error envelope.
 * `code` is what callers should branch on; `message` is for logs/UI only
 * and may be localised.
 */
export class ApiError extends VitRinError {
  readonly status: number;
  readonly code: string;
  readonly fields?: ApiFieldError[];
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.requestId = body.request_id;
  }

  /**
   * Builds an ApiError from a raw response body, falling back to a
   * synthetic `http.<status>` code when the body isn't the expected
   * envelope shape (e.g. an upstream proxy's HTML error page).
   */
  static fromResponseBody(status: number, body: unknown): ApiError {
    if (isApiErrorEnvelope(body)) {
      return new ApiError(status, body.error);
    }
    return new ApiError(status, {
      code: `http.${status}`,
      message: typeof body === 'string' && body.length > 0 ? body : `Request failed with status ${status}`,
    });
  }
}

/** The request could not be sent or the response could not be read at all. */
export class NetworkError extends VitRinError {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

/** The request was aborted because it exceeded its timeout. */
export class TimeoutError extends VitRinError {
  constructor(message = 'Request timed out') {
    super(message);
  }
}
