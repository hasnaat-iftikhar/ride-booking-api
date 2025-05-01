import jwt from "jsonwebtoken";
import type { AuthRole } from "../../models/types";

// Unified response handling
import { throwError, ErrorType } from "../responses";

interface JwtPayload {
	userId: string;
	email: string;
	role: AuthRole;
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class JwtAuthenticator {
	static generateToken(payload: { userId: string; email: string; role: AuthRole }): string {
		const secret = process.env.JWT_SECRET;

		if (!secret) {
			throwError(ErrorType.SERVER_ERROR, "JWT_SECRET is not defined");
		}

		return jwt.sign(payload, secret, { expiresIn: "24h" });
	}

	static verifyToken(token: string): JwtPayload {
		const secret = process.env.JWT_SECRET;

		if (!secret) {
			throwError(ErrorType.SERVER_ERROR, "JWT_SECRET is not defined");
		}

		try {
			const decoded = jwt.verify(token, secret) as JwtPayload;
			if (!decoded.role || !['rider', 'admin', 'driver'].includes(decoded.role)) {
				console.error('Invalid or missing role in verified JWT payload:', decoded);
				throw new Error('Invalid JWT payload: Role missing or invalid.');
			}
			return decoded;
		} catch (error) {
			console.error("Token verification failed:", error instanceof Error ? error.message : String(error));
			if (error instanceof Error && error.message.startsWith('Invalid JWT payload')) {
				throwError(ErrorType.UNAUTHORIZED, error.message);
			}
			throwError(ErrorType.UNAUTHORIZED, "Invalid or expired token");
		}
	}
}
