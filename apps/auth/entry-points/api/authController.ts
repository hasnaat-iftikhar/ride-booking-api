import express, { type Request, type Response, type NextFunction } from "express"

// Services
import { loginUser, registerUser } from "../../domain/authService"

// Type definitions
import type { User as UserType } from "../../../../models/types"
import { RequestValidator } from "../../../../libraries/validators/requestValidator"
import { loginSchema, registerSchema } from "../../../../libraries/validators/schemas/authSchemas"

// Response utilities
import { createSuccessResponse, SuccessType } from "../../../../libraries/responses"

const router = express.Router()

router.post(
  "/register",
  RequestValidator.validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone_number, password } = req.body

    try {
      const user: Partial<UserType> = await registerUser(name, email, phone_number, password)

      res.status(201).json(createSuccessResponse(SuccessType.CREATED, user, "User registered successfully"))
    } catch (error) {
      console.error("Registration error:", error)
      next(error)
    }
  },
)

router.post(
  "/login",
  RequestValidator.validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body

    try {
      const result = await loginUser(email, password)

      res.status(200).json(createSuccessResponse(SuccessType.AUTHENTICATED, result, "User logged in successfully"))
    } catch (error) {
      console.error("Login error:", error)
      next(error)
    }
  },
)

export default router
