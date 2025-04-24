import type { NextFunction, Request, Response } from "express";
import type Joi from "joi";
import { throwError, ErrorType } from "../responses";

export const RequestValidator = {
	validate: (schema: Joi.ObjectSchema) => {
		return (req: Request, res: Response, next: NextFunction) => {
			const { error } = schema.validate(req.body, { abortEarly: false });

			if (error) {
				const errorMessage = error.details
					.map((detail) => detail.message)
					.join(", ");

				throwError(ErrorType.VALIDATION_ERROR, errorMessage, error.details);
			}

			next();
		};
	},
};
