import jwt from "jsonwebtoken"

// Error Library
import { appError } from "../errors/AppError"
import { commonError } from "../errors/errors"
import { CommonErrorType } from "../errors/errors.enum"

interface JwtPayload {
  userId: string
  email: string
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class JwtAuthenticator {
  static generateToken(payload: { userId: string; email: string }): string {
    const secret = process.env.JWT_SECRET
    console.log("Environment variables loaded:", Object.keys(process.env))
    console.log("JWT_SECRET:", secret ? "Defined" : "Undefined")

    if (!secret) {
      throw appError(
        "JWT Configuration Error",
        commonError(CommonErrorType.SERVER_ERROR).statusCode,
        "JWT_SECRET is not defined",
        true,
      )
    }

    return jwt.sign(payload, secret, { expiresIn: "24h" })
  }

  static verifyToken(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET

    if (!secret) {
      throw appError(
        "JWT Configuration Error",
        commonError(CommonErrorType.SERVER_ERROR).statusCode,
        "JWT_SECRET is not defined",
        true,
      )
    }

    try {
      return jwt.verify(token, secret) as JwtPayload
    } catch (error) {
      console.error("Token verification failed:", error)
      throw appError(
        "Authentication Error",
        commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
        "Invalid or expired token",
        true,
      )
    }
  }
}

