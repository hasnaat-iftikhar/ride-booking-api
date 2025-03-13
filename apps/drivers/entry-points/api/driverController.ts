import express, { type Request, type Response, type NextFunction } from "express"

// Service
import {
  registerDriver,
  loginDriver,
  getDriverById,
  updateDriverProfile,
  deleteDriverAccount,
  getAllDrivers,
  updateDriverStatus,
} from "../../domain/driverService"

// Middleware
import { authenticateJWT } from "../../../../middleware/authMiddleware"

// Validators
import { RequestValidator } from "../../../../libraries/validators/requestValidator"
import {
  registerDriverSchema,
  loginDriverSchema,
  updateDriverSchema,
  updateDriverStatusSchema,
} from "../../../../libraries/validators/schemas/driverSchemas"

// Success Response
import { createSuccessResponse, SuccessType } from "../../../../libraries/responses/successResponse"

const router = express.Router()

// Public routes
router.post(
  "/register",
  RequestValidator.validate(registerDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("[Driver Controller] Registering driver:", req.body)
    const { name, email, phone_number, license_number, password } = req.body

    try {
      const driver = await registerDriver(name, email, phone_number, license_number, password)

      res.status(201).json(createSuccessResponse(SuccessType.CREATED, driver, "Driver registered successfully"))
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  "/login",
  RequestValidator.validate(loginDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body

    try {
      const result = await loginDriver(email, password)

      res.status(200).json(createSuccessResponse(SuccessType.AUTHENTICATED, result, "Driver logged in successfully"))
    } catch (error) {
      next(error)
    }
  },
)

// Protected routes
router.get("/profile", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      throw new Error("User ID is missing")
    }

    console.log("Getting driver profile for ID:", req.user.userId)
    const driver = await getDriverById(req.user.userId)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, driver, "Driver profile retrieved successfully"))
  } catch (error) {
    next(error)
  }
})

router.put(
  "/profile",
  authenticateJWT,
  RequestValidator.validate(updateDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        throw new Error("User ID is missing")
      }

      console.log("Updating driver profile for ID:", req.user.userId, "with data:", req.body)
      const driver = await updateDriverProfile(req.user.userId, req.body)

      res.status(200).json(createSuccessResponse(SuccessType.UPDATED, driver, "Driver profile updated successfully"))
    } catch (error) {
      next(error)
    }
  },
)

router.delete("/account", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      throw new Error("User ID is missing")
    }

    const result = await deleteDriverAccount(req.user.userId)

    res.status(200).json(createSuccessResponse(SuccessType.DELETED, result, "Driver account deleted successfully"))
  } catch (error) {
    next(error)
  }
})

router.put(
  "/status",
  authenticateJWT,
  RequestValidator.validate(updateDriverStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body

    try {
      if (!req.user?.userId) {
        throw new Error("User ID is missing")
      }

      const driver = await updateDriverStatus(req.user.userId, status)

      res
        .status(200)
        .json(createSuccessResponse(SuccessType.UPDATED, driver, `Driver status updated to ${status} successfully`))
    } catch (error) {
      next(error)
    }
  },
)

// Admin routes (would typically have additional authorization)
router.get("/all", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = req.query.status ? { status: req.query.status as string } : {}
    const drivers = await getAllDrivers(filters)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, drivers, "All drivers retrieved successfully"))
  } catch (error) {
    next(error)
  }
})

export default router

