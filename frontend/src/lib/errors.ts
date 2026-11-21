// Shared error type for the API client and mock layer.
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail || `Request failed (${err.status})`;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}
