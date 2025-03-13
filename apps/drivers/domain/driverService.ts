import { driverDataAccess } from "../data-access/driverDataAccess";

// Type Definations
import type { Driver as DriverType } from "../../../models/types";

// Error Library
import { appError } from "../../../libraries/errors/AppError";
import { commonError } from "../../../libraries/errors/errors";
import { CommonErrorType } from "../../../libraries/errors/errors.enum";

// Auth Library
import { JwtAuthenticator } from "../../../libraries/authenticator/jwtAuthenticator";

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

		// Remove password from returned driver object
		const { password: _, ...driverWithoutPassword } = updatedDriver;
		return driverWithoutPassword as DriverType;
	} catch (error) {
		console.error("Error in updateDriverStatus service:", error);
		throw error;
	}
};
