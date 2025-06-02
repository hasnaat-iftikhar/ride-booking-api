/**
 * @fileoverview Unit tests for the DriverService.getAllDrivers method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
// No direct use of responseUtils.throwError in the service for this function

// Types used in tests
import type { DriverAttributes as DriverType } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/driverDataAccess');
// No need to mock responseUtils if throwError is not directly called by this service function for its own errors.

// --- Typed Mocks and Utilities ---
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;

// --- Test Suite Definition ---
describe('DriverService - getAllDrivers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDrivers', () => {
    const mockDriversFromDb: DriverType[] = [
      {
        driver_id: 'driver1',
        name: 'Driver One',
        email: 'one@example.com',
        phone_number: '1112223333',
        license_number: 'LIC111',
        password: 'hashedPassword1',
        status: 'online',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        driver_id: 'driver2',
        name: 'Driver Two',
        email: 'two@example.com',
        phone_number: '4445556666',
        license_number: 'LIC222',
        password: 'hashedPassword2',
        status: 'offline',
        created_at: new Date(),
        updated_at: new Date(),
      },
       {
        driver_id: 'driver3',
        name: 'Driver Three',
        email: 'three@example.com',
        phone_number: '7778889999',
        license_number: 'LIC333',
        password: 'hashedPassword3',
        status: 'online',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const expectedDriversWithoutPassword = (drivers: DriverType[]) => 
        drivers.map(d => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...rest } = d;
            return rest;
        });

    it('should return a list of all drivers without their passwords when no filters are provided', async () => {
      mockedDriverDataAccess.getAllDrivers.mockResolvedValue(mockDriversFromDb);

      const result = await driverService.getAllDrivers();

      expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(expectedDriversWithoutPassword(mockDriversFromDb));
      for (const driver of result) {
        expect(driver).not.toHaveProperty('password');
      }
    });

    it('should return a list of drivers filtered by status (e.g., online), without their passwords', async () => {
      const onlineDrivers = mockDriversFromDb.filter(d => d.status === 'online');
      mockedDriverDataAccess.getAllDrivers.mockResolvedValue(onlineDrivers);
      const filters = { status: 'online' as DriverType['status'] };

      const result = await driverService.getAllDrivers(filters);

      expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(filters);
      expect(result).toEqual(expectedDriversWithoutPassword(onlineDrivers));
      for (const driver of result) {
        expect(driver).not.toHaveProperty('password');
      }
    });

    it('should return an empty list if no drivers are found matching the filters', async () => {
      mockedDriverDataAccess.getAllDrivers.mockResolvedValue([]);
      const filters = { status: 'busy' as DriverType['status'] };

      const result = await driverService.getAllDrivers(filters);

      expect(result).toEqual([]);
      expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(filters);
    });

    it('should return an empty list if data access returns empty list (no drivers at all)', async () => {
      mockedDriverDataAccess.getAllDrivers.mockResolvedValue([]);

      const result = await driverService.getAllDrivers(); // No filter

      expect(result).toEqual([]);
      expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(undefined);
    });

    it('should propagate an error from driverDataAccess.getAllDrivers if it fails', async () => {
      const dbError = new Error('Database error during getAllDrivers');
      mockedDriverDataAccess.getAllDrivers.mockRejectedValue(dbError);

      await expect(driverService.getAllDrivers()).rejects.toThrow(dbError);

      expect(mockedDriverDataAccess.getAllDrivers).toHaveBeenCalledWith(undefined);
    });
  });
}); 