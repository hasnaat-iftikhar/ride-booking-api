// Success response types
export enum SuccessType {
	CREATED = "created",
	UPDATED = "updated",
	DELETED = "deleted",
	RETRIEVED = "retrieved",
	AUTHENTICATED = "authenticated",
}

// Error response types
export enum ErrorType {
	NOT_FOUND = "notFound",
	UNAUTHORIZED = "unauthorized",
	BAD_REQUEST = "badRequest",
	FORBIDDEN = "forbidden",
	CONFLICT = "conflict",
	SERVER_ERROR = "serverError",
	VALIDATION_ERROR = "validationError",
}

// Response interfaces
export interface BaseResponse {
	success: boolean;
	message: string;
}

export interface SuccessResponse<T> extends BaseResponse {
	data: T;
	meta?: Record<string, unknown>;
}

export interface ErrorResponse extends BaseResponse {
	error: string;
	details?: unknown;
	code: number;
}

// Success message mapping
const successMessages = {
	created: "Resource created successfully",
	updated: "Resource updated successfully",
	deleted: "Resource deleted successfully",
	retrieved: "Resource retrieved successfully",
	authenticated: "Authentication successful",
};

// Error mapping
const errorMapping = {
	notFound: { code: 404, message: "Resource not found" },
	unauthorized: { code: 401, message: "Unauthorized access" },
	badRequest: { code: 400, message: "Bad request" },
	forbidden: { code: 403, message: "Forbidden" },
	conflict: { code: 409, message: "Resource conflict" },
	serverError: { code: 500, message: "Internal server error" },
	validationError: { code: 422, message: "Validation error" },
};

// Success response factory
export function createSuccessResponse<T>(
	type: SuccessType,
	data: T,
	customMessage?: string,
	meta?: Record<string, unknown>
): SuccessResponse<T> {
	return {
		success: true,
		message: customMessage || successMessages[type],
		data,
		meta,
	};
}

// Error response factory
export function createErrorResponse(
	type: ErrorType,
	customMessage?: string,
	details?: unknown
): ErrorResponse {
	const error = errorMapping[type];

	return {
		success: false,
		error: type,
		message: customMessage || error.message,
		details,
		code: error.code,
	};
}

// Error thrower for middleware
export function throwError(
	type: ErrorType,
	customMessage?: string,
	details?: unknown
): never {
	const error = new Error(customMessage || errorMapping[type].message);
	Object.assign(error, {
		errorType: type,
		details,
		statusCode: errorMapping[type].code,
	});
	throw error;
}
