import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as authService from './authService';
import { authDataAccess } from '../data-access/authDataAccess';
import { JwtAuthenticator } from '../../../libraries/authenticator/jwtAuthenticator';
import * as responses from '../../../libraries/responses';
import { ErrorType } from '../../../libraries/responses';

// Mocking the data access layer
jest.mock('../data-access/authDataAccess');
// Mocking the JWT Authenticator
jest.mock('../../../libraries/authenticator/jwtAuthenticator');
// Mocking the response library
jest.mock('../../../libraries/responses', () => {
    const originalModule = jest.requireActual('../../../libraries/responses') as typeof responses;
    return {
        ...originalModule,
        throwError: jest.fn(), // Mock specific function
    };
});

const mockedAuthDataAccess = authDataAccess as jest.Mocked<typeof authDataAccess>;
const mockedJwtAuthenticator = JwtAuthenticator as jest.Mocked<typeof JwtAuthenticator>;
const mockedThrowError = responses.throwError as jest.MockedFunction<typeof responses.throwError>;

describe('AuthService - Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation for throwError to avoid test failures if not specifically overridden
        mockedThrowError.mockImplementation((type, message) => {
            const err = new Error(message || 'Test error');
            // @ts-ignore
            err.errorType = type;
            // @ts-ignore
            err.statusCode = 500; // Default to server error, can be specified by type
            if (type === ErrorType.CONFLICT) {
                // @ts-ignore
                err.statusCode = 409;
            } else if (type === ErrorType.UNAUTHORIZED) {
                // @ts-ignore
                err.statusCode = 401;
            } else if (type === ErrorType.NOT_FOUND) {
                // @ts-ignore
                err.statusCode = 404;
            }
            throw err;
        });
    });

    describe('registerUser', () => {
        const userData = {
            name: 'Test User',
            email: 'test@example.com',
            phone_number: '1234567890',
            password: 'password123',
        };

        const fullUserFromDb = {
            user_id: 'user-123',
            ...userData,
            role: 'rider' as const, // Added role
            created_at: new Date(),
            updated_at: new Date(),
        };


        it('should register a new user successfully', async () => {
            mockedAuthDataAccess.findUserByEmail.mockResolvedValue(null);
            mockedAuthDataAccess.createUser.mockResolvedValue(fullUserFromDb);

            const result = await authService.registerUser(
                userData.name,
                userData.email,
                userData.phone_number,
                userData.password
            );

            expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(userData.email);
            expect(mockedAuthDataAccess.createUser).toHaveBeenCalledWith({
                name: userData.name,
                email: userData.email,
                phone_number: userData.phone_number,
                password_plaintext: userData.password,
            });
            // @ts-ignore
            expect(result.password).toBeUndefined();
            expect(result).toEqual(expect.objectContaining({
                user_id: 'user-123',
                name: userData.name,
                email: userData.email,
            }));
        });

        it('should throw CONFLICT error if user already exists', async () => {
            mockedAuthDataAccess.findUserByEmail.mockResolvedValue(fullUserFromDb);

            await expect(
                authService.registerUser(
                    userData.name,
                    userData.email,
                    userData.phone_number,
                    userData.password
                )
            ).rejects.toThrow('User with this email already exists');

            expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(userData.email);
            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.CONFLICT,
                'User with this email already exists'
            );
            expect(mockedAuthDataAccess.createUser).not.toHaveBeenCalled();
        });

        it('should propagate error from findUserByEmail', async () => {
            const dbError = new Error('DB error findUserByEmail');
            mockedAuthDataAccess.findUserByEmail.mockRejectedValue(dbError);

            await expect(
                authService.registerUser(
                    userData.name,
                    userData.email,
                    userData.phone_number,
                    userData.password
                )
            ).rejects.toThrow('DB error findUserByEmail');
            expect(mockedAuthDataAccess.findUserByEmail).toHaveBeenCalledWith(userData.email);
            expect(mockedThrowError).not.toHaveBeenCalled(); // Original error should propagate
        });

        it('should propagate error from createUser', async () => {
            mockedAuthDataAccess.findUserByEmail.mockResolvedValue(null);
            const dbError = new Error('DB error createUser');
            mockedAuthDataAccess.createUser.mockRejectedValue(dbError);

            await expect(
                authService.registerUser(
                    userData.name,
                    userData.email,
                    userData.phone_number,
                    userData.password
                )
            ).rejects.toThrow('DB error createUser');
            expect(mockedAuthDataAccess.createUser).toHaveBeenCalled();
            expect(mockedThrowError).not.toHaveBeenCalled(); // Original error should propagate
        });
    });

    describe('loginUser', () => {
        const loginCredentials = {
            email: 'test@example.com',
            password: 'password123',
        };

        const userFromDb = {
            user_id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            phone_number: '1234567890',
            password: 'hashedPassword', // In a real scenario, this would be a hash
            role: 'rider' as const,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const token = 'mocked-jwt-token';

        it('should login a user successfully and return user details and token', async () => {
            mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(userFromDb);
            mockedJwtAuthenticator.generateToken.mockReturnValue(token);

            const result = await authService.loginUser(loginCredentials.email, loginCredentials.password);

            expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
                loginCredentials.email,
                loginCredentials.password
            );
            expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalledWith({
                userId: userFromDb.user_id,
                email: userFromDb.email,
                role: userFromDb.role,
            });
            // @ts-ignore
            expect(result.user.password).toBeUndefined();
            expect(result.user).toEqual(expect.objectContaining({
                user_id: userFromDb.user_id,
                email: userFromDb.email,
                name: userFromDb.name,
                role: userFromDb.role,
            }));
            expect(result.token).toBe(token);
            expect(mockedThrowError).not.toHaveBeenCalled();
        });

        it('should throw UNAUTHORIZED error for invalid credentials', async () => {
            mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(null);

            await expect(
                authService.loginUser(loginCredentials.email, 'wrongpassword')
            ).rejects.toThrow('Invalid email or password');

            expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
                loginCredentials.email,
                'wrongpassword'
            );
            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.UNAUTHORIZED,
                'Invalid email or password'
            );
            expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
        });

        it('should throw SERVER_ERROR if user role is missing', async () => {
            const userWithoutRole = { ...userFromDb, role: undefined };
            // @ts-ignore - Intentionally providing a user without a role for testing
            mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(userWithoutRole);

            await expect(
                authService.loginUser(loginCredentials.email, loginCredentials.password)
            ).rejects.toThrow('User role information is missing.');

            expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
                loginCredentials.email,
                loginCredentials.password
            );
            expect(mockedThrowError).toHaveBeenCalledWith(
                ErrorType.SERVER_ERROR,
                'User role information is missing.'
            );
            expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
        });

        it('should propagate error from verifyUserCredentials', async () => {
            const dbError = new Error('DB error verifyUserCredentials');
            mockedAuthDataAccess.verifyUserCredentials.mockRejectedValue(dbError);

            await expect(
                authService.loginUser(loginCredentials.email, loginCredentials.password)
            ).rejects.toThrow('DB error verifyUserCredentials');

            expect(mockedAuthDataAccess.verifyUserCredentials).toHaveBeenCalledWith(
                loginCredentials.email,
                loginCredentials.password
            );
            expect(mockedThrowError).not.toHaveBeenCalled();
            expect(mockedJwtAuthenticator.generateToken).not.toHaveBeenCalled();
        });

        it('should propagate error from generateToken', async () => {
            mockedAuthDataAccess.verifyUserCredentials.mockResolvedValue(userFromDb);
            const tokenError = new Error('Token generation failed');
            mockedJwtAuthenticator.generateToken.mockImplementation(() => {
                throw tokenError;
            });

            await expect(
                authService.loginUser(loginCredentials.email, loginCredentials.password)
            ).rejects.toThrow('Token generation failed');

            expect(mockedJwtAuthenticator.generateToken).toHaveBeenCalledWith({
                userId: userFromDb.user_id,
                email: userFromDb.email,
                role: userFromDb.role,
            });
            expect(mockedThrowError).not.toHaveBeenCalled();
        });
    });
}); 