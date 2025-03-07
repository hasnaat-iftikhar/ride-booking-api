import { Request, Response, NextFunction } from 'express';
import { Error } from 'sequelize';

// Type defination
import { AppError } from '../libraries/errors/AppError';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.httpCode).json({ error: err.description });
    };
  
    // Log unexpected errors and send a generic response
    console.error(err.stack);
    
    res.status(500).json({ error: 'Internal server error' });
};

export default errorHandler;