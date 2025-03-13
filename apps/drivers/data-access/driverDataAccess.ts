// Models
import Driver from "../../../models/driver";

// Type Definations
import type { Driver as DriverType } from "../../../models/types";

// Validation
import * as argon2 from "argon2";

export class DriverDataAccess {
	async findDriverByEmail(email: string): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { email } });
			return driver ? (driver.toJSON() as DriverType) : null;
		} catch (error) {
			console.error("Error finding driver by email:", error);
			throw error;
		}
	}

	async findDriverById(driverId: string): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { driver_id: driverId } });
			return driver ? (driver.toJSON() as DriverType) : null;
		} catch (error) {
			console.error("Error finding driver by ID:", error);
			throw error;
		}
	}

	async createDriver(driverData: {
		name: string;
		email: string;
		phone_number: string;
		license_number: string;
		password: string;
	}): Promise<DriverType> {
		try {
			const hashedPassword = await argon2.hash(driverData.password);

			const driver = await Driver.create({
				...driverData,
				status: "offline",
				password: hashedPassword,
			});

			console.log("[Driver Data Access] Driver created:", driver.toJSON());

			return driver.toJSON() as DriverType;
		} catch (error) {
			console.error("Error creating driver:", error);
			throw error;
		}
	}

	async updateDriver(
		driverId: string,
		updateData: Partial<DriverType>
	): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { driver_id: driverId } });

			if (!driver) {
				return null;
			}

			// If updating password, hash it first
			if (updateData.password) {
				updateData.password = await argon2.hash(updateData.password);
			}

			await driver.update(updateData);

			return driver.toJSON() as DriverType;
		} catch (error) {
			console.error("Error updating driver:", error);
			throw error;
		}
	}

	async deleteDriver(driverId: string): Promise<boolean> {
		try {
			const result = await Driver.destroy({ where: { driver_id: driverId } });
			return result > 0;
		} catch (error) {
			console.error("Error deleting driver:", error);
			throw error;
		}
	}

	async getAllDrivers(
		filters: { status?: string } = {}
	): Promise<DriverType[]> {
		try {
			const drivers = await Driver.findAll({
				where: { ...filters },
				order: [["created_at", "DESC"]],
			});

			return drivers.map((driver) => driver.toJSON() as DriverType);
		} catch (error) {
			console.error("Error getting all drivers:", error);
			throw error;
		}
	}

	async verifyDriverCredentials(
		email: string,
		password: string
	): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { email } });

			if (!driver) {
				return null;
			}

			const passwordValid = await argon2.verify(
				driver.get("password") as string,
				password
			);

			if (!passwordValid) {
				return null;
			}

			return driver.toJSON() as DriverType;
		} catch (error) {
			console.error("Error verifying driver credentials:", error);
			throw error;
		}
	}

	async updateDriverStatus(
		driverId: string,
		status: "online" | "offline" | "busy"
	): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { driver_id: driverId } });

			if (!driver) {
				return null;
			}

			await driver.update({ status });

			return driver.toJSON() as DriverType;
		} catch (error) {
			console.error("Error updating driver status:", error);
			throw error;
		}
	}
}

export const driverDataAccess = new DriverDataAccess();
