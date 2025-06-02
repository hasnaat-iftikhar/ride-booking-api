/**
 * @fileoverview Unit tests for the DriverService.getDriverById method.
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
describe('DriverService - getDriverById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for throwError
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for getDriverById');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = (type === ErrorType.NOT_FOUND) ? 404 : 500;
      throw err;
    });
  });

  describe('getDriverById', () => {
    const driverId = 'driver-get-by-id-123';
    const mockDriverFromDb: DriverType = {
      driver_id: driverId,
      name: 'Get By Id Driver',
      email: 'getbyid@example.com',
      phone_number: '1231231234',
      license_number: 'LICGETID',
      password: 'hashedPasswordForGetById',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return driver data without password if driver is found', async () => {
      mockedDriverDataAccess.findDriverById.mockResolvedValue(mockDriverFromDb);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedDriver } = mockDriverFromDb;

      const result = await driverService.getDriverById(driverId);

      expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
      expect(result).toEqual(expectedDriver);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with NOT_FOUND if driver is not found', async () => {
      mockedDriverDataAccess.findDriverById.mockResolvedValue(null);

      await expect(driverService.getDriverById(driverId))
        .rejects.toThrow('Driver not found'); 
      
      expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    });

    it('should propagate error if findDriverById from data access fails', async () => {
      const dbError = new Error('DB error during findDriverById');
      mockedDriverDataAccess.findDriverById.mockRejectedValue(dbError);

      await expect(driverService.getDriverById(driverId)).rejects.toThrow(dbError);
      
      expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
      expect(mockedThrowError).not.toHaveBeenCalled(); // Error propagated directly
    });

    // Edge case: driverId is empty or invalid format (if service had specific checks)
    // For example, if service validated driverId format before calling dataAccess:
    // it('should throw BAD_REQUEST for an invalid driver ID format', async () => {
    //   const invalidDriverId = ' '; // or some other invalid format
    //   await expect(driverService.getDriverById(invalidDriverId))
    //     .rejects.toThrow('Invalid driver ID format');
    //   expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Invalid driver ID format');
    //   expect(mockedDriverDataAccess.findDriverById).not.toHaveBeenCalled();
    // });
  });
}); 