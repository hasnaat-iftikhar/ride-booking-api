import jwt from "jsonwebtoken";

// Error Library
import { appError } from "../errors/AppError";
import { commonError } from "../errors/errors";
import { CommonErrorType } from "../errors/errors.enum";

interface JwtPayload {
	userId: string;
	email: string;
}

export class JwtAuthenticator {
	static generateToken(payload: { userId: string; email: string }): string {
		return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "24h" });
	}

	static verifyToken(token: string): JwtPayload {
		try {
			return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
		} catch (error) {
			return appError(
				"Invalid Token Error",
				commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
				"Invalid or expired token",
				true
			);
		}
	}
};
