import type { Request, Response, NextFunction } from "express";
import type { Error as SequelizeError } from "sequelize";

// Type definition
import { AppError } from "../libraries/errors/AppError";

const errorHandler = (
	err: SequelizeError,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	console.error("Error caught by middleware:", err);

	if (err instanceof AppError) {
		return res.status(err.httpCode).json({
			success: false,
			error: err.description,
			name: err.name,
		});
	}

	// Handle validation errors
	if (err.name === "ValidationError") {
		return res.status(400).json({
			success: false,
			error: "Validation Error",
			details: err.message,
		});
	}

	// Handle database errors
	if (
		err.name === "SequelizeError" ||
		err.name === "SequelizeValidationError"
	) {
		return res.status(400).json({
			success: false,
			error: "Database Error",
			details: err.message,
		});
	}

	// Log unexpected errors and send a generic response
	console.error(err.stack);

	res.status(500).json({
		success: false,
		error: "Internal server error",
		message: process.env.NODE_ENV === "development" ? err.message : undefined,
	});
};

export default errorHandler;
