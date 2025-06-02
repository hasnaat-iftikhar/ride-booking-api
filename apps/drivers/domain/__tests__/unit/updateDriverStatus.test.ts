/**
 * @fileoverview Unit tests for the DriverService.updateDriverStatus method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import * as responseUtils from '../../../../../libraries/responses';
import type { Transaction as SequelizeTransactionType } from 'sequelize';

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
describe('DriverService - updateDriverStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for updateDriverStatus');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = (type === ErrorType.NOT_FOUND) ? 404 : 500;
      throw err;
    });
  });

  describe('updateDriverStatus', () => {
    const driverId = 'driver-status-update-id';
    const newStatusOnline = 'online' as DriverType['status'];
    const newStatusOffline = 'offline' as DriverType['status'];
    const mockTransaction = {} as SequelizeTransactionType; // Dummy transaction object for tests

    const mockDriver: DriverType = {
      driver_id: driverId,
      name: 'Status Update Driver',
      email: 'status@example.com',
      phone_number: '7778889999',
      license_number: 'LICSTATUS',
      password: 'passStatus',
      status: 'busy', // Initial status
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update driver status to online and return updated driver data without password', async () => {
      const updatedDriverToOnline: DriverType = { ...mockDriver, status: newStatusOnline };
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(updatedDriverToOnline);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedDriver } = updatedDriverToOnline;

      const result = await driverService.updateDriverStatus(driverId, newStatusOnline);

      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatusOnline, undefined);
      expect(result).toEqual(expectedDriver);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
    
    it('should update driver status to offline and return updated driver data without password, with transaction', async () => {
      const updatedDriverToOffline: DriverType = { ...mockDriver, status: newStatusOffline };
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(updatedDriverToOffline);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedDriver } = updatedDriverToOffline;
      const options = { transaction: mockTransaction };

      const result = await driverService.updateDriverStatus(driverId, newStatusOffline, options);

      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatusOffline, options);
      expect(result).toEqual(expectedDriver);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with NOT_FOUND if driver to update status for is not found', async () => {
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(null);
      await expect(driverService.updateDriverStatus(driverId, newStatusOnline))
        .rejects.toThrow('Driver not found');
      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatusOnline, undefined);
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    });

    it('should propagate error if updateDriverStatus from data access fails', async () => {
      const dbError = new Error('DB error during updateDriverStatus dataAccess');
      mockedDriverDataAccess.updateDriverStatus.mockRejectedValue(dbError);
      await expect(driverService.updateDriverStatus(driverId, newStatusOnline))
        .rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
  });
}); 