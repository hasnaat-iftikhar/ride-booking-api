import type { Request, Response, NextFunction } from "express";

// Auth library
import { JwtAuthenticator } from "../libraries/authenticator/jwtAuthenticator";

// Error Library
import { appError } from "../libraries/errors/AppError";
import { commonError } from "../libraries/errors/errors";
import { CommonErrorType } from "../libraries/errors/errors.enum";

declare global {
	namespace Express {
		interface Request {
			user?: { userId: string; email: string };
		}
	}
}

export const authenticateJWT = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		return next(
			appError(
				"Authentication Required",
				commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
				"Authentication token is required",
				true
			)
		);
	}

	const parts = authHeader.split(" ");

	if (parts.length !== 2 || parts[0] !== "Bearer") {
		return next(
			appError(
				"Invalid Token Format",
				commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
				"Token format should be: Bearer [token]",
				true
			)
		);
	}

	const token = parts[1];

	try {
		const decoded = JwtAuthenticator.verifyToken(token);

		req.user = decoded;

		next();
	} catch (error) {
		next(error);
	}
};
