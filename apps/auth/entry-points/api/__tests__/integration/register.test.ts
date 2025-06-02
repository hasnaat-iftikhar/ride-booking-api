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

const mockedRegisterUser = authService.registerUser as jest.MockedFunction<typeof authService.registerUser>;
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

describe('AuthController - POST /auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const registerPayload = {
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    password: 'password123',
  };

  const mockServiceRegisteredUser: Partial<User> = {
    user_id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    phone_number: '1234567890',
    role: 'rider' as UserRole,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockFormattedSuccessResponse = {
    success: true,
    message: 'User registered successfully',
    data: mockServiceRegisteredUser,
  };

  it('should register a user and return 201 with user data on success', async () => {
    mockedRegisterUser.mockResolvedValue(mockServiceRegisteredUser);
    mockedCreateSuccessResponse.mockReturnValue(mockFormattedSuccessResponse);

    const response = await supertest(app)
      .post('/auth/register')
      .send(registerPayload);

    expect(RequestValidator.validate).toHaveBeenCalled();
    expect(mockValidateMiddleware).toHaveBeenCalled();
    expect(authService.registerUser).toHaveBeenCalledWith(
      registerPayload.name,
      registerPayload.email,
      registerPayload.phone_number,
      registerPayload.password
    );
    expect(responseUtils.createSuccessResponse).toHaveBeenCalledWith(
      responseUtils.SuccessType.CREATED,
      mockServiceRegisteredUser,
      'User registered successfully'
    );
    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockFormattedSuccessResponse);
  });

  it('should return 500 (or appropriate error code) if registerUser throws an error', async () => {
    const errorMessage = 'Registration failed due to DB error';
    const mockError: TestError = new Error(errorMessage);
    mockedRegisterUser.mockRejectedValue(mockError);

    const response = await supertest(app)
      .post('/auth/register')
      .send(registerPayload);

    expect(authService.registerUser).toHaveBeenCalledWith(
      registerPayload.name,
      registerPayload.email,
      registerPayload.phone_number,
      registerPayload.password
    );
    expect(response.status).toBe(500);
    expect(response.body.error).toBe(true);
    expect(response.body.message).toBe(errorMessage);
    expect(responseUtils.createSuccessResponse).not.toHaveBeenCalled();
  });
}); 