import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock Express Router
const mockRouter = {
    post: jest.fn(),
    get: jest.fn(),
    // No put or delete in riderController.ts
};
jest.mock('express', () => ({
    Router: () => mockRouter,
}));

// Services and Middleware to be mocked
import * as riderService from '../../../../domain/riderService'; 
import * as authMiddleware from '../../../../../../middleware/authMiddleware';
import { RequestValidator } from '../../../../../../libraries/validators/requestValidator';
import * as responseUtils from '../../../../../../libraries/responses';

// Types
import type { UserRole, Ride as RideType } from '../../../../../../models/types';

// Mock implementations
// Path for riderService might need adjustment based on Jest's rootDir or modulePaths config
jest.mock('../../../../domain/riderService'); 

jest.mock('../../../../../../middleware/authMiddleware', () => ({
    authenticateJWT: jest.fn((req: Request, res: Response, next: NextFunction) => {
        // @ts-ignore
        req.user = { userId: 'mockRiderId', role: 'rider' as UserRole, email: 'rider@test.com' }; 
        next();
    }),
    // authorizeRoles is not used by riderController but good to keep if other controllers might use it
    authorizeRoles: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));
jest.mock('../../../../../../libraries/validators/requestValidator', () => ({
    RequestValidator: {
        validate: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    },
}));
jest.mock('../../../../../../libraries/responses', () => {
    const originalResponses = jest.requireActual('../../../../../../libraries/responses') as typeof responseUtils;
    return {
        ...originalResponses,
        createSuccessResponse: jest.fn((type, data, message) => ({ type, data, message })),
        throwError: jest.fn((type, message: string | undefined) => { 
            const err = new Error(message); 
            // @ts-ignore
            err.errorType = type; 
            throw err; 
        }),
        SuccessType: originalResponses.SuccessType,
        ErrorType: originalResponses.ErrorType,
    };
});

// Import the controller AFTER all mocks are set up
import '../riderController'; 

const mockedRiderService = riderService as jest.Mocked<typeof riderService>;
const mockedResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>; 

describe('RiderController - Unit Tests', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: {
        status: jest.MockedFunction<Response['status']>;
        json: jest.MockedFunction<Response['json']>;
    };
    let mockNextFunction: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            body: {},
            params: {},
            query: {},
            user: undefined,
        };
        mockResponse = {
            status: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['status']>,
            json: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['json']>,
        };
        mockNextFunction = jest.fn() as jest.MockedFunction<NextFunction>; // Added cast
    });

    const getRouteHandler = (method: 'get' | 'post', path: string) => {
        const calls = mockRouter[method].mock.calls;
        const matchingCall = calls.find(call => call[0] === path);
        if (!matchingCall || matchingCall.length < 2) {
            throw new Error(`Route handler for ${method.toUpperCase()} ${path} not found`);
        }
        return matchingCall[matchingCall.length - 1] as (req: Request, res: Response, next: NextFunction) => Promise<void>; 
    };

    describe('POST /request-ride', () => {
        const rideRequestPayload = { pickup_location: 'Source A', dropoff_location: 'Destination B' };
        const createdRide: RideType = {
            ride_id: 'ride-req-123',
            user_id: 'mockRiderId',
            pickup_location: rideRequestPayload.pickup_location,
            dropoff_location: rideRequestPayload.dropoff_location,
            fare: 20.50,
            status: 'requested',
            driver_id: null, start_time: null, end_time: null,
            created_at: new Date(), updated_at: new Date(),
        };

        it('should request a ride and return 201 with ride data', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            mockRequest.body = rideRequestPayload;
            mockedRiderService.requestRide.mockResolvedValue(createdRide);

            const handler = getRouteHandler('post', '/request-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedRiderService.requestRide).toHaveBeenCalledWith('mockRiderId', rideRequestPayload.pickup_location, rideRequestPayload.dropoff_location);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                type: responseUtils.SuccessType.CREATED,
                data: createdRide,
            }));
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(responseUtils.SuccessType.CREATED, createdRide, 'Ride requested successfully');
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if riderService.requestRide throws', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            mockRequest.body = rideRequestPayload;
            const error = new Error('Ride request failed');
            mockedRiderService.requestRide.mockRejectedValue(error);

            const handler = getRouteHandler('post', '/request-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user is missing', async () => {
            mockRequest.user = undefined;
            mockRequest.body = rideRequestPayload;
            const handler = getRouteHandler('post', '/request-ride');
            try { await handler(mockRequest as Request, mockResponse as any, mockNextFunction); } catch(e) {}
            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(responseUtils.ErrorType.SERVER_ERROR, "User identifier missing after authentication.");
        });
    });

    describe('GET /rides', () => {
        const rideHistory: RideType[] = [
            { ride_id: 'ride-hist-1', user_id: 'mockRiderId', pickup_location: 'A', dropoff_location: 'B', fare: 10, status: 'completed', driver_id: 'd1', start_time: new Date(), end_time: new Date(), created_at: new Date(), updated_at: new Date() },
            { ride_id: 'ride-hist-2', user_id: 'mockRiderId', pickup_location: 'C', dropoff_location: 'D', fare: 15, status: 'canceled', driver_id: null, start_time: null, end_time: null, created_at: new Date(), updated_at: new Date() },
        ];

        it('should get ride history and return 200 with data', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            mockedRiderService.getUserRideHistory.mockResolvedValue(rideHistory);

            const handler = getRouteHandler('get', '/rides');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedRiderService.getUserRideHistory).toHaveBeenCalledWith('mockRiderId');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                type: responseUtils.SuccessType.RETRIEVED,
                data: rideHistory,
            }));
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(responseUtils.SuccessType.RETRIEVED, rideHistory, 'Ride history retrieved successfully');
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if riderService.getUserRideHistory throws', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            const error = new Error('Failed to get history');
            mockedRiderService.getUserRideHistory.mockRejectedValue(error);
            const handler = getRouteHandler('get', '/rides');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });
    });

    describe('POST /cancel-ride', () => {
        const cancelPayload = { ride_id: 'ride-to-cancel-123' };
        const canceledRide: RideType = {
            ride_id: cancelPayload.ride_id, user_id: 'mockRiderId', pickup_location: 'OldLoc', dropoff_location: 'OldDest',
            fare: 50, status: 'canceled', driver_id: null, start_time: null, end_time: null, created_at: new Date(), updated_at: new Date(),
        };

        it('should cancel a ride and return 200 with updated ride data', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            mockRequest.body = cancelPayload;
            mockedRiderService.cancelRide.mockResolvedValue(canceledRide);

            const handler = getRouteHandler('post', '/cancel-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedRiderService.cancelRide).toHaveBeenCalledWith('mockRiderId', cancelPayload.ride_id);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                type: responseUtils.SuccessType.UPDATED,
                data: canceledRide,
            }));
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(responseUtils.SuccessType.UPDATED, canceledRide, 'Ride cancelled successfully');
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if riderService.cancelRide throws', async () => {
            mockRequest.user = { userId: 'mockRiderId', role: 'rider', email: 'rider@test.com' };
            mockRequest.body = cancelPayload;
            const error = new Error('Failed to cancel ride');
            mockedRiderService.cancelRide.mockRejectedValue(error);
            const handler = getRouteHandler('post', '/cancel-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });
    });
}); 