/**
 * @fileoverview Unit tests for the DriverService.loginDriver method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../data-access/driverDataAccess';
import { riderDataAccess } from '../../../riders/data-access/riderDataAccess'; // Though not directly used by loginDriver
import { JwtAuthenticator } from '../../../../libraries/authenticator/jwtAuthenticator';
import * as responseUtils from '../../../../libraries/responses';
import { sequelize } from '../../../../models';

// Types used in tests
import type { Sequelize, Transaction as SequelizeTransactionType, TransactionOptions } from 'sequelize';
import { Transaction as ActualSequelizeTransaction } from 'sequelize';
import type { DriverAttributes as DriverType } from '../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../../models', () => {
  // Using 'as any' temporarily to expedite file splitting.
  // TODO: Define a more specific type for originalModule after splitting is complete.
  const originalModule = jest.requireActual('../../../../models') as any;
  return {
    __esModule: true,
    ...originalModule,
    sequelize: {
      ...originalModule.sequelize,
      transaction: jest.fn(),
    },
  };
});

jest.mock('../../data-access/driverDataAccess');
jest.mock('../../../riders/data-access/riderDataAccess');
jest.mock('../../../../libraries/authenticator/jwtAuthenticator');
jest.mock('../../../../libraries/responses', () => {
  const actualResponses = jest.requireActual('../../../../libraries/responses') as typeof responseUtils;
  return {
    ...actualResponses,
    throwError: jest.fn(),
  };
});

// --- Typed Mocks and Utilities ---
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedJwtAuthenticator = JwtAuthenticator as jest.Mocked<typeof JwtAuthenticator>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const mockedSequelize = sequelize as jest.Mocked<Sequelize>;
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('DriverService - loginDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = 500;
      throw err;
    });

    const transactionMockImplementation = async <T>(
      arg1?: TransactionOptions | ((t: SequelizeTransactionType) => Promise<T>),
      arg2?: (t: SequelizeTransactionType) => Promise<T>
    ): Promise<T> => {
      let callback: ((t: SequelizeTransactionType) => Promise<T>);
      let options: TransactionOptions | undefined;
      if (typeof arg1 === 'function') {
        callback = arg1;
      } else {
        options = arg1;
        if (typeof arg2 !== 'function') {
          return Promise.reject(new Error('Transaction callback not provided with options'));
        }
        callback = arg2;
      }
      const mockTransaction = {
        commit: jest.fn(async () => {}),
        rollback: jest.fn(async () => {}),
        afterCommit: jest.fn((fn: (transaction: SequelizeTransactionType) => void | Promise<void>) => {
          const result = fn(mockTransaction as SequelizeTransactionType);
          if (result && typeof (result as Promise<void>).then === 'function') {
            return (result as Promise<void>).then(() => mockTransaction as SequelizeTransactionType);
          }
          return mockTransaction as SequelizeTransactionType;
        }),
        LOCK: ActualSequelizeTransaction.LOCK,
        options: options || {
          // @ts-ignore
          type: ActualSequelizeTransaction.TYPES.DEFERRED,
          // @ts-ignore
          isolationLevel: ActualSequelizeTransaction.ISOLATION_LEVELS.SERIALIZABLE,
        },
        sequelize: mockedSequelize,
      } as unknown as SequelizeTransactionType;
      return callback(mockTransaction);
    };
    // @ts-ignore
    mockedSequelize.transaction.mockImplementation(transactionMockImplementation);
  });

  describe('loginDriver', () => {
    const loginCredentials = {
      email: 'driver@example.com',
      password_plaintext: 'password123',
    };
    const mockDriverFromDb: DriverType = {
      driver_id: 'driver-xyz-123',
      name: 'Test Driver',
      email: loginCredentials.email,
      phone_number: '0987654321',
      license_number: 'LIC123',
      password: 'hashedPasswordFromDb',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const mockToken = 'mock.driver.jwt.token';

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
        role: 'driver'
      });
      const { password, ...expectedDriver } = mockDriverFromDb;
      expect(result.driver).toEqual(expectedDriver);
      expect(result.driver).not.toHaveProperty('password');
      expect(result.token).toBe(mockToken);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with UNAUTHORIZED if credentials are invalid', async () => {
      mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(null);
      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow('Invalid email or password');
      expect(mockedDriverDataAccess.verifyDriverCredentials).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password_plaintext
      );
      expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.UNAUTHORIZED, 'Invalid email or password');
    });

    it('should propagate error from verifyDriverCredentials if it fails', async () => {
      const dbError = new Error('DB error during verifyDriverCredentials');
      mockedDriverDataAccess.verifyDriverCredentials.mockRejectedValue(dbError);
      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should propagate error from JwtAuthenticator.generateToken if it fails', async () => {
      const tokenError = new Error('Token generation error');
      mockedDriverDataAccess.verifyDriverCredentials.mockResolvedValue(mockDriverFromDb);
      (mockedJwtAuthenticator.generateToken as jest.Mock).mockImplementation(() => {
        throw tokenError;
      });
      await expect(driverService.loginDriver(loginCredentials.email, loginCredentials.password_plaintext))
        .rejects.toThrow(tokenError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
  });
}); 