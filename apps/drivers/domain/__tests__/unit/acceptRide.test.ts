/**
 * @fileoverview Unit tests for the DriverService.acceptRide method.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Service being tested
import * as driverService from '../../driverService';

// Mocked dependencies
import { driverDataAccess } from '../../../data-access/driverDataAccess';
import { riderDataAccess } from '../../../../riders/data-access/riderDataAccess';
import * as responseUtils from '../../../../../libraries/responses';
import { sequelize } from '../../../../../models'; // For transaction mocking

// Types used in tests
import type { Sequelize, Transaction as SequelizeTransactionType, TransactionOptions } from 'sequelize';
import { Transaction as ActualSequelizeTransaction } from 'sequelize'; // For LOCK types and other static props
import type { RideAttributes as RideType, DriverAttributes as DriverType, RideStatus } from '../../../../../models/types';

// --- Mocking System Setup ---
jest.mock('../../../../../models', () => {
  const originalModule = jest.requireActual('../../../../../models') as { sequelize: Sequelize; [key: string]: unknown };
  return {
    __esModule: true,
    ...originalModule,
    sequelize: {
      ...originalModule.sequelize,
      transaction: jest.fn(),
    },
  };
});

jest.mock('../../../data-access/driverDataAccess');
jest.mock('../../../../riders/data-access/riderDataAccess');
jest.mock('../../../../../libraries/responses', () => {
    const actualResponses = jest.requireActual('../../../../../libraries/responses') as typeof responseUtils;
    return {
        ...actualResponses,
        throwError: jest.fn(),
    };
});

// --- Typed Mocks and Utilities ---
const mockedDriverDataAccess = driverDataAccess as jest.Mocked<typeof driverDataAccess>;
const mockedRiderDataAccess = riderDataAccess as jest.Mocked<typeof riderDataAccess>;
const mockedThrowError = responseUtils.throwError as jest.MockedFunction<typeof responseUtils.throwError>;
const mockedSequelize = sequelize as jest.Mocked<typeof sequelize>; 
const ErrorType = responseUtils.ErrorType;

// --- Test Suite Definition ---
describe('DriverService - acceptRide', () => {
  let mockTransaction: jest.Mocked<SequelizeTransactionType>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedThrowError.mockImplementation((type, message): never => {
      const err = new Error(message || 'Mocked Error from beforeEach for acceptRide');
      // @ts-ignore
      err.errorType = type;
      // @ts-ignore
      err.statusCode = 500;
      throw err;
    });

    mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined), 
        rollback: jest.fn().mockResolvedValue(undefined),
        id: 'mock-transaction-id',
        options: { LOCK: ActualSequelizeTransaction.LOCK } as TransactionOptions, 
        LOCK: ActualSequelizeTransaction.LOCK,
        afterCommit: jest.fn().mockImplementation((fn: (transaction: SequelizeTransactionType) => void | Promise<void>): jest.Mocked<SequelizeTransactionType> => {
            fn(mockTransaction);
            return mockTransaction; 
        }),
    } as unknown as jest.Mocked<SequelizeTransactionType>; 

    (mockedSequelize.transaction as jest.Mock).mockImplementation(
      async <T>(optionsOrCallback?: TransactionOptions | ((t: SequelizeTransactionType) => Promise<T>),
             callback?: (t: SequelizeTransactionType) => Promise<T>) : Promise<T> => {
          let finalCallback: (t: SequelizeTransactionType) => Promise<T>;
          let transactionOptions: TransactionOptions | undefined;

          if (typeof optionsOrCallback === 'function') {
              finalCallback = optionsOrCallback;
          } else if (typeof callback === 'function') {
              transactionOptions = optionsOrCallback as TransactionOptions | undefined;
              finalCallback = callback;
          } else {
              throw new Error('sequelize.transaction mock: Callback function not provided correctly');
          }
          
          // If options were passed, you might want to assign them to mockTransaction.options if needed by the service
          if (transactionOptions) {
            mockTransaction.options = { ...mockTransaction.options, ...transactionOptions };
          }

          try {
              const result = await finalCallback(mockTransaction);
              await mockTransaction.commit();
              return result;
          } catch (error) {
              await mockTransaction.rollback();
              throw error;
          }
      });

    // Default mocks for data access calls within acceptRide
    mockedDriverDataAccess.findDriverById.mockResolvedValue({ driver_id: 'test-driver', status: 'online' } as DriverType);
    mockedRiderDataAccess.findRideById.mockResolvedValue({ ride_id: 'test-ride', status: 'requested' } as RideType);
    mockedRiderDataAccess.updateRideStatus.mockResolvedValue({ ride_id: 'test-ride', status: 'in_progress' } as RideType);
    mockedDriverDataAccess.updateDriverStatus.mockResolvedValue({ 
      driver_id: 'test-driver', 
      status: 'busy',
      name: 'Test Driver',
      email: 'test@driver.com',
      phone_number: '1234567890',
      license_number: 'TESTLIC',
      password: 'hashedTestPassword' 
    } as DriverType);
  });

  const driverId = 'driver-accept-id';
  const rideId = 'ride-to-accept-id';

  const mockDriver: DriverType = {
    driver_id: driverId, name: 'Accepting Driver', email: 'accept@example.com', 
    phone_number: '123', license_number: 'LICACCEPT', password: 'hashed', status: 'online', 
    created_at: new Date(), updated_at: new Date()
  };
  const mockRide: RideType = {
    ride_id: rideId, user_id: 'user-requesting', driver_id: null, 
    pickup_location: 'A', dropoff_location: 'B', fare: 10, status: 'requested', 
    created_at: new Date(), updated_at: new Date(), start_time: null, end_time: null
  };

  it('should successfully accept a ride, update statuses, and commit transaction', async () => {
    mockedDriverDataAccess.findDriverById.mockResolvedValue(mockDriver);
    mockedRiderDataAccess.findRideById.mockResolvedValue(mockRide);
    const updatedRideInProgress: RideType = { ...mockRide, status: 'in_progress' as RideStatus, driver_id: driverId };
    mockedRiderDataAccess.updateRideStatus.mockResolvedValue(updatedRideInProgress);
    
    const driverWithPasswordFromDA = { ...mockDriver, status: 'busy' as DriverType['status'] };
    mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(driverWithPasswordFromDA); 

    const result = await driverService.acceptRide(driverId, rideId);

    expect(mockedSequelize.transaction).toHaveBeenCalledTimes(1);
    expect(mockedDriverDataAccess.findDriverById).toHaveBeenCalledWith(driverId);
    expect(mockedRiderDataAccess.findRideById).toHaveBeenCalledWith(rideId);
    expect(mockedRiderDataAccess.updateRideStatus).toHaveBeenCalledWith(rideId, 'in_progress', driverId, { transaction: mockTransaction });
    expect(mockedDriverDataAccess.updateDriverStatus).toHaveBeenCalledWith(driverId, 'busy', { transaction: mockTransaction });
    expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    expect(mockTransaction.rollback).not.toHaveBeenCalled();
    expect(result).toEqual(updatedRideInProgress);
    expect(mockedThrowError).not.toHaveBeenCalled();
  });

  it('should throw NOT_FOUND and rollback if driver not found', async () => {
    mockedDriverDataAccess.findDriverById.mockResolvedValue(null);
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Driver not found');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Driver not found');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('should throw BAD_REQUEST and rollback if driver is not online', async () => {
    mockedDriverDataAccess.findDriverById.mockResolvedValue({ ...mockDriver, status: 'offline' });
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Driver must be online to accept a ride');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Driver must be online to accept a ride');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('should throw NOT_FOUND and rollback if ride not found', async () => {
    mockedRiderDataAccess.findRideById.mockResolvedValue(null);
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Ride not found');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.NOT_FOUND, 'Ride not found');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('should throw BAD_REQUEST and rollback if ride status is not requested', async () => {
    mockedRiderDataAccess.findRideById.mockResolvedValue({ ...mockRide, status: 'completed' });
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Ride is not in a requestable state');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.BAD_REQUEST, 'Ride is not in a requestable state');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('should throw SERVER_ERROR and rollback if updateRideStatus fails', async () => {
    mockedRiderDataAccess.updateRideStatus.mockResolvedValue(null); // Simulate failure
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Failed to update ride status during transaction');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'Failed to update ride status during transaction');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

  it('should throw SERVER_ERROR and rollback if updateDriverStatus fails', async () => {
    mockedDriverDataAccess.updateDriverStatus.mockResolvedValue(null); // Simulate failure
    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow('Failed to update driver status during transaction');
    expect(mockedThrowError).toHaveBeenCalledWith(ErrorType.SERVER_ERROR, 'Failed to update driver status during transaction');
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
  });

   it('should rollback transaction if findDriverById throws a direct DB error', async () => {
    const dbError = new Error("DB connection error during findDriverById for acceptRide");
    mockedDriverDataAccess.findDriverById.mockRejectedValue(dbError);

    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow(dbError);
    
    expect(mockedSequelize.transaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockedThrowError).not.toHaveBeenCalled(); // Original error should propagate
  });

  it('should rollback transaction if riderDataAccess.updateRideStatus throws a direct DB error', async () => {
    const dbError = new Error("DB error during riderDataAccess.updateRideStatus");
    mockedRiderDataAccess.updateRideStatus.mockRejectedValue(dbError);

    await expect(driverService.acceptRide(driverId, rideId)).rejects.toThrow(dbError);

    expect(mockTransaction.commit).not.toHaveBeenCalled();
    expect(mockTransaction.rollback).toHaveBeenCalledTimes(1);
    expect(mockedThrowError).not.toHaveBeenCalled();
  });
}); 