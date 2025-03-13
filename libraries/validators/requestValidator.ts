import type { NextFunction, Request, Response } from 'express';
import type Joi from 'joi';

// Error Library
import { appError } from '../errors/AppError';
import { commonError } from '../errors/errors';
import { CommonErrorType } from '../errors/errors.enum';

export const RequestValidator = {
    validate: (schema: Joi.ObjectSchema) => {
        return (req: Request, res: Response, next: NextFunction) => {
            const { error } = schema.validate(req.body, { abortEarly: false });

            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');

                return appError(
                    errorMessage,
                    commonError(CommonErrorType.BAD_REQUEST).statusCode,
                    commonError(CommonErrorType.BAD_REQUEST).errorName,
                    true
                );
            }

            next();
        }
    }
};