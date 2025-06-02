/**
 * @fileoverview Unit tests for the DriverService.updateDriverStatus method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../data-access/driverDataAccess';
import { riderDataAccess } from '../../../riders/data-access/riderDataAccess'; // Though not directly used by updateDriverStatus
import { JwtAuthenticator } from '../../../../libraries/authenticator/jwtAuthenticator';
import * as responseUtils from '../../../../libraries/responses';
import { sequelize } from '../../../../models';

// Types used in tests
import type { Sequelize, Transaction as SequelizeTransactionType, TransactionOptions } from 'sequelize';
import { Transaction as ActualSequelizeTransaction } from 'sequelize';
import type { DriverAttributes as DriverType } from '../../../../models/types'; // Needed for this test suite

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
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const mockedSequelize = sequelize as jest.Mocked<Sequelize>; // Kept for consistency
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('DriverService - updateDriverStatus', () => {
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

  describe('updateDriverStatus', () => {
    const driverId = 'driver-status-update-id';
    const newStatus = 'online' as DriverType['status'];
    const mockDriverWithNewStatus: DriverType = {
      driver_id: driverId,
      name: 'Status Update Driver',
      email: 'status@example.com',
      phone_number: '7778889999',
      license_number: 'LICSTATUS',
      password: 'passStatus',
      status: newStatus,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update driver status and return updated driver data without password', async () => {
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(mockDriverWithNewStatus);
      const result = await driverService.updateDriverStatus(driverId, newStatus);
      const { password, ...expectedDriver } = mockDriverWithNewStatus;
      expect(result).toEqual(expectedDriver);
      expect(result).not.toHaveProperty('password');
      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatus, undefined);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });

    it('should call throwError with NOT_FOUND if driver to update status for is not found', async () => {
      mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(null);
      await expect(driverService.updateDriverStatus(driverId, newStatus))
        .rejects.toThrow('Driver not found');
      expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, newStatus, undefined);
      expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    });

    it('should propagate error if updateDriverStatus from data access fails', async () => {
      const dbError = new Error('DB error during updateDriverStatus dataAccess');
      mockedDriverDataAccess.updateDriverStatus.mockRejectedValue(dbError);
      await expect(driverService.updateDriverStatus(driverId, newStatus))
        .rejects.toThrow(dbError);
      expect(mockedThrowError).not.toHaveBeenCalled();
    });
  });
}); 