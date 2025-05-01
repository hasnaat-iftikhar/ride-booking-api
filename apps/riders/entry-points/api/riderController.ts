import express from "express"
import type { Request, Response, NextFunction } from "express"

// Service
import { getUserRideHistory, requestRide, cancelRide } from "../../domain/riderService"

// Middleware
import { authenticateJWT } from "../../../../middleware/authMiddleware"

// Validators
import { RequestValidator } from "../../../../libraries/validators/requestValidator"
import { requestRideSchema, cancelRideSchema } from "../../../../libraries/validators/schemas/rideSchemas"

// Response utilities
import { createSuccessResponse, SuccessType, createErrorResponse, ErrorType, throwError } from "../../../../libraries/responses"

const router = express.Router()

router.post(
  "/request-ride",
  authenticateJWT,
  RequestValidator.validate(requestRideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        console.error("User ID missing from request after authenticateJWT middleware.")
        return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.")
      }
      const userId = req.user.userId
      const { pickup_location, dropoff_location } = req.body

      console.log("Ride request received:", {
        userId,
        pickup_location,
        dropoff_location,
      })

      const ride = await requestRide(userId, pickup_location, dropoff_location)

      console.log("Ride created successfully:", ride.ride_id)

      res.status(201).json(createSuccessResponse(SuccessType.CREATED, ride, "Ride requested successfully"))
    } catch (error) {
      console.error("Ride request error:", error)
      if (error instanceof Error) {
        next(error)
      } else {
        next(new Error("An unknown error occurred during ride request."))
      }
    }
  },
)

router.get("/rides", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      console.error("User ID missing from request after authenticateJWT middleware.")
      return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.")
    }
    const userId = req.user.userId

    const rides = await getUserRideHistory(userId)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, rides, "Ride history retrieved successfully"))
  } catch (error) {
    console.error("Get rides error:", error)
    if (error instanceof Error) {
      next(error)
    } else {
      next(new Error("An unknown error occurred while fetching rides."))
    }
  }
})

router.post(
  "/cancel-ride",
  authenticateJWT,
  RequestValidator.validate(cancelRideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.userId) {
        console.error("User ID missing from request after authenticateJWT middleware.")
        return throwError(ErrorType.SERVER_ERROR, "User identifier missing after authentication.")
      }
      const userId = req.user.userId
      const { ride_id } = req.body

      const ride = await cancelRide(userId, ride_id)

      res.status(200).json(createSuccessResponse(SuccessType.UPDATED, ride, "Ride cancelled successfully"))
    } catch (error) {
      console.error("Cancel ride error:", error)
      if (error instanceof Error) {
        next(error)
      } else {
        next(new Error("An unknown error occurred during ride cancellation."))
      }
    }
  },
)

export default router
