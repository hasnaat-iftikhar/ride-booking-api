/**
 * @fileoverview Unit tests for the DriverService.deleteDriverAccount method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
// No specific complex types needed for this test suite

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
describe('DriverService - deleteDriverAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for deleteDriverAccount');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = (type === ErrorType.NOT_FOUND) ? 404 : 500;
      throw err;
    });
  });

  describe('deleteDriverAccount', () => {
    const driverIdToDelete = 'driver-to-delete-id';

    it('should successfully delete a driver account and return { success: true }', async () => {
      mockedDriverDataAccess.deleteDriver.mockResolvedValue(true);

      const result = await driverService.deleteDriverAccount(driverIdToDelete);

      expect(mockedDriverDataAccess.deleteDriver).toHaveBeenCalledWith(driverIdToDelete);
      expect(result).toEqual({ success: true });
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with NOT_FOUND if driverDataAccess.deleteDriver returns false', async () => {
      mockedDriverDataAccess.deleteDriver.mockResolvedValue(false);

      await expect(driverService.deleteDriverAccount(driverIdToDelete))
        .rejects.toThrow('Driver not found');

      expect(mockedDriverDataAccess.deleteDriver).toHaveBeenCalledWith(driverIdToDelete);
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    });

    it('should propagate an error from driverDataAccess.deleteDriver if it fails', async () => {
      const dbError = new Error('Database error during deleteDriver');
      mockedDriverDataAccess.deleteDriver.mockRejectedValue(dbError);

      await expect(driverService.deleteDriverAccount(driverIdToDelete)).rejects.toThrow(dbError);

      expect(mockedDriverDataAccess.deleteDriver).toHaveBeenCalledWith(driverIdToDelete);
      expect(mockedThrowError).not.toHaveBeenCalled(); // Error propagated directly
    });
  });
}); 