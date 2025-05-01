// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";

// Response utilities
import { createErrorResponse, ErrorType } from "../libraries/responses";

// No AppError class, errors are augmented standard Errors from throwError
// import { AppError } from "../libraries/errors/AppError"; 

interface AugmentedError extends Error {
	errorType?: ErrorType;
	statusCode?: number;
	details?: unknown;
}

const errorHandler = (
	err: AugmentedError, // Use AugmentedError type
	req: Request,
	res: Response,
	_next: NextFunction // Keep unused next prefixed
) => {
	console.error("Error caught by handler:", err);

	// Check if it's an error augmented by throwError
	if (err.errorType && err.statusCode) {
		// Send specific response based on augmented properties
		return res
			.status(err.statusCode)
			.json(createErrorResponse(err.errorType, err.message, err.details));
	}

	// Handle other types of errors (like direct validation errors or others)
	// This part might need refinement depending on how other errors are passed

	// For unhandled/unexpected errors, send a generic 500 response
	console.error("Unhandled Error:", err.stack);
	const serverError = createErrorResponse(
		ErrorType.SERVER_ERROR,
		process.env.NODE_ENV === "production" ? "An internal server error occurred" : err.message
	);
	return res.status(500).json(serverError);
};

export default errorHandler;