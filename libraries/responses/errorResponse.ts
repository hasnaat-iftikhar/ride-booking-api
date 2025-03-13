// In libraries/responses/errorResponse.ts
export interface ErrorResponse {
	success: boolean;
	error: string;
	message: string;
	details?: unknown;
}

export function createErrorResponse(
	error: string,
	message: string,
	details?: unknown
): ErrorResponse {
	return {
		success: false,
		error,
		message,
		details,
	};
}
