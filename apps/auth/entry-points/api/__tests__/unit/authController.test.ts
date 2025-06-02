import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock Express Router
const mockRouter = {
    post: jest.fn(),
    // Add other methods if authController uses them, e.g., get, put, delete
};
jest.mock('express', () => ({
    Router: () => mockRouter,
}));

// Services and Libraries to be mocked
import * as authService from '../../../../domain/authService'; 
import { RequestValidator } from '../../../../../../libraries/validators/requestValidator';
import * as responseUtils from '../../../../../../libraries/responses';

// Types
import type { User as UserType } from '../../../../../../models/types';

// Mock implementations
// Note: Adjust path if your Jest rootDir or modulePaths makes it different
jest.mock('../../../../domain/authService'); 

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
        // throwError is not directly used by authController, but good to have a consistent mock setup
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
import '../authController'; // This executes the controller file, setting up routes on mockRouter

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedResponseUtils = responseUtils as jest.Mocked<typeof responseUtils>; 

describe('AuthController - Unit Tests', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: {
        status: jest.MockedFunction<Response['status']>;
        json: jest.MockedFunction<Response['json']>;
    };
    let mockNextFunction: jest.Mock; // Using jest.Mock for NextFunction to simplify typing

    beforeEach(() => {
        jest.clearAllMocks(); // Clears all mock usage data
        mockRequest = {
            body: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['status']>,
            json: jest.fn().mockReturnThis() as unknown as jest.MockedFunction<Response['json']>,
        };
        mockNextFunction = jest.fn();
    });

    // Helper to get the route handler from mockRouter calls
    const getRouteHandler = (method: 'post', path: string) => {
        const calls = mockRouter[method].mock.calls;
        const matchingCall = calls.find(call => call[0] === path);
        if (!matchingCall || matchingCall.length < 2) { // Expecting path and handler (and maybe middleware)
            throw new Error(`Route handler for ${method.toUpperCase()} ${path} not found in mockRouter.${method}.mock.calls`);
        }
        // The actual handler is the last function passed to router.post
        return matchingCall[matchingCall.length - 1] as (req: Request, res: Response, next: NextFunction) => Promise<void>; 
    };

    describe('POST /register', () => {
        const registerPayload = {
            name: 'Test User',
            email: 'test@example.com',
            phone_number: '1234567890',
            password: 'password123',
        };
        const registeredUserOutput: Partial<UserType> = { // As returned by authService.registerUser
            user_id: 'user-123',
            name: registerPayload.name,
            email: registerPayload.email,
            phone_number: registerPayload.phone_number,
            // role is not part of the registerUser output in authService.ts
        };

        it('should register a user successfully and return 201 with user data', async () => {
            mockRequest.body = registerPayload;
            mockedAuthService.registerUser.mockResolvedValue(registeredUserOutput);

            const handler = getRouteHandler('post', '/register');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedAuthService.registerUser).toHaveBeenCalledWith(
                registerPayload.name, 
                registerPayload.email, 
                registerPayload.phone_number, 
                registerPayload.password
            );
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                type: responseUtils.SuccessType.CREATED,
                data: registeredUserOutput,
                message: 'User registered successfully',
            }));
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.CREATED, 
                registeredUserOutput, 
                'User registered successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with the error if authService.registerUser throws an error', async () => {
            mockRequest.body = registerPayload;
            const expectedError = new Error('Registration process failed');
            mockedAuthService.registerUser.mockRejectedValue(expectedError);

            const handler = getRouteHandler('post', '/register');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNextFunction).toHaveBeenCalledWith(expectedError);
        });
    });

    describe('POST /login', () => {
        const loginPayload = { email: 'test@example.com', password: 'password123' };
        const loginServiceResult = { // As returned by authService.loginUser
            user: { 
                user_id: 'user-123', 
                name: 'Test User', 
                email: loginPayload.email, 
                phone_number: '1234567890', 
                role: 'rider' as UserType['role'] 
            },
            token: 'mock-jwt-token',
        };

        it('should login a user successfully and return 200 with user data and token', async () => {
            mockRequest.body = loginPayload;
            mockedAuthService.loginUser.mockResolvedValue(loginServiceResult);

            const handler = getRouteHandler('post', '/login');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockedAuthService.loginUser).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                type: responseUtils.SuccessType.AUTHENTICATED,
                data: loginServiceResult,
                message: 'User logged in successfully',
            }));
            expect(mockedResponseUtils.createSuccessResponse).toHaveBeenCalledWith(
                responseUtils.SuccessType.AUTHENTICATED, 
                loginServiceResult, 
                'User logged in successfully'
            );
            expect(mockNextFunction).not.toHaveBeenCalled();
        });

        it('should call next with the error if authService.loginUser throws an error', async () => {
            mockRequest.body = loginPayload;
            const expectedError = new Error('Login process failed');
            mockedAuthService.loginUser.mockRejectedValue(expectedError);

            const handler = getRouteHandler('post', '/login');
            await handler(mockRequest as Request, mockResponse as any, mockNextFunction);

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(mockNextFunction).toHaveBeenCalledWith(expectedError);
        });
    });
}); 