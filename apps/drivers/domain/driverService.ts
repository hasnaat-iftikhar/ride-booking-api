import { driverDataAccess } from "../data-access/driverDataAccess";

// Type Definations
import type {
	Driver as DriverType,
	Ride as RideType,
} from "../../../models/types";

// Error Library
import { appError } from "../../../libraries/errors/AppError";
import { commonError } from "../../../libraries/errors/errors";
import { CommonErrorType } from "../../../libraries/errors/errors.enum";

// Auth Library
import { JwtAuthenticator } from "../../../libraries/authenticator/jwtAuthenticator";
import { riderDataAccess } from "../../riders/data-access/riderDataAccess";

export const registerDriver = async (
	name: string,
	email: string,
	phone_number: string,
	license_number: string,
	password: string
): Promise<DriverType> => {
	try {
		const existingDriver = await driverDataAccess.findDriverByEmail(email);

		if (existingDriver) {
			return appError(
				"Driver Already Exists Error",
				commonError(CommonErrorType.CONFLICT).statusCode,
				"Driver with this email already exists",
				true
			);
		}

		const newDriver = await driverDataAccess.createDriver({
			name,
			email,
			phone_number,
			license_number,
			password,
		});

		// Remove password from returned driver object
		const { password: _, ...driverWithoutPassword } = newDriver;

		return driverWithoutPassword as DriverType;
	} catch (error) {
		console.error("Error in registerDriver service:", error);
		throw error;
	}
};

export const loginDriver = async (
	email: string,
	password: string
): Promise<{ driver: Partial<DriverType>; token: string }> => {
	try {
		const driver = await driverDataAccess.verifyDriverCredentials(
			email,
			password
		);

		if (!driver) {
			return appError(
				"Invalid Credentials Error",
				commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
				commonError(CommonErrorType.UN_AUTHORIZED).errorName,
				true
			);
		}

		const token = JwtAuthenticator.generateToken({
			userId: driver.driver_id,
			email: driver.email,
		});

		// Remove password from returned driver object
		const { password: _, ...driverWithoutPassword } = driver;

		return {
			driver: driverWithoutPassword,
			token,
		};
	} catch (error) {
		console.error("Error in loginDriver service:", error);
		throw error;
	}
};

export const getDriverById = async (driverId: string): Promise<DriverType> => {
	try {
		const driver = await driverDataAccess.findDriverById(driverId);

		if (!driver) {
			return appError(
				"Driver Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		// Remove password from returned driver object
		const { password: _, ...driverWithoutPassword } = driver;
		return driverWithoutPassword as DriverType;
	} catch (error) {
		console.error("Error in getDriverById service:", error);
		throw error;
	}
};

export const updateDriverProfile = async (
	driverId: string,
	updateData: Partial<DriverType>
): Promise<DriverType> => {
	try {
		const updatedDriver = await driverDataAccess.updateDriver(
			driverId,
			updateData
		);

		if (!updatedDriver) {
			return appError(
				"Driver Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		// Remove password from returned driver object
		const { password: _, ...driverWithoutPassword } = updatedDriver;
		return driverWithoutPassword as DriverType;
	} catch (error) {
		console.error("Error in updateDriverProfile service:", error);
		throw error;
	}
};

export const deleteDriverAccount = async (
	driverId: string
): Promise<{ success: boolean }> => {
	try {
		const result = await driverDataAccess.deleteDriver(driverId);

		if (!result) {
			return appError(
				"Driver Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		return { success: true };
	} catch (error) {
		console.error("Error in deleteDriverAccount service:", error);
		throw error;
	}
};

export const getAllDrivers = async (
	filters: { status?: string } = {}
): Promise<DriverType[]> => {
	try {
		const drivers = await driverDataAccess.getAllDrivers(filters);

		// Remove passwords from returned driver objects
		return drivers.map((driver) => {
			const { password: _, ...driverWithoutPassword } = driver;
			return driverWithoutPassword as DriverType;
		});
	} catch (error) {
		console.error("Error in getAllDrivers service:", error);
		throw error;
	}
};

export const updateDriverStatus = async (
	driverId: string,
	status: "online" | "offline" | "busy"
): Promise<DriverType> => {
	try {
		const updatedDriver = await driverDataAccess.updateDriverStatus(
			driverId,
			status
		);

		if (!updatedDriver) {
			return appError(
				"Driver Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		// Remove password  from returned driver object
		const { password: _, ...driverWithoutPassword } = updatedDriver;
		return driverWithoutPassword as DriverType;
	} catch (error) {
		console.error("Error in updateDriverStatus service:", error);
		throw error;
	}
};

export const acceptRide = async (
	driverId: string,
	rideId: string
): Promise<RideType> => {
	try {
		// 1. Check if driver exists and is available
		const driver = await driverDataAccess.findDriverById(driverId);

		if (!driver) {
			return appError(
				"Driver Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		if (driver.status !== "online") {
			return appError(
				"Driver Not Available",
				commonError(CommonErrorType.BAD_REQUEST).statusCode,
				"Driver must be online to accept a ride",
				true
			);
		}

		// 2. Check if ride exists and is available
		const ride = await riderDataAccess.findRideById(rideId);

		if (!ride) {
			return appError(
				"Ride Not Found",
				commonError(CommonErrorType.NOT_FOUND).statusCode,
				commonError(CommonErrorType.NOT_FOUND).errorName,
				true
			);
		}

		if (ride.status !== "requested") {
			return appError(
				"Ride Not Available",
				commonError(CommonErrorType.BAD_REQUEST).statusCode,
				"Ride is not in a requestable state",
				true
			);
		}

		// 3. Update ride status to in_progress and assign driver_id
		const updatedRide = await riderDataAccess.updateRideStatus(
			rideId,
			"in_progress",
			driverId
		);

		if (!updatedRide) {
			return appError(
				"Ride Update Failed",
				commonError(CommonErrorType.SERVER_ERROR).statusCode,
				"Failed to update ride status",
				true
			);
		}

		// 4. Update driver status to busy
		await driverDataAccess.updateDriverStatus(driverId, "busy");

		return updatedRide;
	} catch (error) {
		console.error("Error in acceptRide service:", error);
		throw error;
	}
};
