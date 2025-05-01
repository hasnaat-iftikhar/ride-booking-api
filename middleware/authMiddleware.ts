import type { Request, Response, NextFunction } from "express"
import type { AuthRole } from "../models/types";

// Auth library
import { JwtAuthenticator } from "../libraries/authenticator/jwtAuthenticator"

// Error handling
import { ErrorType, createErrorResponse, throwError } from "../libraries/responses"

// Module augmentation to add 'user' property to Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: { userId: string; email: string; role: AuthRole };
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    const error = createErrorResponse(ErrorType.UNAUTHORIZED, "Authentication token is required");
    return next(error);
  }

  const parts = authHeader.split(" ")

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    const error = createErrorResponse(ErrorType.UNAUTHORIZED, "Token format should be: Bearer [token]");
    return next(error);
  }

  const token = parts[1]

  try {
    const decoded = JwtAuthenticator.verifyToken(token)

    console.log("Decoded token:", decoded)

    req.user = decoded

    next()
  } catch (error) {
    next(error)
  }
}

// --- Authorization Middleware ---
export const authorizeRoles = (...allowedRoles: AuthRole[]) => { 
    return (req: Request, res: Response, next: NextFunction) => {
        // Check if user is authenticated and role is attached
        if (!req.user?.role) {
            // This might happen if authenticateJWT wasn't used first, or if JWT is invalid/missing role
            console.error("Authorization Error: User role not found on request.");
            return throwError(ErrorType.UNAUTHORIZED, "Authentication required with valid role.");
        }

        const userRole = req.user.role;

        // Check if the user's role is in the allowed list
        if (!allowedRoles.includes(userRole)) {
            console.warn(`Forbidden Access: User with role '${userRole}' tried to access restricted route. Allowed: ${allowedRoles.join(", ")}`);
            // Use throwError to ensure consistent error handling via errorHandler
            return throwError(ErrorType.FORBIDDEN, "You do not have permission to access this resource.");
        }

        // User has the required role, proceed to the next middleware/handler
        next();
    };
};
