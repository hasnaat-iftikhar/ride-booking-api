import express, { type Request, type Response, type NextFunction } from "express"

// Service
import { getUserRideHistory, requestRide } from "../../domain/riderService"

// Middleware
import { authenticateJWT } from "../../../../middleware/authMiddleware"

// Success Response
import { createSuccessResponse, SuccessType } from "../../../../libraries/responses/successResponse"

const router = express.Router()

router.post("/request-ride", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  const { pickup_location, dropoff_location } = req.body

  const userId = req.user?.userId as string

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
})

router.get("/rides", authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId as string

  try {
    const rides = await getUserRideHistory(userId)

    res.status(200).json(createSuccessResponse(SuccessType.RETRIEVED, rides, "Ride history retrieved successfully"))
  } catch (error) {
    console.error("Get rides error:", error)
    next(error)
  }
})

export default router

