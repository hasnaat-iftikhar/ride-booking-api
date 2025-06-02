/**
 * @fileoverview Unit tests for the DriverService.updateDriverProfile method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
import type { DriverAttributes as DriverType } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/driverDataAccess');
jest.mock('../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../libraries/responses') as object),
  throwError: jest.fn(),
}));

// --- Typed Mocks and Utilities ---
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('DriverService - updateDriverProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for updateDriverProfile');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = (type === ErrorType.NOT_FOUND) ? 404 : 500;
      throw err;
    });
  });

  describe('updateDriverProfile', () => {
    const driverId = 'driver-update-profile-id';
    const updateData: Partial<DriverType> = {
      name: 'Updated Driver Name',
      phone_number: '9998887777',
    };

    const mockOriginalDriver: DriverType = {
      driver_id: driverId,
      name: 'Original Driver Name',
      email: 'original.driver@example.com',
      phone_number: '1112223333',
      license_number: 'LICORIGINAL',
      password: 'hashedOriginalPassword',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockUpdatedDriverFromDb: DriverType = {
      ...mockOriginalDriver,
      ...updateData, // Apply updates
      updated_at: new Date(), // Simulate DB update timestamp
    };

    it('should update driver profile and return updated driver data without password', async () => {
      mockedDriverDataAccess.updateDriver.mockResolvedValue(mockUpdatedDriverFromDb);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedDriver } = mockUpdatedDriverFromDb;

      const result = await driverService.updateDriverProfile(driverId, updateData);

      expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData);
      expect(result).toEqual(expectedDriver);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with NOT_FOUND if driver to update is not found (updateDriver returns null)', async () => {
      mockedDriverDataAccess.updateDriver.mockResolvedValue(null);

      await expect(driverService.updateDriverProfile(driverId, updateData))
        .rejects.toThrow('Driver not found');
      
      expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData);
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    });

    it('should propagate error if updateDriver from data access fails', async () => {
      const dbError = new Error('DB error during updateDriver');
      mockedDriverDataAccess.updateDriver.mockRejectedValue(dbError);

      await expect(driverService.updateDriverProfile(driverId, updateData))
        .rejects.toThrow(dbError);
      
      expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData);
      expect(mockedThrowError).not.toHaveBeenCalled(); // Error propagated directly
    });

    // Test for attempting to update forbidden fields if service had such logic
    // e.g., trying to update email or driver_id via this method
    // it('should ignore or reject attempts to update restricted fields like email or driver_id', async () => {
    //   const forbiddenUpdateData = { ...updateData, email: 'new.email@example.com' };
    //   mockedDriverDataAccess.updateDriver.mockResolvedValue(mockUpdatedDriverFromDb); // Assume DB would ignore it or service handles it
      
    //   const result = await driverService.updateDriverProfile(driverId, forbiddenUpdateData);
      
    //   // Assert that updateDriver was called without the email, or that service threw an error, etc.
    //   expect(mockedDriverDataAccess.updateDriver).toHaveBeenCalledWith(driverId, updateData); // only allowed fields
    //   expect(result).not.toHaveProperty('email', 'new.email@example.com');
    // });
  });
}); 