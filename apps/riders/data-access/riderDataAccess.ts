// Models
import Driver from "../../../models/driver";
import Ride from "../../../models/ride";

// Type definations
import { Ride as RideType } from "../../../models/types";

/**
 * Data Access Layer for rider-related database operations
 */
class RiderDataAccess {
	/**
	 * Create a new ride request
	 * @param rideData Ride request data
	 * @returns Created ride object
	 */
	async createRideRequest(rideData: {
		user_id: string;
		pickup_location: string;
		dropoff_location: string;
		fare: number;
	}): Promise<RideType> {
		try {
			// Find an available driver
			const availableDriver = await Driver.findOne({
				where: { status: "online" },
			});

			if (!availableDriver) {
				throw new Error("No available drivers found");
			}

			// Create the ride with status 'requested'
			const ride = await Ride.create({
				...rideData,
				driver_id: availableDriver.get("driver_id"),
				status: "requested",
				start_time: new Date(),
			});

			// Update driver status to busy
			await availableDriver.update({ status: "busy" });

			return ride.toJSON() as RideType;
		} catch (error) {
			console.error("Error creating ride request:", error);
			throw error;
		}
	}

	/**
	 * Get all rides for a user
	 * @param userId User ID
	 * @returns Array of ride objects
	 */
	async getUserRides(userId: string): Promise<RideType[]> {
		try {
			const rides = await Ride.findAll({
				where: {
					user_id: userId,
				},
				include: [Driver],
				order: [["created_at", "DESC"]],
			});

			return rides.map((ride) => ride.toJSON() as RideType);
		} catch (error) {
			console.error("Error getting user rides:", error);
			throw error;
		}
	}
};

export const riderDataAccess = new RiderDataAccess();
