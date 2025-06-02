import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock Express Router
const mockRouter = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
};
jest.mock('express', () => ({
    Router: () => mockRouter,
}));

// Services and Middleware to be mocked
import * as driverService from '../../../../../domain/driverService';
import * as authMiddleware from '../../../../../../middleware/authMiddleware';
import { RequestValidator } from '../../../../../../libraries/validators/requestValidator';
import * as responseUtils from '../../../../../../libraries/responses';

// Types
import type { Driver as DriverType, UserRole } from '../../../../../../models/types';

// Mock implementations
jest.mock('../../../../../domain/driverService');
jest.mock('../../../../../../middleware/authMiddleware', () => ({
    authenticateJWT: jest.fn((req: Request, res: Response, next: NextFunction) => {
        // Default mock for authenticateJWT: adds a mock user to req and calls next()
        // @ts-ignore
        req.user = { userId: 'mockDriverId', role: 'driver' as UserRole, email: 'driver@test.com' }; 
        next();
    }),
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
import '../driverController';

const mockedDriverService = driverService as jest.Mocked<typeof driverService>;
const mockedAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;
const mockedRequestValidator = RequestValidator as jest.Mocked<typeof RequestValidator>;
const mockedResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>;


describe('DriverController - Unit Tests', () => {
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
            user: undefined, // ensure user is reset for each test
        };
        mockResponse = {
            status: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['status']>,
            json: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['json']>,
        };
        mockNextFunction = jest.fn();
    });

    // Helper function to extract the route handler from the mockRouter calls
    // This is brittle and depends on the order of middleware and the handler
    const getRouteHandler = (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
        const calls = mockRouter[method].mock.calls;
        const matchingCall = calls.find(call => call[0] === path);
        if (!matchingCall || matchingCall.length < 2) { // Path + Handler, or Path + Middleware + Handler
            throw new Error(`Route handler for ${method.toUpperCase()} ${path} not found or handler missing from mock calls`);
        }
        // The actual handler is the last function in the arguments array for the route call
        return matchingCall[matchingCall.length - 1] as (req: Request, res: Response, next: NextFunction) => Promise<void>; 
    };

    describe('POST /register', () => {
        const registerPayload = {
            name: 'New Driver',
            email: 'newdriver@example.com',
            phone_number: '1230987654',
            license_number: 'NEWLIC1',
            password: 'password123',
        };
        const registeredDriver: Partial<DriverType> = {
            driver_id: 'driver-reg-123',
            name: registerPayload.name,
            email: registerPayload.email,
        };

        it('should register a driver and return 201 with driver data', async () => {
            mockRequest.body = registerPayload;
            mockedDriverService.registerDriver.mockResolvedValue(registeredDriver);

            const handler = getRouteHandler('post', '/register');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.registerDriver).toHaveBeenCalledWith(
                registerPayload.name,
                registerPayload.email,
                registerPayload.phone_number,
                registerPayload.license_number,
                registerPayload.password
            );
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.CREATED, 
                    data: registeredDriver,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.CREATED, 
                registeredDriver, 
                'Driver registered successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.registerDriver throws an error', async () => {
            mockRequest.body = registerPayload;
            const error = new Error('Registration failed');
            // @ts-ignore
            error.errorType = responseUtils.ErrorType.INTERNAL_SERVER_ERROR; 
            mockedDriverService.registerDriver.mockRejectedValue(error);

            const handler = getRouteHandler('post', '/register');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });
    });

    describe('POST /login', () => {
        const loginPayload = {
            email: 'driver@example.com',
            password: 'password123',
        };
        const loginResult = {
            driver: { driver_id: 'driver-log-456', email: loginPayload.email, name: 'Test Driver' },
            token: 'mock-jwt-token',
        };

        it('should login a driver and return 200 with driver data and token', async () => {
            mockRequest.body = loginPayload;
            mockedDriverService.loginDriver.mockResolvedValue(loginResult as any); 

            const handler = getRouteHandler('post', '/login');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.loginDriver).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.AUTHENTICATED,
                    data: loginResult,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.AUTHENTICATED, 
                loginResult, 
                'Driver logged in successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.loginDriver throws an error', async () => {
            mockRequest.body = loginPayload;
            const error = new Error('Login failed');
             // @ts-ignore
            error.errorType = responseUtils.ErrorType.UNAUTHORIZED;
            mockedDriverService.loginDriver.mockRejectedValue(error);

            const handler = getRouteHandler('post', '/login');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });
    });

    describe('GET /profile', () => {
        const driverProfile: Omit<DriverType, 'password'> = {
            driver_id: 'mockDriverId',
            name: 'Test Driver',
            email: 'driver@test.com',
            phone_number: '1234567890',
            license_number: 'TESTLIC123',
            status: 'online',
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should get driver profile and return 200 with driver data', async () => {
            // Simulate authenticateJWT having set req.user
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockedDriverService.getDriverById.mockResolvedValue(driverProfile);

            const handler = getRouteHandler('get', '/profile');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.getDriverById).toHaveBeenCalledWith('mockDriverId');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.RETRIEVED,
                    data: driverProfile,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.RETRIEVED, 
                driverProfile, 
                'Driver profile retrieved successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.getDriverById throws', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            const error = new Error('Failed to get profile');
            mockedDriverService.getDriverById.mockRejectedValue(error);

            const handler = getRouteHandler('get', '/profile');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user or req.user.userId is missing', async () => {
            mockRequest.user = undefined; // Simulate missing user
            
            const handler = getRouteHandler('get', '/profile');
            // We expect throwError to be called, which then throws an error. So we catch it.
            try {
                await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            } catch (e) {
                // Allow test to proceed to assertions
            }

            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(
                responseUtils.ErrorType.SERVER_ERROR, 
                "User identifier missing after authentication."
            );
            expect(mockNextFunction).not.toHaveBeenCalled(); // throwError should be called directly
        });
    });

    describe('PUT /profile', () => {
        const updatePayload = {
            name: 'Updated Driver Name',
            phone_number: '0000000000',
        };
        const updatedDriverProfile: Omit<DriverType, 'password'> = {
            driver_id: 'mockDriverId',
            name: updatePayload.name,
            email: 'driver@test.com', // Email usually not changed here or taken from existing
            phone_number: updatePayload.phone_number,
            license_number: 'TESTLIC123',
            status: 'online',
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should update driver profile and return 200 with updated data', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = updatePayload;
            mockedDriverService.updateDriverProfile.mockResolvedValue(updatedDriverProfile);

            const handler = getRouteHandler('put', '/profile');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.updateDriverProfile).toHaveBeenCalledWith('mockDriverId', updatePayload);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.UPDATED,
                    data: updatedDriverProfile,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.UPDATED, 
                updatedDriverProfile, 
                'Driver profile updated successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.updateDriverProfile throws', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = updatePayload;
            const error = new Error('Failed to update profile');
            mockedDriverService.updateDriverProfile.mockRejectedValue(error);

            const handler = getRouteHandler('put', '/profile');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user or req.user.userId is missing for update', async () => {
            mockRequest.user = undefined;
            mockRequest.body = updatePayload;

            const handler = getRouteHandler('put', '/profile');
            try {
                await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            } catch (e) {
                // Error expected from throwError
            }
            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(
                responseUtils.ErrorType.SERVER_ERROR, 
                "User identifier missing after authentication."
            );
        });
    });

    describe('DELETE /account', () => {
        const deleteResult = { success: true };

        it('should delete driver account and return 200 with success message', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockedDriverService.deleteDriverAccount.mockResolvedValue(deleteResult);

            const handler = getRouteHandler('delete', '/account');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.deleteDriverAccount).toHaveBeenCalledWith('mockDriverId');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.DELETED,
                    data: deleteResult,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.DELETED, 
                deleteResult, 
                'Driver account deleted successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.deleteDriverAccount throws', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            const error = new Error('Failed to delete account');
            mockedDriverService.deleteDriverAccount.mockRejectedValue(error);

            const handler = getRouteHandler('delete', '/account');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user or req.user.userId is missing for delete', async () => {
            mockRequest.user = undefined;

            const handler = getRouteHandler('delete', '/account');
            try {
                await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            } catch (e) {
                // Error expected from throwError
            }
            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(
                responseUtils.ErrorType.SERVER_ERROR, 
                "User identifier missing after authentication."
            );
        });
    });

    describe('PUT /status', () => {
        const statusPayload = { status: 'online' as DriverType['status'] };
        const updatedDriverStatus: Omit<DriverType, 'password'> = {
            driver_id: 'mockDriverId',
            name: 'Test Driver',
            email: 'status@driver.com',
            phone_number: '12345',
            license_number: 'LICSTATUS',
            status: statusPayload.status,
            created_at: new Date(),
            updated_at: new Date(),
        };

        it('should update driver status and return 200 with updated data', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = statusPayload;
            mockedDriverService.updateDriverStatus.mockResolvedValue(updatedDriverStatus);

            const handler = getRouteHandler('put', '/status');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.updateDriverStatus).toHaveBeenCalledWith('mockDriverId', statusPayload.status);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.UPDATED,
                    data: updatedDriverStatus,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.UPDATED, 
                updatedDriverStatus, 
                `Driver status updated to ${statusPayload.status} successfully`
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.updateDriverStatus throws', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = statusPayload;
            const error = new Error('Failed to update status');
            mockedDriverService.updateDriverStatus.mockRejectedValue(error);

            const handler = getRouteHandler('put', '/status');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user or req.user.userId is missing for status update', async () => {
            mockRequest.user = undefined;
            mockRequest.body = statusPayload;

            const handler = getRouteHandler('put', '/status');
            try {
                await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            } catch (e) {
                // Error expected
            }
            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(
                responseUtils.ErrorType.SERVER_ERROR,
                "User identifier missing after authentication."
            );
        });
    });

    describe('POST /accept-ride', () => {
        const acceptRidePayload = { ride_id: 'ride123' };
        const acceptedRideData: any = { // Replace 'any' with actual RideType if available and needed for detailed check
            ride_id: 'ride123',
            driver_id: 'mockDriverId',
            status: 'in_progress',
            // ... other ride properties
        };

        it('should accept a ride and return 200 with ride data', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = acceptRidePayload;
            mockedDriverService.acceptRide.mockResolvedValue(acceptedRideData);

            const handler = getRouteHandler('post', '/accept-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedDriverService.acceptRide).toHaveBeenCalledWith('mockDriverId', acceptRidePayload.ride_id);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: responseUtils.SuccessType.UPDATED,
                    data: acceptedRideData,
                })
            );
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.UPDATED, 
                acceptedRideData, 
                'Ride accepted successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with error if driverService.acceptRide throws', async () => {
            mockRequest.user = { userId: 'mockDriverId', role: 'driver', email: 'driver@test.com' };
            mockRequest.body = acceptRidePayload;
            const error = new Error('Failed to accept ride');
            mockedDriverService.acceptRide.mockRejectedValue(error);

            const handler = getRouteHandler('post', '/accept-ride');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockNextFunction).toHaveBeenCalledWith(error);
        });

        it('should call throwError if req.user or req.user.userId is missing for accept ride', async () => {
            mockRequest.user = undefined;
            mockRequest.body = acceptRidePayload;

            const handler = getRouteHandler('post', '/accept-ride');
            try {
                await handler(mockRequest as Request, mockResponse as any, mockNextFunction);
            } catch (e) {
                // Error expected
            }
            expect(mockedResponseUtils.throwError).toHaveBeenCalledWith(
                responseUtils.ErrorType.SERVER_ERROR,
                "User identifier missing after authentication."
            );
        });
    });
}); 