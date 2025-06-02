import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as riderService from '../../riderService';
import { riderDataAccess } from '../../../data-access/riderDataAccess';
import { driverDataAccess } from '../../../../drivers/data-access/driverDataAccess';
import * as responses from '../../../../../libraries/responses';
import { ErrorType } from '../../../../../libraries/responses';
import type { Ride as RideType, RideCreationAttributes } from '../../../../../models/types';

// Mock dependencies
jest.mock('../../../data-access/riderDataAccess');
jest.mock('../../../../drivers/data-access/driverDataAccess');
jest.mock('../../../../../libraries/responses', () => {
    const originalResponses = jest.requireActual('../../../../../libraries/responses');
    return {
        ...originalResponses,
        throwError: jest.fn(),
    };
});

const mockedRiderDataAccess = riderDataAccess as jest.Mocked<typeof riderDataAccess>;
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>; // Though not used in requestRide directly, good to have for cancelRide
const mockedThrowError = responses.throwError as jest.MockedFunction<typeof responses.throwError>;

// For testing calculateFare, we need to access it via testingExports
const { calculateFare } = riderService.testingExports;

describe('RiderService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedThrowError.mockImplementation((type, message) => {
            const err = new Error(message || 'Test error from riderService.test.ts');
            // @ts-ignore
            err.errorType = type;
            if (type === ErrorType.BAD_REQUEST) { 
                // @ts-ignore
                err.statusCode = 400; 
            } else if (type === ErrorType.NOT_FOUND) {
                 // @ts-ignore
                err.statusCode = 404;
            } else if (type === ErrorType.FORBIDDEN) {
                 // @ts-ignore
                err.statusCode = 403;
            } else {
                 // @ts-ignore
                err.statusCode = 500; 
            }
            throw err;
        });
    });

    describe('calculateFare', () => {
        let mathRandomSpy: jest.SpyInstance;

        beforeEach(() => {
            // Spy on Math.random to make tests deterministic
            mathRandomSpy = jest.spyOn(Math, 'random');
        });

        afterEach(() => {
            // Restore Math.random
            mathRandomSpy.mockRestore();
        });

        it('should calculate fare based on a mock distance', () => {
            mathRandomSpy.mockReturnValue(0.5); // This will result in estimatedDistance = 0.5 * 10 + 1 = 6 km
            const pickup = 'Location A';
            const dropoff = 'Location B';
            const expectedFare = 5.0 + 2.0 * 6; // baseFare + perKmRate * estimatedDistance
            const fare = calculateFare(pickup, dropoff);
            expect(fare).toBe(expectedFare);
        });

        it('should calculate a different fare for a different mock distance', () => {
            mathRandomSpy.mockReturnValue(0.1); // This will result in estimatedDistance = 0.1 * 10 + 1 = 2 km
            const pickup = 'Location C';
            const dropoff = 'Location D';
            const expectedFare = 5.0 + 2.0 * 2;
            const fare = calculateFare(pickup, dropoff);
            expect(fare).toBe(expectedFare);
        });

        it('should return a number with two decimal places if applicable', () => {
            mathRandomSpy.mockReturnValue(0.2345); // distance = 0.2345 * 10 + 1 = 3.345
            // fare = 5 + 2 * 3.345 = 5 + 6.69 = 11.69
            const pickup = 'Location E';
            const dropoff = 'Location F';
            const fare = calculateFare(pickup, dropoff);
            expect(fare).toBe(11.69); 
            // Check if it's a number (it should be due to Number() wrapper)
            expect(typeof fare).toBe('number');
        });
    });

    describe('requestRide', () => {
        const userId = 'user-123';
        const pickupLocation = '123 Main St';
        const dropoffLocation = '456 Oak Ave';
        const mockCalculatedFare = 15.50;

        const createdRideFromDA: RideType = {
            ride_id: 'ride-789',
            user_id: userId,
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            fare: mockCalculatedFare,
            status: 'requested',
            driver_id: null,
            start_time: null,
            end_time: null,
            created_at: new Date(),
            updated_at: new Date(),
        };

        // Mock calculateFare within this describe block or use a spy if preferred
        let calculateFareSpy: jest.SpyInstance;

        beforeEach(() => {
            // Instead of mocking Math.random, we can directly mock calculateFare for requestRide tests
            // This makes requestRide tests independent of calculateFare's internal logic (which is tested separately)
            calculateFareSpy = jest.spyOn(riderService.testingExports, 'calculateFare').mockReturnValue(mockCalculatedFare);
        });

        afterEach(() => {
            calculateFareSpy.mockRestore();
        });

        it('should successfully request a ride', async () => {
            mockedRiderDataAccess.createRideRequest.mockResolvedValue(createdRideFromDA);

            const result = await riderService.requestRide(userId, pickupLocation, dropoffLocation);

            expect(calculateFareSpy).toHaveBeenCalledWith(pickupLocation, dropoffLocation);
            expect(mockedRiderDataAccess.createRideRequest).toHaveBeenCalledWith({
                user_id: userId,
                pickup_location: pickupLocation,
                dropoff_location: dropoffLocation,
                fare: mockCalculatedFare,
            } as RideCreationAttributes);
            expect(result).toEqual(createdRideFromDA);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw BAD_REQUEST if createRideRequest results in "No available drivers found" error (simulated)', async () => {
            // This test simulates a specific error condition that requestRide handles.
            // The actual "No available drivers" might be thrown by a different part of a more complex system,
            // but here we test requestRide's catch block for this specific message.
            const specificError = new Error('No available drivers found');
            mockedRiderDataAccess.createRideRequest.mockRejectedValue(specificError);

            await expect(riderService.requestRide(userId, pickupLocation, dropoffLocation))
                .rejects.toThrow('No drivers are currently available. Please try again later.');

            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.BAD_REQUEST,
                'No drivers are currently available. Please try again later.'
            );
        });

        it('should throw SERVER_ERROR for other errors from createRideRequest', async () => {
            const genericDbError = new Error('Some other DB error');
            mockedRiderDataAccess.createRideRequest.mockRejectedValue(genericDbError);

            await expect(riderService.requestRide(userId, pickupLocation, dropoffLocation))
                .rejects.toThrow('An unexpected error occurred while requesting a ride');
            
            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.SERVER_ERROR,
                'An unexpected error occurred while requesting a ride'
            );
        });

        it('should propagate errors from calculateFare if it's not handled specifically (though current setup always calls createRideRequest)', async () => {
            // This case is slightly artificial given the current try-catch structure, 
            // as calculateFare errors would likely be caught by the generic catch if not specifically handled.
            // However, if calculateFare itself threw an error that wasn't 'No available drivers found'.
            const fareCalculationError = new Error('Fare calculation system offline');
            calculateFareSpy.mockImplementation(() => {
                throw fareCalculationError;
            });

            await expect(riderService.requestRide(userId, pickupLocation, dropoffLocation))
                .rejects.toThrow('An unexpected error occurred while requesting a ride'); // Caught by the generic error handler

            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.SERVER_ERROR,
                'An unexpected error occurred while requesting a ride'
            );
            expect(mockedRiderDataAccess.createRideRequest).not.toHaveBeenCalled();
        });
    });

    describe('getUserRideHistory', () => {
        const userId = 'user-history-123';
        const ride1: RideType = {
            ride_id: 'ride-hist-1',
            user_id: userId,
            pickup_location: 'A',
            dropoff_location: 'B',
            fare: 10,
            status: 'completed',
            driver_id: 'driver-1',
            start_time: new Date(),
            end_time: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
        };
        const ride2: RideType = {
            ride_id: 'ride-hist-2',
            user_id: userId,
            pickup_location: 'C',
            dropoff_location: 'D',
            fare: 20,
            status: 'canceled',
            driver_id: null,
            start_time: null,
            end_time: null,
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should return ride history for a user', async () => {
            const mockHistory = [ride1, ride2];
            mockedRiderDataAccess.getUserRides.mockResolvedValue(mockHistory);

            const result = await riderService.getUserRideHistory(userId);

            expect(mockedRiderDataAccess.getUserRides).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockHistory);
            expect(result.length).toBe(2);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should return an empty array if user has no ride history', async () => {
            mockedRiderDataAccess.getUserRides.mockResolvedValue([]);

            const result = await riderService.getUserRideHistory(userId);

            expect(mockedRiderDataAccess.getUserRides).toHaveBeenCalledWith(userId);
            expect(result).toEqual([]);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should propagate errors from riderDataAccess.getUserRides', async () => {
            const dbError = new Error('DB error fetching history');
            mockedRiderDataAccess.getUserRides.mockRejectedValue(dbError);

            await expect(riderService.getUserRideHistory(userId)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled(); // Error should propagate directly
        });
    });

    describe('cancelRide', () => {
        const userId = 'user-cancel-456';
        const rideId = 'ride-to-cancel-123';
        const driverId = 'driver-on-ride-789';

        const mockRideRequested: RideType = {
            ride_id: rideId,
            user_id: userId,
            pickup_location: 'From',
            dropoff_location: 'To',
            fare: 25,
            status: 'requested',
            driver_id: null,
            start_time: null,
            end_time: null,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const mockRideInProgress: RideType = {
            ...mockRideRequested,
            status: 'in_progress',
            driver_id: driverId,
            start_time: new Date(),
        };

        const canceledRideFromDA: RideType = {
            ...mockRideRequested,
            status: 'canceled',
            updated_at: new Date(),
        };
        
        const canceledRideInProgressFromDA: RideType = {
            ...mockRideInProgress,
            status: 'canceled',
            updated_at: new Date(),
        };

        it('should successfully cancel a "requested" ride', async () => {
            mockedRiderDataAccess.findRideById.mockResolvedValue(mockRideRequested);
            mockedRiderDataAccess.updateRideStatus.mockResolvedValue(canceledRideFromDA);

            const result = await riderService.cancelRide(userId, rideId);

            expect(mockedRiderDataAccess.findRideById).toHaveBeenCalledWith(rideId);
            expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'canceled');
            expect(mockedDriverDataAccess.updateDriverStatus).not.toHaveBeenCalled(); // No driver assigned
            expect(result).toEqual(canceledRideFromDA);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should successfully cancel an "in_progress" ride and update driver status to online', async () => {
            mockedRiderDataAccess.findRideById.mockResolvedValue(mockRideInProgress);
            mockedRiderDataAccess.updateRideStatus.mockResolvedValue(canceledRideInProgressFromDA);
            // Assume updateDriverStatus is successful, not testing its return value here, just that it's called
            mockedDriverDataAccess.updateDriverStatus.mockResolvedValue({} as any); 

            const result = await riderService.cancelRide(userId, rideId);

            expect(mockedRiderDataAccess.findRideById).toHaveBeenCalledWith(rideId);
            expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'canceled');
            expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, 'online');
            expect(result).toEqual(canceledRideInProgressFromDA);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw NOT_FOUND if ride to cancel does not exist', async () => {
            mockedRiderDataAccess.findRideById.mockResolvedValue(null);

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Ride not found');
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Ride not found');
        });

        it('should throw FORBIDDEN if user tries to cancel another user\'s ride', async () => {
            const anotherUsersRide: RideType = { ...mockRideRequested, user_id: 'other-user-777' };
            mockedRiderDataAccess.findRideById.mockResolvedValue(anotherUsersRide);

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('You can only cancel your own rides');
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.FORBIDDEN, 'You can only cancel your own rides');
        });

        it('should throw BAD_REQUEST if ride status is "completed"', async () => {
            const completedRide: RideType = { ...mockRideRequested, status: 'completed' };
            mockedRiderDataAccess.findRideById.mockResolvedValue(completedRide);

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Ride cannot be canceled in its current state');
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Ride cannot be canceled in its current state');
        });

        it('should throw BAD_REQUEST if ride status is already "canceled"', async () => {
            const alreadyCanceledRide: RideType = { ...mockRideRequested, status: 'canceled' };
            mockedRiderDataAccess.findRideById.mockResolvedValue(alreadyCanceledRide);

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Ride cannot be canceled in its current state');
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Ride cannot be canceled in its current state');
        });

        it('should throw SERVER_ERROR if updateRideStatus fails', async () => {
            mockedRiderDataAccess.findRideById.mockResolvedValue(mockRideRequested);
            mockedRiderDataAccess.updateRideStatus.mockResolvedValue(null); // Simulate failure

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow('Failed to update ride status');
            expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'Failed to update ride status');
        });
        
        it('should still return updated ride even if driver status update fails (as per current service logic)', async () => {
            mockedRiderDataAccess.findRideById.mockResolvedValue(mockRideInProgress);
            mockedRiderDataAccess.updateRideStatus.mockResolvedValue(canceledRideInProgressFromDA);
            // Simulate driverDataAccess.updateDriverStatus failing
            mockedDriverDataAccess.updateDriverStatus.mockRejectedValue(new Error('Failed to update driver status'));

            const result = await riderService.cancelRide(userId, rideId);

            // The ride cancellation should still succeed as the error from updateDriverStatus is not currently blocking/re-thrown
            expect(result).toEqual(canceledRideInProgressFromDA);
            expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, 'online');
            expect(mockedThrowError).not.toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'Failed to update ride status'); // Assuming the primary error we are checking is related to ride update
        });

        it('should propagate error from findRideById data access', async () => {
            const dbError = new Error('DB error findRideById for cancel');
            mockedRiderDataAccess.findRideById.mockRejectedValue(dbError);

            await expect(riderService.cancelRide(userId, rideId)).rejects.toThrow(dbError);
            expect(mockedThrowError).not.toHaveBeenCalled(); // Original error should propagate
        });
    });
}); 