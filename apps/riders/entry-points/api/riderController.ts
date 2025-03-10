import express, { Request, Response, NextFunction } from "express";

// Service
import { getUserRideHistory, requestRide } from "../../domain/riderService";

// Error Library
import { appError } from "../../../../libraries/errors/AppError";
import { CommonErrorType } from "../../../../libraries/errors/errors.enum";
import { commonError } from "../../../../libraries/errors/errors";

const router = express.Router();

// Middleware to verify JWT token (simplified)
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
	if (!req.headers.authorization) {
		return appError(
			"Authetication required",
			commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
			commonError(CommonErrorType.UN_AUTHORIZED).errorName,
			true
		);
	}

	next();
};

router.post(
	"/request-ride",
    authenticateUser,
	async (req: Request, res: Response, next: NextFunction) => {
		const { pickup_location, dropoff_location } = req.body;

		const userId = req.headers.user_id as string;

		try {
			console.log("Ride request received:", {
				userId,
				pickup_location,
				dropoff_location,
			});

			const ride = await requestRide(userId, pickup_location, dropoff_location);

			console.log("Ride created successfully:", ride.ride_id);

			res.status(201).json(ride);
		} catch (error) {
			console.error("Ride request error:", error);
			next(error);
		}
	}
);

router.get(
    "/rides",
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.headers.user_id as string;

        try {
            const rides = await getUserRideHistory(userId);
            res.status(200).json(rides)
        } catch (error) {
            console.error("Get rides error:", error)
            next(error)
        }
    }
);

export default router;