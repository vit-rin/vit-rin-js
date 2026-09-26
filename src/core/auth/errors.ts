import { VitRinError } from '../transport/errors';

/**
 * Client-side auth failures that never reach the network (e.g. "refresh
 * was attempted with no refresh token on hand"). Distinct from `ApiError`,
 * which represents a response the server actually sent.
 */
export class AuthError extends VitRinError {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
