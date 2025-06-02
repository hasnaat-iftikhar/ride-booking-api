/**
 * @fileoverview Unit tests for the AuthService.loginUser method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { loginUser } from '../authService';
import { authDataAccess } from '../../data-access/authDataAccess';
import type { UserAttributes, UserRole, User as UserType } from '../../../../models/types';
import { JwtAuthenticator } from '../../../../libraries/authenticator/jwtAuthenticator';

// Mock the data access module
jest.mock('../../data-access/authDataAccess');
// Explicitly mock the responses module to ensure the __mocks__ version is used
jest.mock('../../../../libraries/responses');
// Mock the JwtAuthenticator
jest.mock('../../../../libraries/authenticator/jwtAuthenticator');

// Import the entire mocked module for responses
import * as responses from '../../../../libraries/responses';

const mockedThrowError = responses.throwError as jest.MockedFunction<typeof responses.throwError>;
const ErrorType = responses.ErrorType;
const mockedJwtAuthenticator = JwtAuthenticator as jest.Mocked<typeof JwtAuthenticator>;

describe('AuthService - loginUser', () => {
  const mockedAuthDataAccess = authDataAccess as jest.Mocked<typeof authDataAccess>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUserFromDbVerify: UserAttributes = {
      user_id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      phone_number: '1234567890',
      password: 'hashedPasswordFromDb',
      role: 'rider' as UserRole,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockToken = 'mock.jwt.token';

    it('should login a user successfully and return user data (without password) and token', async () => {
      mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(mockUserFromDbVerify);
      (mockedJwtAuthenticator.generateToken as jest.Mock).mockReturnValue(mockToken);

      const result = await loginUser(loginCredentials.email, loginCredentials.password);

      expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password
      );
      expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalledWith({
        userId: mockUserFromDbVerify.user_id,
        email: mockUserFromDbVerify.email,
        role: mockUserFromDbVerify.role,
      });
      
      const { password, ...expectedUser } = mockUserFromDbVerify;
      expect(result.user).toEqual(expectedUser);
      expect(result.user).not.toHaveProperty('password');
      expect(result.token).toBe(mockToken);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with UNAUTHORIZED if credentials are invalid', async () => {
      mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(null);

      mockedThrowError.mockImplementationOnce((type, message) => {
        const err = new Error(message || 'Unauthorized access attempt');
        // @ts-ignore
        err.errorType = type;
        // @ts-ignore
        err.statusCode = 401;
        throw err;
      });

      await expect(loginUser(loginCredentials.email, loginCredentials.password))
        .rejects.toThrow('Invalid email or password');

      expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password
      );
      expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.UNAUTHORIZED, 'Invalid email or password');
    });

    it('should call throwError with SERVER_ERROR if user is found but role is missing', async () => {
      const malformedUserFromDb: Omit<UserAttributes, 'role'> & { role?: UserRole } = {
          user_id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          phone_number: '1234567890',
          password: 'hashedPasswordFromDb',
          created_at: new Date(),
          updated_at: new Date(),
      };
      
      mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(malformedUserFromDb as UserAttributes);
      mockedThrowError.mockImplementationOnce((type, message) => {
        const err = new Error(message || 'Server error due to missing role');
        // @ts-ignore
        err.errorType = type;
        // @ts-ignore
        err.statusCode = 500;
        throw err;
      });

      await expect(loginUser(loginCredentials.email, loginCredentials.password))
          .rejects.toThrow('User role information is missing.');
      
      expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(loginCredentials.email, loginCredentials.password);
      expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'User role not found after verification');
    });

    it('should propagate error from verifyUserCredentials if it fails during login', async () => {
      const dbError = new Error('DB error during verifyUserCredentials');
      mockedAuthDataAccess.verifyUserCredentials.mockRejectedValue(dbError);

      await expect(loginUser(loginCredentials.email, loginCredentials.password))
          .rejects.toThrow(dbError);
      
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should propagate error from JwtAuthenticator.generateToken if it fails', async () => {
      const tokenGenerationError = new Error('Token generation failed');
      mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(mockUserFromDbVerify);
      (mockedJwtAuthenticator.generateToken as jest.Mock).mockImplementation(() => {
          throw tokenGenerationError;
      });

      await expect(loginUser(loginCredentials.email, loginCredentials.password))
          .rejects.toThrow(tokenGenerationError);
      
      expect(mockedThrowError).not.toHaveBeenCalled(); 
    });
  });
}); 