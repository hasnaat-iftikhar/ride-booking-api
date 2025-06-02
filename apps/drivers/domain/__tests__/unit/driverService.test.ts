import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as driverService from '../../driverService';
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import { JwtAuthenticator } from '../../../../../libraries/authenticator/jwtAuthenticator';
import * as responses from '../../../../../libraries/responses';
import { ErrorType } from '../../../../../libraries/responses';

// Types
import type { Driver as DriverType, UserRole, DriverAttributes } from '../../../../../models/types';

// Mocking dependencies
jest.mock('../../../data-access/driverDataAccess');
jest.mock('../../../../../libraries/authenticator/jwtAuthenticator');
jest.mock('../../../../../libraries/responses', () => {
    const originalModule = jest.requireActual('../../../../../libraries/responses') as typeof responses;
    return {
        ...originalModule,
        throwError: jest.fn(),
    };
});

const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedJwtAuthenticator = JwtAuthenticator as jest.Mocked<typeof JwtAuthenticator>;
const mockedThrowError = responses.throwError as jest.MockedFunction<typeof responses.throwError>;

describe('DriverService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedThrowError.mockImplementation((type, message) => {
            const err = new Error(message || 'Test error from driverService.test.ts');
            // @ts-ignore
            err.errorType = type;
            // @ts-ignore
            err.statusCode = 500;
            if (type === ErrorType.CONFLICT) {
                 // @ts-ignore
                err.statusCode = 409;
            } else if (type === ErrorType.UNAUTHORIZED) {
                 // @ts-ignore
                err.statusCode = 401;
            } else if (type === ErrorType.NOT_FOUND) {
                 // @ts-ignore
                err.statusCode = 404;
            } else if (type === ErrorType.BAD_REQUEST) {
                // @ts-ignore
                err.statusCode = 400;
            }
            throw err;
        });
    });

    describe('registerDriver', () => {
        const driverData = {
            name: 'Test Driver',
            email: 'driver@example.com',
            phone_number: '0987654321',
            license_number: 'LICENSE123',
            password_plaintext: 'securePassword123',
        };

        // This object is what the data access layer (mocked) will return.
        // It should conform to DriverAttributes if that's what the actual DB operation returns.
        const fullDriverFromDbMock: DriverAttributes = {
            driver_id: 'driver-456',
            name: driverData.name,
            email: driverData.email,
            phone_number: driverData.phone_number,
            license_number: driverData.license_number,
            password: 'hashedSecurePassword', // Must be a string as per DriverAttributes
            status: 'offline',
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should register a new driver successfully', async () => {
            mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(null);
            // Ensure the mockResolvedValue receives an object that satisfies the expected return type of createDriver
            mockedDriverDataAccess.createDriver.mockResolvedValue(fullDriverFromDbMock);

            const result = await driverService.registerDriver(
                driverData.name,
                driverData.email,
                driverData.phone_number,
                driverData.license_number,
                driverData.password_plaintext
            );

            expect(mockedDriverDataAccess.findDriverByEmail).toHaveBeenCalledWith(driverData.email);
            expect(mockedDriverDataAccess.createDriver).toHaveBeenCalledWith(driverData);
            expect(result.password).toBeUndefined(); // Service layer strips password
            expect(result).toEqual(expect.objectContaining({
                driver_id: 'driver-456',
                name: driverData.name,
                email: driverData.email,
            }));
        });

        it('should throw CONFLICT error if driver already exists', async () => {
            // findDriverByEmail would return DriverAttributes like object
            mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(fullDriverFromDbMock);

            await expect(
                driverService.registerDriver(
                    driverData.name,
                    driverData.email,
                    driverData.phone_number,
                    driverData.license_number,
                    driverData.password_plaintext
                )
            ).rejects.toThrow('Driver with this email already exists');

            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.CONFLICT,
                'Driver with this email already exists'
            );
            expect(mockedDriverDataAccess.createDriver).not.toHaveBeenCalled();
        });

        it('should propagate error from findDriverByEmail', async () => {
            const dbError = new Error('DB error findDriverByEmail for driver');
            mockedDriverDataAccess.findDriverByEmail.mockRejectedValue(dbError);

            await expect(
                 driverService.registerDriver(
                    driverData.name,
                    driverData.email,
                    driverData.phone_number,
                    driverData.license_number,
                    driverData.password_plaintext
                )
            ).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should propagate error from createDriver', async () => {
            mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(null);
            const dbError = new Error('DB error createDriver for driver');
            mockedDriverDataAccess.createDriver.mockRejectedValue(dbError);

            await expect(
                 driverService.registerDriver(
                    driverData.name,
                    driverData.email,
                    driverData.phone_number,
                    driverData.license_number,
                    driverData.password_plaintext
                )
            ).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('loginDriver', () => {
        const loginCredentials = {
            email: 'driver@example.com',
            password_plaintext: 'securePassword123',
        };

        // This object is what verifyDriverCredentials (mocked) will return.
        // It should conform to DriverAttributes.
        const driverFromDbMock: DriverAttributes = {
            driver_id: 'driver-789',
            name: 'Logged In Driver',
            email: loginCredentials.email,
            phone_number: '1122334455',
            license_number: 'LOGINLIC1',
            password: 'hashedLoginPassword', // Must be a string as per DriverAttributes
            status: 'online',
            created_at: new Date(),
            updated_at: new Date(),
        };

        const token = 'mocked-driver-jwt-token';

        it('should login a driver successfully and return driver details and token', async () => {
            mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(driverFromDbMock);
            mockedJwtAuthenticator.generateToken.mockReturnValue(token);

            const result = await driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext);

            expect(mockedDriverDataAccess.verifyDriverCredentials).toHaveBeenCalledWith(
                loginCredentials.email,
                loginCredentials.password_plaintext
            );
            expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalledWith({
                userId: driverFromDbMock.driver_id,
                email: driverFromDbMock.email,
                role: 'driver' as UserRole,
            });
            expect(result.driver.password).toBeUndefined(); // Service layer strips password
            expect(result.driver).toEqual(expect.objectContaining({
                driver_id: driverFromDbMock.driver_id,
                email: driverFromDbMock.email,
            }));
            expect(result.token).toBe(token);
        });

        it('should throw UNAUTHORIZED error for invalid credentials', async () => {
            mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(null);

            await expect(
                driverService.loginDriver(loginCredentials.email, 'wrongPassword')
            ).rejects.toThrow('Invalid email or password');

            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.UNAUTHORIZED,
                'Invalid email or password'
            );
            expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
        });

        it('should propagate error from verifyDriverCredentials', async () => {
            const dbError = new Error('DB error verifyDriverCredentials for driver');
            mockedDriverDataAccess.verifyDriverCredentials.mockRejectedValue(dbError);

            await expect(
                driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext)
            ).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should propagate error from generateToken', async () => {
            mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(driverFromDbMock);
            const tokenError = new Error('Token generation failed for driver');
            mockedJwtAuthenticator.generateToken.mockImplementation(() => {
                throw tokenError;
            });

            await expect(
                driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext)
            ).rejects.toThrow(tokenError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('getDriverById', () => {
        const driverId = 'driver-get-by-id';
        const driverFromDb: DriverAttributes = {
            driver_id: driverId,
            name: 'Test Driver',
            email: 'get@example.com',
            phone_number: '1231231234',
            license_number: 'GETLIC1',
            password: 'hashedPasswordForGet',
            status: 'online',
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should return driver details (without password) if found', async () => {
            mockedDriverDataAccess.findDriverById.mockResolvedValue(driverFromDb);

            const result = await driverService.getDriverById(driverId);

            expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
            expect(result).toEqual(expect.objectContaining({
                driver_id: driverId,
                name: driverFromDb.name,
                email: driverFromDb.email,
            }));
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw NOT_FOUND error if driver is not found', async () => {
            mockedDriverDataAccess.findDriverById.mockResolvedValue(null);

            await expect(driverService.getDriverById(driverId)).rejects.toThrow('Driver not found');

            expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
        });

        it('should propagate error from findDriverById', async () => {
            const dbError = new Error('DB error findDriverById for getDriverById');
            mockedDriverDataAccess.findDriverById.mockRejectedValue(dbError);

            await expect(driverService.getDriverById(driverId)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('updateDriverProfile', () => {
        const driverId = 'driver-update-prof';
        const updateData: Partial<DriverType> = {
            name: 'Updated Test Driver',
            phone_number: '1234567899',
        };
        const originalDriver: DriverAttributes = {
            driver_id: driverId,
            name: 'Original Test Driver',
            email: 'update@example.com',
            phone_number: '9876543210',
            license_number: 'UPDATEPROFLIC',
            password: 'hashedOriginalPassword',
            status: 'offline',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const updatedDriverFromDb: DriverAttributes = {
            ...originalDriver,
            ...updateData,
            updated_at: new Date(), // Simulate timestamp update
        };

        it('should update driver profile and return updated details (without password)', async () => {
            mockedDriverDataAccess.updateDriver.mockResolvedValue(updatedDriverFromDb);

            const result = await driverService.updateDriverProfile(driverId, updateData);

            expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData);
            expect(result).toEqual(expect.objectContaining({
                driver_id: driverId,
                name: updateData.name,
                phone_number: updateData.phone_number,
                email: originalDriver.email, // email should not change with this updateData
            }));
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw NOT_FOUND if driver to update is not found', async () => {
            mockedDriverDataAccess.updateDriver.mockResolvedValue(null);

            await expect(driverService.updateDriverProfile(driverId, updateData)).rejects.toThrow('Driver not found');

            expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData);
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
        });

        it('should propagate error from updateDriver data access call', async () => {
            const dbError = new Error('DB error during updateDriver');
            mockedDriverDataAccess.updateDriver.mockRejectedValue(dbError);

            await expect(driverService.updateDriverProfile(driverId, updateData)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('deleteDriverAccount', () => {
        const driverId = 'driver-delete-id';

        it('should return { success: true } if driver is deleted successfully', async () => {
            mockedDriverDataAccess.deleteDriver.mockResolvedValue(true);

            const result = await driverService.deleteDriverAccount(driverId);

            expect(mockedDriverDataAccess.deleteDriver).toHaveBeenCalledWith(driverId);
            expect(result).toEqual({ success: true });
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw NOT_FOUND error if driver to delete is not found', async () => {
            mockedDriverDataAccess.deleteDriver.mockResolvedValue(false);

            await expect(driverService.deleteDriverAccount(driverId)).rejects.toThrow('Driver not found');

            expect(mockedDriverDataAccess.deleteDriver).toHaveBeenCalledWith(driverId);
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
        });

        it('should propagate error from deleteDriver data access call', async () => {
            const dbError = new Error('DB error during deleteDriver');
            mockedDriverDataAccess.deleteDriver.mockRejectedValue(dbError);

            await expect(driverService.deleteDriverAccount(driverId)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('getAllDrivers', () => {
        const driver1: DriverAttributes = {
            driver_id: 'driver-1',
            name: 'Driver One',
            email: 'one@example.com',
            phone_number: '111',
            license_number: 'LIC1',
            password: 'pass1',
            status: 'online',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const driver2: DriverAttributes = {
            driver_id: 'driver-2',
            name: 'Driver Two',
            email: 'two@example.com',
            phone_number: '222',
            license_number: 'LIC2',
            password: 'pass2',
            status: 'offline',
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should return a list of drivers (without passwords)', async () => {
            mockedDriverDataAccess.getAllDrivers.mockResolvedValue([driver1, driver2]);

            const result = await driverService.getAllDrivers();

            expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(undefined); // No filters
            expect(result.length).toBe(2);
            expect(result[0].name).toBe(driver1.name);
            expect(result[1].name).toBe(driver2.name);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should return drivers filtered by status', async () => {
            mockedDriverDataAccess.getAllDrivers.mockResolvedValue([driver1]);
            const filters = { status: 'online' as DriverType['status'] };

            const result = await driverService.getAllDrivers(filters);

            expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(filters);
            expect(result.length).toBe(1);
            expect(result[0].status).toBe('online');
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should return an empty list if no drivers are found', async () => {
            mockedDriverDataAccess.getAllDrivers.mockResolvedValue([]);

            const result = await driverService.getAllDrivers();

            expect(result).toEqual([]);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should propagate error from getAllDrivers data access call', async () => {
            const dbError = new Error('DB error during getAllDrivers');
            mockedDriverDataAccess.getAllDrivers.mockRejectedValue(dbError);

            await expect(driverService.getAllDrivers()).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });

    describe('updateDriverStatus', () => {
        const driverId = 'driver-update-status';
        const newStatus = 'online' as DriverType['status'];
        const driverWithOldStatus: DriverAttributes = {
            driver_id: driverId,
            name: 'Status Driver',
            email: 'status@example.com',
            phone_number: '333',
            license_number: 'STATUSLIC',
            password: 'passStatus',
            status: 'offline',
            created_at: new Date(),
            updated_at: new Date(),
        };
        const updatedDriverFromDb: DriverAttributes = {
            ...driverWithOldStatus,
            status: newStatus,
            updated_at: new Date(),
        };

        it('should update driver status and return updated details (without password)', async () => {
            mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(updatedDriverFromDb);

            const result = await driverService.updateDriverStatus(driverId, newStatus);

            expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatus, undefined);
            expect(result.status).toBe(newStatus);
            expect(result.driver_id).toBe(driverId);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should pass transaction options to data access layer if provided', async () => {
            mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(updatedDriverFromDb);
            const mockTransaction = { id: 'mock-transaction' } as any; // Simplified mock transaction

            await driverService.updateDriverStatus(driverId, newStatus, { transaction: mockTransaction });

            expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatus, { transaction: mockTransaction });
        });

        it('should throw NOT_FOUND if driver to update status for is not found', async () => {
            mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(null);

            await expect(driverService.updateDriverStatus(driverId, newStatus)).rejects.toThrow('Driver not found');

            expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatus, undefined);
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
        });

        it('should propagate error from updateDriverStatus data access call', async () => {
            const dbError = new Error('DB error during updateDriverStatus');
            mockedDriverDataAccess.updateDriverStatus.mockRejectedValue(dbError);

            await expect(driverService.updateDriverStatus(driverId, newStatus)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });
}); 