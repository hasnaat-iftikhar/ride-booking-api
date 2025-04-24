// middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ErrorType } from '../libraries/responses';

interface CustomError extends Error {
  errorType?: ErrorType;
  statusCode?: number;
  details?: unknown;
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  console.error('Error caught by middleware:', err);

  // Default to server error if type not specified
  const errorType = err.errorType || ErrorType.SERVER_ERROR;
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || undefined;

  // Send standardized error response
  res.status(statusCode).json(
    createErrorResponse(errorType, message, details)
  );
};

export default errorHandler;