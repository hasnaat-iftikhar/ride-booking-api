// Models
import Driver from "../../../models/driver";
import Ride from "../../../models/ride";

// Type definations
import type { Ride as RideType } from "../../../models/types";

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
			// Create the ride with status 'requested' but NO driver assigned yet
			const ride = await Ride.create({
				...rideData,
				driver_id: null,
				status: "requested",
				start_time: new Date(),
			});

			return ride.toJSON() as RideType;
		} catch (error) {
			console.error("Error creating ride request:", error);
			throw error;
		}
	}

	/**
	 * Get all available rides
	 * @returns Array of ride objects
	 */
	async getAvailableRides(): Promise<RideType[]> {
		try {
		  const rides = await Ride.findAll({
			where: { 
			  status: "requested",
			  driver_id: null
			},
			order: [["created_at", "ASC"]], // Oldest first
		  });
	  
		  return rides.map(ride => ride.toJSON() as RideType);
		} catch (error) {
		  console.error("Error getting available rides:", error);
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

	/**
	 * Get a ride by its ID
	 * @param rideId Ride ID
	 * @returns Ride object or null if not found
	 */
	async findRideById(rideId: string): Promise<RideType | null> {
		try {
			const ride = await Ride.findOne({ where: { ride_id: rideId } });
			return ride ? (ride.toJSON() as RideType) : null;
		} catch (error) {
			console.error("Error getting ride by ID:", error);
			throw error;
		}
	}

	/**
	 * Update the status of a ride
	 * @param rideId Ride ID
	 * @param status New status
	 * @returns Updated ride object or null if not found
	 */
	async updateRideStatus(
		rideId: string,
		status: string,
		driverId?: string
	): Promise<RideType | null> {
		try {
			const ride = await Ride.findOne({ where: { ride_id: rideId } });

			if (!ride) {
				return null;
			}

			const updatedData: Partial<RideType> = {
				status: status as "requested" | "in_progress" | "completed" | "canceled",
			}
			
			if(driverId) {
				updatedData.driver_id = driverId;
			}

			await ride.update(updatedData);

			return ride.toJSON() as RideType;
		} catch (error) {
			console.error("Error updating ride status:", error);
			throw error;
		}
	}
}

export const riderDataAccess = new RiderDataAccess();
