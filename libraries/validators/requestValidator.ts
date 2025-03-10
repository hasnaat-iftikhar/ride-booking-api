import { NextFunction, Request } from 'express';
import Joi from 'joi';

// Error Library
import { appError } from '../errors/AppError';
import { commonError } from '../errors/errors';
import { CommonErrorType } from '../errors/errors.enum';

export class RequestValidator {
    static validate(schema: Joi.ObjectSchema) {
        return (req: Request) => {
            const { error } = schema.validate(req.body, { abortEarly: false });

            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');

                return appError(
                    'Validation Error',
                    commonError(CommonErrorType.BAD_REQUEST).statusCode,
                    errorMessage,
                    true
                );
            }
        }
    }
};