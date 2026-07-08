const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN_ROLE: 403,
  FORBIDDEN_SITE: 403,
  FORBIDDEN_SELF_APPROVAL: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INSUFFICIENT_STOCK: 409,
  INVALID_WORKFLOW_STATE: 409,
  CONFLICT: 409,
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS_BY_CODE[code] ?? 400;
  }
}
