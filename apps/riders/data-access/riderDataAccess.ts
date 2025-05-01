import type { Transaction } from 'sequelize'; // Import Transaction type
// Models
import Driver from "../../../models/driver"
import Ride from "../../../models/ride"

// Type definations
import type { Ride as RideType } from "../../../models/types"

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
    user_id: string
    pickup_location: string
    dropoff_location: string
    fare: number
  }): Promise<RideType> {
    try {
      // Create the ride with status 'requested' but NO driver assigned yet
      const ride = await Ride.create({
        ...rideData,
        driver_id: null, // No driver assigned initially
        status: "requested",
        start_time: new Date(),
      })

      return ride.toJSON() as RideType
    } catch (error) {
      console.error("Error creating ride request:", error)
      throw error
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
      })

      return rides.map((ride) => ride.toJSON() as RideType)
    } catch (error) {
      console.error("Error getting user rides:", error)
      throw error
    }
  }

  /**
   * Get a ride by its ID
   * @param rideId Ride ID
   * @returns Ride object or null if not found
   */
  async findRideById(rideId: string): Promise<RideType | null> {
    try {
      const ride = await Ride.findOne({ where: { ride_id: rideId } })
      return ride ? (ride.toJSON() as RideType) : null
    } catch (error) {
      console.error("Error getting ride by ID:", error)
      throw error
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
    status: string, 
    driverId?: string, 
    options?: { transaction?: Transaction }
  ): Promise<RideType | null> {
    try {
      // Use Ride.update directly for efficiency if possible, pass transaction
      const [affectedRows] = await Ride.update(
        driverId ? { status, driver_id: driverId } : { status }, 
        {
          where: { ride_id: rideId },
          transaction: options?.transaction, // Pass transaction from options
          returning: true // Ensure returning is supported and enabled if needed, might need model adjustment too
        }
      );

      // If using Ride.update with returning: true, result processing is different
      // For simplicity, let's stick to findOne + update for now, but pass transaction
      
      const ride = await Ride.findOne({ 
          where: { ride_id: rideId }, 
          transaction: options?.transaction // Use transaction for findOne
      });

      if (!ride) {
        return null
      }

      const updateData: { status: string; driver_id?: string | null } = { status }; // Ensure driver_id can be null/undefined type-wise

      // If driverId is explicitly provided (even if undefined), assign it
      // If driverId is undefined, update might set it to null if column allows
      if (driverId !== undefined) { 
        updateData.driver_id = driverId || null; // Assign driverId or null explicitly
      }

      // Pass transaction to update
      await ride.update(updateData, { transaction: options?.transaction });

      // Return the updated ride instance data
      return ride.toJSON() as RideType;

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
        order: [["created_at", "ASC"]], // Oldest first
      })

      return rides.map((ride) => ride.toJSON() as RideType)
    } catch (error) {
      console.error("Error getting available rides:", error)
      throw error
    }
  }
}

export const riderDataAccess = new RiderDataAccess()
