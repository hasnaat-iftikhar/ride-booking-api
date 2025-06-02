import { driverDataAccess } from "../data-access/driverDataAccess"

// Type Definations
import type { Driver as DriverType, Ride as RideType, RideStatus, UserRole } from "../../../models/types"
import type { Transaction as SequelizeTransactionType } from 'sequelize';

// Error handling
import { throwError, ErrorType } from "../../../libraries/responses"

// Auth Library
import { JwtAuthenticator } from "../../../libraries/authenticator/jwtAuthenticator"
import { riderDataAccess } from "../../riders/data-access/riderDataAccess"

// Sequelize instance for transactions
import { sequelize } from "../../../models";

export const registerDriver = async (
  name: string,
  email: string,
  phone_number: string,
  license_number: string,
  password_plaintext: string,
): Promise<Partial<DriverType>> => {
  const existingDriver = await driverDataAccess.findDriverByEmail(email)

  if (existingDriver) {
    throwError(ErrorType.CONFLICT, "Driver with this email already exists")
  }

  const newDriver = await driverDataAccess.createDriver({
    name,
    email,
    phone_number,
    license_number,
    password_plaintext,
  })

  const { password: _, ...driverWithoutPassword } = newDriver
  return driverWithoutPassword
}

export const loginDriver = async (
  email: string,
  password_plaintext: string,
): Promise<{ driver: Partial<DriverType>; token: string }> => {
  const driver = await driverDataAccess.verifyDriverCredentials(email, password_plaintext)

  if (!driver) {
    throwError(ErrorType.UNAUTHORIZED, "Invalid email or password")
  }

  const token = JwtAuthenticator.generateToken({
    userId: driver.driver_id,
    email: driver.email,
    role: "driver" as UserRole,
  })

  // Remove password from returned driver object
  const { password: _, ...driverWithoutPassword } = driver

  return {
    driver: driverWithoutPassword,
    token,
  }
}

export const getDriverById = async (
  driverId: string
): Promise<Omit<DriverType, 'password'>> => {
  const driver = await driverDataAccess.findDriverById(driverId);
  if (!driver) {
    throwError(ErrorType.NOT_FOUND, 'Driver not found');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...driverWithoutPassword } = driver;
  return driverWithoutPassword;
};

export const updateDriverProfile = async (
  driverId: string,
  updateData: Partial<DriverType>
): Promise<Omit<DriverType, 'password'>> => {
  const updatedDriver = await driverDataAccess.updateDriver(driverId, updateData);
  if (!updatedDriver) {
    throwError(ErrorType.NOT_FOUND, 'Driver not found');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...driverWithoutPassword } = updatedDriver;
  return driverWithoutPassword;
};

export const deleteDriverAccount = async (
  driverId: string
): Promise<{ success: boolean }> => {
  const deleted = await driverDataAccess.deleteDriver(driverId);
  if (!deleted) {
    throwError(ErrorType.NOT_FOUND, 'Driver not found');
  }
  return { success: true };
};

export const getAllDrivers = async (
  filters?: { status?: DriverType['status'] }
): Promise<Omit<DriverType, 'password'>[]> => {
  const drivers = await driverDataAccess.getAllDrivers(filters);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return drivers.map(({ password, ...driver }) => driver);
};

export const updateDriverStatus = async (
  driverId: string,
  status: DriverType['status'],
  options?: { transaction?: SequelizeTransactionType }
): Promise<Omit<DriverType, 'password'>> => {
  const updatedDriver = await driverDataAccess.updateDriverStatus(driverId, status, options);
  if (!updatedDriver) {
    throwError(ErrorType.NOT_FOUND, 'Driver not found');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...driverWithoutPassword } = updatedDriver;
  return driverWithoutPassword;
};

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
