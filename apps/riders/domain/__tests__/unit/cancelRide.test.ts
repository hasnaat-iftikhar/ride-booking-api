/**
 * @fileoverview Unit tests for the RiderService.cancelRide method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as riderService from '../../riderService';

// Mocked dependencies
import { riderDataAccess } from '../../../data-access/riderDataAccess';
import { driverDataAccess } from '../../../../drivers/data-access/driverDataAccess';
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
import type { RideAttributes as RideType, DriverAttributes as DriverType } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/riderDataAccess');
jest.mock('../../../../drivers/data-access/driverDataAccess');
jest.mock('../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../libraries/responses') as object),
  throwError: jest.fn(),
}));

// --- Typed Mocks and Utilities ---
const mockedRiderDataAccess = riderDataAccess as jest.Mocked<typeof riderDataAccess>;
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('RiderService - cancelRide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach') as Error & { errorType?: responseUtils.ErrorType; statusCode?: number };
      err.errorType = type;
      err.statusCode = 500;
      throw err;
    });
  });

  describe('cancelRide', () => {
    const userId = 'user-cancel-ride-123';
    const rideId = 'ride-to-cancel-456';
    const driverId = 'driver-assigned-789';

    const mockRequestedRide: RideType = {
      ride_id: rideId, user_id: userId, driver_id: null, pickup_location: 'X',
      dropoff_location: 'Y', fare: 25, status: 'requested',
      created_at: new Date(), updated_at: new Date(), start_time: null, end_time: null
    };
    const mockInProgressRideWithDriver: RideType = {
        ...mockRequestedRide,
        driver_id: driverId,
        status: 'in_progress',
        start_time: new Date(),
    };
    const mockCanceledInProgressRide: RideType = { ...mockInProgressRideWithDriver, status: 'canceled' };

    it('should successfully cancel a requested ride (no driver assigned)', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue(mockRequestedRide);
      mockedRiderDataAccess.updateRideStatus.mockResolvedValue({ ...mockRequestedRide, status: 'canceled' });
      const result = await riderService.cancelRide(userId, rideId);
      expect(mockedRiderDataAccess.findRideById).toHaveBeenCalledWith(rideId);
      expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'canceled');
      expect(mockedDriverDataAccess.updateDriverStatus).not.toHaveBeenCalled();
      expect(result.status).toBe('canceled');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should successfully cancel an in_progress ride and update driver status', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue(mockInProgressRideWithDriver);
      mockedRiderDataAccess.updateRideStatus.mockResolvedValue({ ...mockInProgressRideWithDriver, status: 'canceled' });
      const updatedDriverMock: DriverType = {
        driver_id: driverId, name: 'Test Driver', email: 'driver@test.com', phone_number: '123',
        license_number: 'LIC1', password: 'hashed', status: 'online',
        created_at: new Date(), updated_at: new Date()
      };
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(updatedDriverMock);

      const result = await riderService.cancelRide(userId, rideId);

      expect(mockedRiderDataAccess.findRideById).toHaveBeenCalledWith(rideId);
      expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'canceled');
      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, 'online');
      expect(result.status).toBe('canceled');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND if ride to cancel is not found', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue(null);
      await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Ride not found');
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Ride not found');
    });

    it('should throw FORBIDDEN if user tries to cancel a ride not belonging to them', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue({ ...mockRequestedRide, user_id: 'another-user-id' });
      await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('You can only cancel your own rides');
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.FORBIDDEN, 'You can only cancel your own rides');
    });

    it('should throw BAD_REQUEST if ride status is not cancelable (e.g., completed)', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue({ ...mockRequestedRide, status: 'completed', start_time: new Date() });
      await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Ride cannot be canceled in its current state');
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Ride cannot be canceled in its current state');
    });
    
    it('should throw SERVER_ERROR if updateRideStatus by data access returns null (fails to update)', async () => {
      mockedRiderDataAccess.findRideById.mockResolvedValue(mockRequestedRide);
      mockedRiderDataAccess.updateRideStatus.mockResolvedValue(null);
      await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Failed to update ride status');
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'Failed to update ride status');
    });

    it('should cancel ride but propagate error if updating driver status fails', async () => {
        mockedRiderDataAccess.findRideById.mockResolvedValue(mockInProgressRideWithDriver);
        mockedRiderDataAccess.updateRideStatus.mockResolvedValue(mockCanceledInProgressRide);
        const driverUpdateError = new Error('Failed to update driver status in DB');
        mockedDriverDataAccess.updateDriverStatus.mockRejectedValue(driverUpdateError);
  
        await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow(driverUpdateError);
        expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'canceled');
        expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, 'online');
        expect(mockedThrowError).not.toHaveBeenCalled();
      });

    it('should propagate error directly if findRideById from data access fails', async () => {
        const dbError = new Error('DB error during findRideById');
        mockedRiderDataAccess.findRideById.mockRejectedValue(dbError);
        await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow(dbError);
        expect(mockedThrowError).not.toHaveBeenCalled();
      });
  });
}); 