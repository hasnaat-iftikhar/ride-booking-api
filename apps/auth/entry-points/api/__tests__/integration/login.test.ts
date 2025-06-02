import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import supertest from 'supertest';

import authControllerRouter from '../../authController';
import * as authService from '../../../../domain/authService';
import { RequestValidator } from '../../../../../../libraries/validators/requestValidator';
import * as responseUtils from '../../../../../../libraries/responses';
import type { User, UserRole } from '../../../../../../models/types';

// Mock dependencies
jest.mock('../../../../domain/authService');

const mockValidateMiddleware = jest.fn((req: Request, res: Response, next: NextFunction) => next());

jest.mock('../../../../../../libraries/validators/requestValidator', () => ({
  RequestValidator: {
    validate: jest.fn().mockImplementation(() => mockValidateMiddleware)
  }
}));

jest.mock('../../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../../libraries/responses') as object),
  createSuccessResponse: jest.fn(),
}));

const mockedLoginUser = authService.loginUser as jest.MockedFunction<typeof authService.loginUser>;
const mockedCreateSuccessResponse = responseUtils.createSuccessResponse as jest.MockedFunction<typeof responseUtils.createSuccessResponse>;

const app: Application = express();
app.use(express.json());
app.use('/auth', authControllerRouter);

interface TestError extends Error {
  statusCode?: number;
  status?: number;
  errorType?: string;
}

app.use((err: TestError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || err.status || (err.errorType ? 500 : 500);
  res.status(statusCode).json({ 
    error: true, 
    message: err.message || 'An unexpected error occurred', 
    type: err.errorType 
  });
});

describe('AuthController - POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const loginPayload = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockServiceUser: Partial<User> = {
    user_id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    role: 'rider' as UserRole,
  };
  const mockToken = 'mock.jwt.token';
  const mockLoginResult = { user: mockServiceUser, token: mockToken };

  const mockFormattedLoginResponse = {
    success: true,
    message: 'User logged in successfully',
    data: mockLoginResult,
  };

  it('should login a user and return 200 with user data and token on success', async () => {
    mockedLoginUser.mockResolvedValue(mockLoginResult);
    mockedCreateSuccessResponse.mockReturnValue(mockFormattedLoginResponse);

    const response = await supertest(app)
      .post('/auth/login')
      .send(loginPayload);
    
    expect(RequestValidator.validate).toHaveBeenCalled();
    expect(mockValidateMiddleware).toHaveBeenCalled();
    expect(authService.loginUser).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);
    expect(responseUtils.createSuccessResponse).toHaveBeenCalledWith(
      responseUtils.SuccessType.AUTHENTICATED,
      mockLoginResult,
      'User logged in successfully'
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockFormattedLoginResponse);
  });

  it('should return appropriate error if loginUser throws a typed error (e.g., UNAUTHORIZED)', async () => {
    const errorMessage = 'Invalid credentials';
    const mockError: TestError = new Error(errorMessage);
    mockError.errorType = responseUtils.ErrorType.UNAUTHORIZED;
    mockError.statusCode = 401;
    mockedLoginUser.mockRejectedValue(mockError);

    const response = await supertest(app)
      .post('/auth/login')
      .send(loginPayload);

    expect(authService.loginUser).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(true);
    expect(response.body.message).toBe(errorMessage);
    expect(response.body.type).toBe(responseUtils.ErrorType.UNAUTHORIZED);
    expect(responseUtils.createSuccessResponse).not.toHaveBeenCalled();
  });

  it('should return 500 if loginUser throws a generic error', async () => {
    const errorMessage = 'Some unexpected login error';
    const mockError: TestError = new Error(errorMessage);
    mockedLoginUser.mockRejectedValue(mockError);

    const response = await supertest(app)
      .post('/auth/login')
      .send(loginPayload);

    expect(authService.loginUser).toHaveBeenCalledWith(loginPayload.email, loginPayload.password);
    expect(response.status).toBe(500);
    expect(response.body.error).toBe(true);
    expect(response.body.message).toBe(errorMessage);
    expect(responseUtils.createSuccessResponse).not.toHaveBeenCalled();
  });
}); 