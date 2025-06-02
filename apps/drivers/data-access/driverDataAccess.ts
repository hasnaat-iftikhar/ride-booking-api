// Models
import { Driver } from "../../../models";

// Type Definations
import type { DriverAttributes as DriverType, DriverCreationAttributes } from "../../../models/types";

// Validation
import * as argon2 from "argon2";
import type { Transaction } from 'sequelize';

// Input type for creating a driver, expecting plaintext password
interface CreateDriverServiceInput extends Pick<DriverType, 'name' | 'email' | 'phone_number' | 'license_number'> {
	password_plaintext: string;
}

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

	async createDriver(driverData: CreateDriverServiceInput): Promise<DriverType> {
		try {
			const hashedPassword = await argon2.hash(driverData.password_plaintext);

			const createData: DriverCreationAttributes = {
				name: driverData.name,
				email: driverData.email,
				phone_number: driverData.phone_number,
				license_number: driverData.license_number,
				password: hashedPassword,
				status: 'offline', // Default status for new driver
			};

			const driver = await Driver.create(createData);

			console.log("[Driver Data Access] Driver created:", driver.toJSON());

			return driver.toJSON() as DriverType;
		} catch (error) {
			console.error("Error creating driver:", error);
			throw error;
		}
	}

	async updateDriver(
		driverId: string,
		updateData: Partial<DriverType> & { password_plaintext?: string }
	): Promise<DriverType | null> {
		try {
			const driver = await Driver.findOne({ where: { driver_id: driverId } });

			if (!driver) {
				return null;
			}

			// Separate password_plaintext from other update data
			const { password_plaintext, ...driverModelUpdateData } = updateData;
			const dataToUpdateDb: Partial<DriverType> = driverModelUpdateData; // DriverType is DriverAttributes

			// If updating password, hash it first
			if (password_plaintext) {
				dataToUpdateDb.password = await argon2.hash(password_plaintext);
			}

			await driver.update(dataToUpdateDb);

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
		filters: { status?: DriverType['status'] } = {}
	): Promise<DriverType[]> {
		try {
			const whereClause: Partial<DriverType> = {};
			if (filters.status) {
				whereClause.status = filters.status;
			}

			const drivers = await Driver.findAll({
				where: whereClause,
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
		password_plaintext: string
	): Promise<DriverType | null> {
		try {
			const driverInstance = await Driver.findOne({ where: { email } });

			if (!driverInstance) {
				return null;
			}

			const passwordValid = await argon2.verify(
				driverInstance.password, // Direct access
				password_plaintext
			);

			if (!passwordValid) {
				return null;
			}

			return driverInstance.toJSON() as DriverType;
		} catch (error) {
			console.error("Error verifying driver credentials:", error);
			throw error;
		}
	}

	async updateDriverStatus(
		driverId: string,
		status: "online" | "offline" | "busy",
		options?: { transaction?: Transaction }
	): Promise<DriverType | null> {
		try {
			// Sequelize update method is often better for targeted updates
			// and can return the number of affected rows or the updated instances (depending on dialect and options)
			const [affectedCount] = await Driver.update(
                { status }, 
                { 
                    where: { driver_id: driverId }, 
                    transaction: options?.transaction,
                    // returning: true, // For some dialects to return instances, but findOne after is safer for consistency
                }
            );

            if (affectedCount === 0) {
                return null; // Driver not found or status was already the same (no update occurred)
            }

            // Refetch the driver to get the updated instance
            const updatedDriver = await Driver.findOne({
                where: { driver_id: driverId },
                transaction: options?.transaction
            });

			return updatedDriver ? updatedDriver.toJSON() as DriverType : null;
		} catch (error) {
			console.error("Error updating driver status:", error);
			throw error;
		}
	}
}

export const driverDataAccess = new DriverDataAccess();
