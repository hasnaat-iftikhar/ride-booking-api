/**
 * @fileoverview Unit tests for the RiderService.getUserRideHistory method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as riderService from '../../riderService';

// Mocked dependencies
import { riderDataAccess } from '../../../data-access/riderDataAccess';
import { driverDataAccess } from '../../../../drivers/data-access/driverDataAccess'; // Kept for structural consistency
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
import type { RideAttributes as RideType } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/riderDataAccess');
jest.mock('../../../../drivers/data-access/driverDataAccess');
jest.mock('../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../libraries/responses') as object),
  throwError: jest.fn(),
}));

// --- Typed Mocks and Utilities ---
const mockedRiderDataAccess = riderDataAccess as jest.Mocked<typeof riderDataAccess>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const ErrorType = responseUtils.ErrorType; // ErrorType might not be used if all tests are happy path or propagate generic errors

// --- Test Suite Definition ---
describe('RiderService - getUserRideHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach') as Error & { errorType?: responseUtils.ErrorType; statusCode?: number };
      err.errorType = type;
      err.statusCode = 500;
      throw err;
    });
  });

  describe('getUserRideHistory', () => {
    const userId = 'user-history-123';
    const mockRidesFromDb: RideType[] = [
      { ride_id: 'ride1', user_id: userId, driver_id: 'driver1', pickup_location: 'A', dropoff_location: 'B', fare: 10, status: 'completed', created_at: new Date(), updated_at: new Date(), start_time: new Date(), end_time: new Date() },
      { ride_id: 'ride2', user_id: userId, driver_id: 'driver2', pickup_location: 'C', dropoff_location: 'D', fare: 20, status: 'canceled', created_at: new Date(), updated_at: new Date(), start_time: null, end_time: null },
    ];

    it('should return a list of rides for the user', async () => {
      mockedRiderDataAccess.getUserRides.mockResolvedValue(mockRidesFromDb);
      const result = await riderService.getUserRideHistory(userId);
      expect(result).toEqual(mockRidesFromDb);
      expect(mockedRiderDataAccess.getUserRides).toHaveBeenCalledWith(userId);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should return an empty array if no rides are found for the user', async () => {
      mockedRiderDataAccess.getUserRides.mockResolvedValue([]);
      const result = await riderService.getUserRideHistory(userId);
      expect(result).toEqual([]);
      expect(mockedRiderDataAccess.getUserRides).toHaveBeenCalledWith(userId);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should propagate error if getUserRides from data access fails', async () => {
      const dbError = new Error('DB error during getUserRides');
      mockedRiderDataAccess.getUserRides.mockRejectedValue(dbError);
      await expect(riderService.getUserRideHistory(userId)).rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled(); // As error is propagated directly
    });
  });
}); 