import { riderDataAccess } from "../data-access/riderDataAccess";
import { driverDataAccess } from "../../drivers/data-access/driverDataAccess";

// Error handling
import { throwError, ErrorType } from "../../../libraries/responses";

// Type definations
import type { Ride as RideType } from "../../../models/types";

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

		if (error instanceof Error && error.message === "No available drivers found") {
			throwError(
				ErrorType.BAD_REQUEST,
				"No drivers are currently available. Please try again later."
			);
		}
		
		throwError(ErrorType.SERVER_ERROR, "An unexpected error occurred while requesting a ride");
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

export const cancelRide = async (
	userId: string,
	rideId: string
): Promise<RideType> => {
	try {
		// 1. Get the ride and verify it belongs to the user
		const ride = await riderDataAccess.findRideById(rideId);

		if (!ride) {
			throwError(ErrorType.NOT_FOUND, "Ride not found");
		}

		if (ride.user_id !== userId) {
			throwError(ErrorType.FORBIDDEN, "You can only cancel your own rides");
		}

		if (ride.status !== "requested" && ride.status !== "in_progress") {
			throwError(
				ErrorType.BAD_REQUEST,
				"Ride cannot be canceled in its current state"
			);
		}

		// 2. Update ride status
		const updatedRide = await riderDataAccess.updateRideStatus(
			rideId,
			"canceled"
		);

		if (!updatedRide) {
			throwError(ErrorType.SERVER_ERROR, "Failed to update ride status");
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

// Helper function to calculate fare (simplified)
function calculateFare(_pickup: string, _dropoff: string): number {
	// Todo: You have to use a mapping service to calculate distance
	// and then apply pricing rules
	const baseFare = 5.0;
	const perKmRate = 2.0;

	// Simplified distance calculation (random for this example)
	const estimatedDistance = Math.random() * 10 + 1; // 1-11 km

	return Number((baseFare + perKmRate * estimatedDistance).toFixed(2));
}
