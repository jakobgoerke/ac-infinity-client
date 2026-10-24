class AuthenticationError extends Error {
  constructor(message?: string) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

class ApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly msg?: string,
  ) {
    super(`API request failed [code="${code}", msg="${msg}"]`);

    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export { ApiError, AuthenticationError };
