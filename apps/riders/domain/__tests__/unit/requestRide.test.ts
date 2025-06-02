/**
 * @fileoverview Unit tests for the RiderService.requestRide method.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Service being tested
import * as riderService from '../../riderService';
import { testingExports } from '../../riderService'; // Import for calculateFare

// Mocked dependencies
import { riderDataAccess } from '../../../data-access/riderDataAccess';
import { driverDataAccess } from '../../../../drivers/data-access/driverDataAccess'; // Kept for structural consistency
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
import type { RideAttributes as RideType, RideStatus } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/riderDataAccess');
jest.mock('../../../../drivers/data-access/driverDataAccess');
jest.mock('../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../libraries/responses') as object),
  throwError: jest.fn(),
}));

// --- Typed Mocks and Utilities ---
const mockedRiderDataAccess = riderDataAccess as jest.Mocked<typeof riderDataAccess>;
// const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>; // Not directly used in this file
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('RiderService - requestRide', () => {
  let originalMathRandom: () => number;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach') as Error & { errorType?: responseUtils.ErrorType; statusCode?: number };
      err.errorType = type;
      err.statusCode = 500;
      throw err;
    });
    // Mock Math.random to ensure deterministic fare calculation
    originalMathRandom = Math.random;
    Math.random = jest.fn(() => 0.5); // Ensures estimatedDistance = 0.5 * 10 + 1 = 6
                                      // Fare = 5.0 (base) + 2.0 (rate) * 6 (distance) = 17.00
  });

  afterEach(() => {
    Math.random = originalMathRandom; // Restore original Math.random
  });

  describe('requestRide', () => {
    const userId = 'user-123';
    const pickupLocation = 'Source Point';
    const dropoffLocation = 'Destination Point';

    const mockCreatedRideFromDataAccess: RideType = {
      ride_id: 'ride-abc-789',
      user_id: userId,
      driver_id: null,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      fare: 17.00, // Adjusted to mocked calculation
      status: 'requested' as RideStatus,
      start_time: null,
      end_time: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should successfully create a ride request and return the ride data', async () => {
      const calculatedFare = 17.00; // testingExports.calculateFare(pickupLocation, dropoffLocation); - Now deterministic due to mock
      const rideDataToReturn = { ...mockCreatedRideFromDataAccess, fare: calculatedFare };
      mockedRiderDataAccess.createRideRequest.mockResolvedValue(rideDataToReturn);
      
      const result = await riderService.requestRide(userId, pickupLocation, dropoffLocation);

      expect(mockedRiderDataAccess.createRideRequest).toHaveBeenCalledWith({
        user_id: userId,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        fare: calculatedFare,
      });
      expect(result).toEqual(rideDataToReturn);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should throw SERVER_ERROR if createRideRequest from data access fails with a generic error', async () => {
      const dbError = new Error('DB error during createRideRequest');
      mockedRiderDataAccess.createRideRequest.mockRejectedValue(dbError);
      const calculatedFare = 17.00; // testingExports.calculateFare(pickupLocation, dropoffLocation); - Now deterministic

      await expect(riderService.requestRide(userId, pickupLocation, dropoffLocation))
        .rejects.toThrow('An unexpected error occurred while requesting a ride');
      
      expect(mockedRiderDataAccess.createRideRequest).toHaveBeenCalledWith(expect.objectContaining({
        user_id: userId,
        fare: calculatedFare,
      }));
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'An unexpected error occurred while requesting a ride');
    });

    it('should throw BAD_REQUEST if createRideRequest (simulating data access) throws \'No available drivers found\' error', async () => {
        const noDriversError = new Error('No available drivers found');
        mockedRiderDataAccess.createRideRequest.mockRejectedValue(noDriversError);
        const calculatedFare = 17.00; // testingExports.calculateFare(pickupLocation, dropoffLocation); - Now deterministic
  
        await expect(riderService.requestRide(userId, pickupLocation, dropoffLocation))
          .rejects.toThrow('No drivers are currently available. Please try again later.');
        
        expect(mockedRiderDataAccess.createRideRequest).toHaveBeenCalledWith(expect.objectContaining({
            user_id: userId,
            fare: calculatedFare,
        }));
        expect(mockedThrowError).toHaveBeenCalledWith(
            ErrorType.BAD_REQUEST,
            'No drivers are currently available. Please try again later.'
        );
      });
  });
}); 