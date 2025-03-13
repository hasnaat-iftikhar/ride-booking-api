import { riderDataAccess } from "../data-access/riderDataAccess";

// Error library
import { appError } from "../../../libraries/errors/AppError";
import { commonError } from "../../../libraries/errors/errors";
import { CommonErrorType } from "../../../libraries/errors/errors.enum";

// Type definations
import type { Ride as RideType } from "../../../models/types";
import { driverDataAccess } from "../../drivers/data-access/driverDataAccess";

export const requestRide = async (
	userId: string,
	pickupLocation: string,
	dropoffLocation: string
): Promise<RideType> => {
	try {
		const fare = calculateFare(pickupLocation, dropoffLocation);

		// Create ride request
		const ride = await riderDataAccess.createRideRequest({
			user_id: userId,
			pickup_location: pickupLocation,
			dropoff_location: dropoffLocation,
			fare,
		});

		return ride;
	} catch (error) {
		console.error("Error in requestRide service: ", error);

		return appError(
			"No Available Drivers Error",
			commonError(CommonErrorType.BAD_REQUEST).statusCode,
			"No drivers are currently available. Please try again later.",
			true
		);
	}
};

export const getUserRideHistory = async (
	userId: string
): Promise<RideType[]> => {
	try {
		return await riderDataAccess.getUserRides(userId);
	} catch (error) {
		console.error("Error in getUserRideHistory service:", error);
		throw error;
	}
};

// Helper function to calculate fare (simplified)
function calculateFare(pickup: string, dropoff: string): number {
	// Todo: You have to use a mapping service to calculate distance
	// and then apply pricing rules
	const baseFare = 5.0;
	const perKmRate = 2.0;

	// Simplified distance calculation (random for this example)
	const estimatedDistance = Math.random() * 10 + 1; // 1-11 km

	return Number((baseFare + perKmRate * estimatedDistance).toFixed(2));
}

// In riderService.ts
export const cancelRide = async (
	userId: string,
	rideId: string
): Promise<RideType> => {
	try {
		// 1. Get the ride and verify it belongs to the user
		const ride = await riderDataAccess.findRideById(rideId);

		if (!ride) {
			return appError(
				"Ride Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		if (ride.user_id !== userId) {
			return appError(
				"Unauthorized",
				commonError(CommonErrorType.FORBIDDEN).statusCode,
				"You can only cancel your own rides",
				true
			);
		}

		if (ride.status !== "requested" && ride.status !== "in_progress") {
			return appError(
				"Cannot Cancel Ride",
				commonError(CommonErrorType.BAD_REQUEST).statusCode,
				"Ride cannot be canceled in its current state",
				true
			);
		}

		// 2. Update ride status
		const updatedRide = await riderDataAccess.updateRideStatus(
			rideId,
			"canceled"
		);

		if (!updatedRide) {
			return appError(
				"Ride Update Failed",
				commonError(CommonErrorType.SERVER_ERROR).statusCode,
				"Failed to update ride status",
				true
			);
		}

		// 3. If a driver is assigned, update their status
		if (ride.driver_id) {
			await driverDataAccess.updateDriverStatus(ride.driver_id, "online");
		}

		return updatedRide;
	} catch (error) {
		console.error("Error in cancelRide service:", error);
		throw error;
	}
};
