import express, { type Request, type Response, type NextFunction } from "express"

// Service
import { getUserRideHistory, requestRide, cancelRide } from "../../domain/riderService"

// Middleware
import { authenticateJWT } from "../../../../middleware/authMiddleware"

// Validators
import { RequestValidator } from "../../../../libraries/validators/requestValidator"
import { requestRideSchema, cancelRideSchema } from "../../../../libraries/validators/schemas/rideSchemas"

// Response utilities
import { createSuccessResponse, SuccessType, createErrorResponse, ErrorType } from "../../../../libraries/responses"

const router = express.Router()

router.post(
  "/request-ride",
  authenticateJWT,
  RequestValidator.validate(requestRideSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { pickup_location, dropoff_location } = req.body
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json(createErrorResponse(ErrorType.UNAUTHORIZED, "User ID is missing"))
	  return
    }

    try {
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
      next(error)
    }
  },
)

router.get("/rides", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId

  if (!userId) {
    res.status(401).json(createErrorResponse(ErrorType.UNAUTHORIZED, "User ID is missing"))
	return
  }

  try {
    const rides = await getUserRideHistory(userId)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, rides, "Ride history retrieved successfully"))
  } catch (error) {
    console.error("Get rides error:", error)
    next(error)
  }
})

router.post(
  "/cancel-ride",
  authenticateJWT,
  RequestValidator.validate(cancelRideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { ride_id } = req.body
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json(createErrorResponse(ErrorType.UNAUTHORIZED, "User ID is missing"))
	  return
    }

    try {
      const ride = await cancelRide(userId, ride_id)

      res.status(200).json(createSuccessResponse(SuccessType.UPDATED, ride, "Ride cancelled successfully"))
    } catch (error) {
      console.error("Cancel ride error:", error)
      next(error)
    }
  },
)

export default router
