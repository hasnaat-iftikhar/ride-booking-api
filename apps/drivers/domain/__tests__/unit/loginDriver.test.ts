/**
 * @fileoverview Unit tests for the DriverService.loginDriver method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import { JwtAuthenticator } from '../../../../../libraries/authenticator/jwtAuthenticator';
import * as responseUtils from '../../../../../libraries/responses';

// Types used in tests
import type { DriverAttributes as DriverType, UserRole } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../data-access/driverDataAccess');
jest.mock('../../../../../libraries/authenticator/jwtAuthenticator');
jest.mock('../../../../../libraries/responses', () => ({
  ...(jest.requireActual('../../../../../libraries/responses') as object),
  throwError: jest.fn(),
}));

// --- Typed Mocks and Utilities ---
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedJwtAuthenticator = JwtAuthenticator as jest.Mocked<typeof JwtAuthenticator>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('DriverService - loginDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for throwError
    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for loginDriver');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = (type === ErrorType.UNAUTHORIZED) ? 401 : 500;
      throw err;
    });
  });

  describe('loginDriver', () => {
    const loginCredentials = {
      email: 'driverlogin@example.com',
      password_plaintext: 'password123',
    };

    const mockDriverFromDb: DriverType = {
      driver_id: 'driverLoginTest456',
      name: 'Login Test Driver',
      email: loginCredentials.email,
      phone_number: '5556667777',
      license_number: 'LICLOGDRV',
      password: 'hashedLoginPassword',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockToken = 'mock.jwt.driver.token.string';

    it('should login a driver successfully and return driver data (without password) and token', async () => {
      mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(mockDriverFromDb);
      (mockedJwtAuthenticator.generateToken as jest.Mock).mockReturnValue(mockToken);

      const result = await driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext);

      expect(mockedDriverDataAccess.verifyDriverCredentials).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password_plaintext
      );
      expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalledWith({
        userId: mockDriverFromDb.driver_id,
        email: mockDriverFromDb.email,
        role: 'driver' as UserRole, // Ensure role is correctly passed as 'driver'
      });
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedDriver } = mockDriverFromDb;
      expect(result.driver).toEqual(expectedDriver);
      expect(result.driver).not.toHaveProperty('password');
      expect(result.token).toBe(mockToken);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with UNAUTHORIZED if credentials are invalid (driver not found)', async () => {
      mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(null); // Simulate invalid credentials

      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow('Invalid email or password');

      expect(mockedDriverDataAccess.verifyDriverCredentials).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password_plaintext
      );
      expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.UNAUTHORIZED, 'Invalid email or password');
    });

    it('should propagate error from verifyDriverCredentials if it fails (e.g., DB error)', async () => {
      const dbError = new Error('DB error during verifyDriverCredentials');
      mockedDriverDataAccess.verifyDriverCredentials.mockRejectedValue(dbError);

      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow(dbError);
      
      expect(mockedDriverDataAccess.verifyDriverCredentials).toHaveBeenCalledWith(loginCredentials.email, loginCredentials.password_plaintext);
      expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
      expect(mockedThrowError).not.toHaveBeenCalled(); // Error propagated directly
    });

    it('should propagate error from JwtAuthenticator.generateToken if it fails', async () => {
      const tokenGenerationError = new Error('Token generation failed for driver');
      mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(mockDriverFromDb);
      (mockedJwtAuthenticator.generateToken as jest.Mock).mockImplementation(() => {
          throw tokenGenerationError;
      });

      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow(tokenGenerationError);
      
      expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalled(); // It was called before it threw
      expect(mockedThrowError).not.toHaveBeenCalled(); // Error propagated directly
    });
  });
}); 