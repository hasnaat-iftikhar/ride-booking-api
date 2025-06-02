// __mocks__/libraries/responses/index.ts

// Re-export ErrorType from the actual module, adjusting the relative path
export { ErrorType } from '../../../libraries/responses/index'; // Path relative to this __mocks__ file

// This is our mock for the throwError function
export const throwError = jest.fn((type, message, details) => {
  const error = new Error(message || 'Mocked error from manual mock');
  // @ts-ignore // Allow adding custom properties to the error object
  error.errorType = type;
  // @ts-ignore
  error.details = details;
  // @ts-ignore
  error.statusCode = 500; // Default, can be mapped from type if needed in mock
  throw error;
}); 