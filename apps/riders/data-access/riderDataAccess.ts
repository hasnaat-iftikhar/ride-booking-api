import type { Transaction } from 'sequelize'; // Import Transaction type
// Models
import { Ride, Driver } from "../../../models"

// Type definations
import type { RideAttributes as RideType, RideCreationAttributes, RideStatus } from "../../../models/types"

/**
 * Data Access Layer for rider-related database operations
 */
class RiderDataAccess {
  /**
   * Create a new ride request
   * @param rideData Ride request data
   * @returns Created ride object
   */
  async createRideRequest(rideData: Pick<RideCreationAttributes, 'user_id' | 'pickup_location' | 'dropoff_location' | 'fare'>): Promise<RideType> {
    try {
      const createPayload: RideCreationAttributes = {
        ...rideData,
        driver_id: null,
        status: "requested", 
        start_time: new Date(), 
      };
      const ride = await Ride.create(createPayload);
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
        include: [{ model: Driver, as: 'driver' }],
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
      const ride = await Ride.findOne({ 
        where: { ride_id: rideId },
        include: [{ model: Driver, as: 'driver' }]
      });
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
   * @param driverId Optional driver ID to assign
   * @param options Optional Sequelize options (including transaction)
   * @returns Updated ride object or null if not found
   */
  async updateRideStatus(
    rideId: string,
    status: RideStatus,
    driverId?: string | null,
    options?: { transaction?: Transaction }
  ): Promise<RideType | null> {
    try {
      const updatePayload: Partial<RideType> = { status };
      if (driverId !== undefined) {
        updatePayload.driver_id = driverId;
      }

      const [affectedCount] = await Ride.update(
        updatePayload,
        {
          where: { ride_id: rideId },
          transaction: options?.transaction,
        }
      );

      if (affectedCount === 0) {
        return null;
      }

      const updatedRide = await Ride.findOne({
        where: { ride_id: rideId },
        transaction: options?.transaction,
        include: [{ model: Driver, as: 'driver' }]
      });

      return updatedRide ? updatedRide.toJSON() as RideType : null;
    } catch (error) {
      console.error("Error updating ride status:", error);
      throw error;
    }
  }

  /**
   * Get available rides that have no driver assigned
   * @returns Array of ride objects
   */
  async getAvailableRides(): Promise<RideType[]> {
    try {
      const rides = await Ride.findAll({
        where: {
          status: "requested",
          driver_id: null,
        },
        include: [{ model: Driver, as: 'driver' }],
        order: [["created_at", "ASC"]],
      });
      return rides.map((ride) => ride.toJSON() as RideType);
    } catch (error) {
      console.error("Error getting available rides:", error);
      throw error;
    }
  }
}

export const riderDataAccess = new RiderDataAccess()
