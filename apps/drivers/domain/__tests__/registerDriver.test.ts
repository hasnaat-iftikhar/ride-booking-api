/**
 * @fileoverview Unit tests for the DriverService.registerDriver method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../data-access/driverDataAccess';
import { riderDataAccess } from '../../../riders/data-access/riderDataAccess';
import { JwtAuthenticator } from '../../../../libraries/authenticator/jwtAuthenticator';
import * as responseUtils from '../../../../libraries/responses';
import { sequelize } from '../../../../models';

// Types used in tests
import type { Sequelize, Transaction as SequelizeTransactionType, TransactionOptions } from 'sequelize';
import { Transaction as ActualSequelizeTransaction } from 'sequelize';

import type {
    DriverAttributes as DriverType,
} from '../../../../models/types';

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
describe('DriverService - registerDriver', () => {
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
            isolationLevel: ActualSequelizeTransaction.ISOLATION_LEVELS.SERIALIZABLE
        },
        sequelize: mockedSequelize,
      } as unknown as SequelizeTransactionType;

      return callback(mockTransaction);
    };

    // @ts-ignore - Acknowledging the known complex type issue for now to proceed with splitting
    mockedSequelize.transaction.mockImplementation(transactionMockImplementation);
  });

  // --- Test Suite for registerDriver ---
  describe('registerDriver', () => {
    const driverRegistrationInput = {
      name: 'Test Driver',
      email: 'driver@example.com',
      phone_number: '0987654321',
      license_number: 'LIC123',
      password_plaintext: 'password123',
    };
    const mockCreatedDriverFromDb: DriverType = {
      driver_id: 'driver-xyz-123',
      name: driverRegistrationInput.name,
      email: driverRegistrationInput.email,
      phone_number: driverRegistrationInput.phone_number,
      license_number: driverRegistrationInput.license_number,
      password: 'hashedPasswordPlaceholder',
      status: 'offline',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should register a new driver successfully and return driver data without password', async () => {
      mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(null);
      mockedDriverDataAccess.createDriver.mockResolvedValue(mockCreatedDriverFromDb);
      const result = await driverService.registerDriver(
        driverRegistrationInput.name,
        driverRegistrationInput.email,
        driverRegistrationInput.phone_number,
        driverRegistrationInput.license_number,
        driverRegistrationInput.password_plaintext
      );
      expect(mockedDriverDataAccess.findDriverByEmail).toHaveBeenCalledWith(driverRegistrationInput.email);
      expect(mockedDriverDataAccess.createDriver).toHaveBeenCalledWith({
        name: driverRegistrationInput.name,
        email: driverRegistrationInput.email,
        phone_number: driverRegistrationInput.phone_number,
        license_number: driverRegistrationInput.license_number,
        password_plaintext: driverRegistrationInput.password_plaintext,
      });
      const { password, ...expectedDriverData } = mockCreatedDriverFromDb;
      expect(result).toEqual(expectedDriverData);
      expect(result).not.toHaveProperty('password');
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with CONFLICT if driver with the email already exists', async () => {
      mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(mockCreatedDriverFromDb);
      await expect(driverService.registerDriver(
        driverRegistrationInput.name,
        driverRegistrationInput.email,
        driverRegistrationInput.phone_number,
        driverRegistrationInput.license_number,
        driverRegistrationInput.password_plaintext
      )).rejects.toThrow('Driver with this email already exists');
      expect(mockedDriverDataAccess.findDriverByEmail).toHaveBeenCalledWith(driverRegistrationInput.email);
      expect(mockedDriverDataAccess.createDriver).not.toHaveBeenCalled();
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.CONFLICT, 'Driver with this email already exists');
    });

    it('should propagate error if findDriverByEmail from data access fails', async () => {
      const dbError = new Error('DB error during findDriverByEmail');
      mockedDriverDataAccess.findDriverByEmail.mockRejectedValue(dbError);
      await expect(driverService.registerDriver(
        driverRegistrationInput.name,
        driverRegistrationInput.email,
        driverRegistrationInput.phone_number,
        driverRegistrationInput.license_number,
        driverRegistrationInput.password_plaintext
      )).rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should propagate error if createDriver from data access fails', async () => {
      const dbError = new Error('DB error during createDriver');
      mockedDriverDataAccess.findDriverByEmail.mockResolvedValue(null);
      mockedDriverDataAccess.createDriver.mockRejectedValue(dbError);
      await expect(driverService.registerDriver(
        driverRegistrationInput.name,
        driverRegistrationInput.email,
        driverRegistrationInput.phone_number,
        driverRegistrationInput.license_number,
        driverRegistrationInput.password_plaintext
      )).rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
  });
}); 