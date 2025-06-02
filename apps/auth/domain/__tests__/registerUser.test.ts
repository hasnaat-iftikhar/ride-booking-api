/**
 * @fileoverview Unit tests for the AuthService.registerUser method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { registerUser } from '../authService';
import { authDataAccess } from '../../data-access/authDataAccess';
import type { UserAttributes, UserRole } from '../../../../models/types';

// Mock the data access module
jest.mock('../../data-access/authDataAccess');
// Explicitly mock the responses module to ensure the __mocks__ version is used
jest.mock('../../../../libraries/responses');
// Mock the JwtAuthenticator (though not directly used by registerUser, kept for consistency if other tests are added here)
jest.mock('../../../../libraries/authenticator/jwtAuthenticator');

// Import the entire mocked module for responses
import * as responses from '../../../../libraries/responses';

const mockedThrowError = responses.throwError as jest.MockedFunction<typeof responses.throwError>;
const ErrorType = responses.ErrorType;

describe('AuthService - registerUser', () => {
  const mockedAuthDataAccess = authDataAccess as jest.Mocked<typeof authDataAccess>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      phone_number: '1234567890',
      password: 'password123',
    };

    const mockUserRecordFromDb: UserAttributes = {
      user_id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      phone_number: '1234567890',
      password: 'hashedPassword',
      role: 'rider' as UserRole,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should register a new user successfully and return user data without password', async () => {
      mockedAuthDataAccess.findUserByEmail.mockResolvedValue(null);
      mockedAuthDataAccess.createUser.mockResolvedValue(mockUserRecordFromDb);

      const result = await registerUser(
        validUserData.name,
        validUserData.email,
        validUserData.phone_number,
        validUserData.password
      );

      expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockedAuthDataAccess.createUser).toHaveBeenCalledWith({
        name: validUserData.name,
        email: validUserData.email,
        phone_number: validUserData.phone_number,
        password_plaintext: validUserData.password,
      });
      
      const { password, ...expectedResult } = mockUserRecordFromDb;
      expect(result).toEqual(expectedResult);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with CONFLICT if user with the email already exists', async () => {
      mockedAuthDataAccess.findUserByEmail.mockResolvedValue(mockUserRecordFromDb);
      
      mockedThrowError.mockImplementationOnce((type, message) => {
        const err = new Error(message || 'Conflict error specifically for this test'); 
        // @ts-ignore
        err.errorType = type;
        // @ts-ignore
        err.statusCode = 409;
        throw err;
      });

      await expect(registerUser(
        validUserData.name,
        validUserData.email,
        validUserData.phone_number,
        validUserData.password
      )).rejects.toThrow('User with this email already exists');

      expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockedAuthDataAccess.createUser).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.CONFLICT, 'User with this email already exists');
    });

    it('should propagate an error from findUserByEmail if it fails', async () => {
      const dbError = new Error('Database error during findUserByEmail');
      mockedAuthDataAccess.findUserByEmail.mockRejectedValue(dbError);

      await expect(registerUser(
        validUserData.name,
        validUserData.email,
        validUserData.phone_number,
        validUserData.password
      )).rejects.toThrow(dbError);

      expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockedAuthDataAccess.createUser).not.toHaveBeenCalled();
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should propagate an error from createUser if it fails', async () => {
      const dbError = new Error('Database error during createUser');
      mockedAuthDataAccess.findUserByEmail.mockResolvedValue(null);
      mockedAuthDataAccess.createUser.mockRejectedValue(dbError);

      await expect(registerUser(
        validUserData.name,
        validUserData.email,
        validUserData.phone_number,
        validUserData.password
      )).rejects.toThrow(dbError);

      expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockedAuthDataAccess.createUser).toHaveBeenCalledWith({
          name: validUserData.name,
          email: validUserData.email,
          phone_number: validUserData.phone_number,
          password_plaintext: validUserData.password,
      });
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
  });
}); 