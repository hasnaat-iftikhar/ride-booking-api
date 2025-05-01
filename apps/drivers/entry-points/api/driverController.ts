import express from "express"
import type { Request, Response, NextFunction } from "express"

// Service
import {
  registerDriver,
  loginDriver,
  getDriverById,
  updateDriverProfile,
  deleteDriverAccount,
  getAllDrivers,
  updateDriverStatus,
  acceptRide,
} from "../../domain/driverService"

// Middleware
import { authenticateJWT, authorizeRoles } from "../../../../middleware/authMiddleware"

// Validators
import { RequestValidator } from "../../../../libraries/validators/requestValidator"
import {
  registerDriverSchema,
  loginDriverSchema,
  updateDriverSchema,
  updateDriverStatusSchema,
} from "../../../../libraries/validators/schemas/driverSchemas"
import {
	acceptRideSchema
} from "../../../../libraries/validators/schemas/rideSchemas"

// Response utilities
import { createSuccessResponse, SuccessType, ErrorType, throwError } from "../../../../libraries/responses"

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
      if (error instanceof Error) {
        next(error);
      } else {
        next(new Error("An unknown error occurred during driver registration."));
      }
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
      if (error instanceof Error) {
        next(error);
      } else {
        next(new Error("An unknown error occurred during driver login."));
      }
    }
  },
)
// Protected routes
router.get("/profile", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      console.error("User ID missing from request after authenticateJWT middleware.");
      return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
    }
    const userId = req.user.userId;

    console.log("Getting driver profile for ID:", userId)
    const driver = await getDriverById(userId)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, driver, "Driver profile retrieved successfully"))
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error("An unknown error occurred fetching driver profile."));
    }
  }
})

router.put(
  "/profile",
  authenticateJWT,
  RequestValidator.validate(updateDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        console.error("User ID missing from request after authenticateJWT middleware.");
        return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
      }
      const userId = req.user.userId;
      const updateData = req.body;

      console.log("Updating driver profile for ID:", userId, "with data:", updateData)
      const driver = await updateDriverProfile(userId, updateData)

      res.status(200).json(createSuccessResponse(SuccessType.UPDATED, driver, "Driver profile updated successfully"))
    } catch (error) {
       if (error instanceof Error) {
         next(error);
       } else {
         next(new Error("An unknown error occurred updating driver profile."));
       }
    }
  },
)

router.delete("/account", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      console.error("User ID missing from request after authenticateJWT middleware.");
      return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
    }
    const userId = req.user.userId;

    const result = await deleteDriverAccount(userId)

    res.status(200).json(createSuccessResponse(SuccessType.DELETED, result, "Driver account deleted successfully"))
  } catch (error) {
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error("An unknown error occurred deleting driver account."));
    }
  }
})

router.put(
  "/status",
  authenticateJWT,
  RequestValidator.validate(updateDriverStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        console.error("User ID missing from request after authenticateJWT middleware.");
        return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
      }
      const userId = req.user.userId;
      const { status } = req.body;

      const driver = await updateDriverStatus(userId, status)

      res
        .status(200)
        .json(createSuccessResponse(SuccessType.UPDATED, driver, `Driver status updated to ${status} successfully`))
    } catch (error) {
      if (error instanceof Error) {
        next(error);
      } else {
        next(new Error("An unknown error occurred updating driver status."));
      }
    }
  },
)

// Accept ride endpoint
router.post(
  "/accept-ride",
  authenticateJWT,
  RequestValidator.validate(acceptRideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        console.error("User ID missing from request after authenticateJWT middleware.");
        return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
      }
      const userId = req.user.userId;
      const { ride_id } = req.body;

      const ride = await acceptRide(userId, ride_id)

      res.status(200).json(createSuccessResponse(SuccessType.UPDATED, ride, "Ride accepted successfully"))
    } catch (error) {
      if (error instanceof Error) {
        next(error);
      } else {
        next(new Error("An unknown error occurred accepting ride."));
      }
    }
  },
)

// Admin routes (ADD AUTHORIZATION MIDDLEWARE HERE)
router.get(
    "/all", 
    authenticateJWT, 
    authorizeRoles('admin'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const filters = req.query.status ? { status: req.query.status as string } : {}
            const drivers = await getAllDrivers(filters)

            res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, drivers, "All drivers retrieved successfully"))
        } catch (error) {
            if (error instanceof Error) {
                next(error);
            } else {
                next(new Error("An unknown error occurred fetching all drivers."));
            }
        }
    }
)

export default router
