import { driverDataAccess } from "../data-access/driverDataAccess"

// Type Definations
import type { Driver as DriverType, Ride as RideType } from "../../../models/types"

// Error handling
import { throwError, ErrorType } from "../../../libraries/responses"

// Auth Library
import { JwtAuthenticator } from "../../../libraries/authenticator/jwtAuthenticator"
import { riderDataAccess } from "../../riders/data-access/riderDataAccess"

// Sequelize instance for transactions
import sequelize from "../../../config/database"; 

export const registerDriver = async (
  name: string,
  email: string,
  phone_number: string,
  license_number: string,
  password: string,
): Promise<Partial<DriverType>> => {
  try {
    const existingDriver = await driverDataAccess.findDriverByEmail(email)

    if (existingDriver) {
      throwError(ErrorType.CONFLICT, "Driver with this email already exists")
    }

    const newDriver = await driverDataAccess.createDriver({
      name,
      email,
      phone_number,
      license_number,
      password,
    })

    // Remove password from returned driver object
    const { password: _, ...driverWithoutPassword } = newDriver

    return driverWithoutPassword
  } catch (error) {
    console.error("Error in registerDriver service:", error)
    throw error
  }
}

export const loginDriver = async (
  email: string,
  password: string,
): Promise<{ driver: Partial<DriverType>; token: string }> => {
  try {
    const driver = await driverDataAccess.verifyDriverCredentials(email, password)

    if (!driver) {
      throwError(ErrorType.UNAUTHORIZED, "Invalid email or password")
    }

    const token = JwtAuthenticator.generateToken({
      userId: driver.driver_id,
      email: driver.email,
      role: "driver",
    })

    // Remove password from returned driver object
    const { password: _, ...driverWithoutPassword } = driver

    return {
      driver: driverWithoutPassword,
      token,
    }
  } catch (error) {
    console.error("Error in loginDriver service:", error)
    throw error
  }
}

export const getDriverById = async (driverId: string): Promise<Partial<DriverType>> => {
  try {
    const driver = await driverDataAccess.findDriverById(driverId)

    if (!driver) {
      throwError(ErrorType.NOT_FOUND, "Driver not found")
    }

    // Remove password from returned driver object
    const { password: _, ...driverWithoutPassword } = driver
    return driverWithoutPassword
  } catch (error) {
    console.error("Error in getDriverById service:", error)
    throw error
  }
}

export const updateDriverProfile = async (driverId: string, updateData: Partial<DriverType>): Promise<Partial<DriverType>> => {
  try {
    const updatedDriver = await driverDataAccess.updateDriver(driverId, updateData)

    if (!updatedDriver) {
      throwError(ErrorType.NOT_FOUND, "Driver not found")
    }

    // Remove password from returned driver object
    const { password: _, ...driverWithoutPassword } = updatedDriver
    return driverWithoutPassword
  } catch (error) {
    console.error("Error in updateDriverProfile service:", error)
    throw error
  }
}

export const deleteDriverAccount = async (driverId: string): Promise<{ success: boolean }> => {
  try {
    const result = await driverDataAccess.deleteDriver(driverId)

    if (!result) {
      throwError(ErrorType.NOT_FOUND, "Driver not found")
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteDriverAccount service:", error)
    throw error
  }
}

export const getAllDrivers = async (filters: { status?: string } = {}): Promise<Partial<DriverType>[]> => {
  try {
    const drivers = await driverDataAccess.getAllDrivers(filters)

    // Remove passwords from returned driver objects
    return drivers.map((driver) => {
      const { password: _, ...driverWithoutPassword } = driver
      return driverWithoutPassword
    })
  } catch (error) {
    console.error("Error in getAllDrivers service:", error)
    throw error
  }
}

export const updateDriverStatus = async (
  driverId: string,
  status: "online" | "offline" | "busy",
): Promise<Partial<DriverType>> => {
  try {
    const updatedDriver = await driverDataAccess.updateDriverStatus(driverId, status)

    if (!updatedDriver) {
      throwError(ErrorType.NOT_FOUND, "Driver not found")
    }

    // Remove password from returned driver object
    const { password: _, ...driverWithoutPassword } = updatedDriver
    return driverWithoutPassword
  } catch (error) {
    console.error("Error in updateDriverStatus service:", error)
    throw error
  }
}

export const acceptRide = async (driverId: string, rideId: string): Promise<RideType> => {
  // Wrap the entire operation in a transaction
  const result = await sequelize.transaction(async (t) => {
    // 1. Check if driver exists and is available (read operations don't strictly need transaction, but keeping it inside is fine)
    const driver = await driverDataAccess.findDriverById(driverId /* { transaction: t } */) // findById doesn't have transaction option here

    if (!driver) {
      throwError(ErrorType.NOT_FOUND, "Driver not found")
    }

    if (driver.status !== "online") {
      throwError(ErrorType.BAD_REQUEST, "Driver must be online to accept a ride")
    }

    // 2. Check if ride exists and is available
    const ride = await riderDataAccess.findRideById(rideId /* { transaction: t } */) // findRideById doesn't have transaction option here

    if (!ride) {
      throwError(ErrorType.NOT_FOUND, "Ride not found")
    }

    if (ride.status !== "requested") {
      throwError(ErrorType.BAD_REQUEST, "Ride is not in a requestable state")
    }

    // 3. Update ride status AND assign the driver (WITHIN TRANSACTION)
    const updatedRide = await riderDataAccess.updateRideStatus(
      rideId,
      "in_progress",
      driverId, // Pass the driver ID to assign them
      { transaction: t } // Pass transaction object
    )

    if (!updatedRide) {
      // If ride update failed within transaction, throw error (will cause rollback)
      throwError(ErrorType.SERVER_ERROR, "Failed to update ride status during transaction")
    }

    // 4. Update driver status to busy (WITHIN TRANSACTION)
    const updatedDriverStatus = await driverDataAccess.updateDriverStatus(
        driverId, 
        "busy", 
        { transaction: t } // Pass transaction object
    )

    if (!updatedDriverStatus) {
        // If driver status update failed, throw error (will cause rollback)
        throwError(ErrorType.SERVER_ERROR, "Failed to update driver status during transaction")
    }

    // If both updates succeed, the transaction will commit, return the updated ride
    return updatedRide
  });

  // The transaction has committed or rolled back, return the result
  return result;
  // Note: Error handling for transaction failures themselves might be needed depending on sequelize setup
  // The try/catch block around the original call in the controller will catch errors thrown from within the transaction
}
