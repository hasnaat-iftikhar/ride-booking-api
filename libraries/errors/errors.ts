import { appError } from "./AppError";

// Enum type
import type { CommonErrorType } from "./errors.enum";

const commonErrorMapping = {
    notFound: { statusCode: 404, errorName: "Resource Not Found" },
    unauthorized: { statusCode: 401, errorName: "Un-authorized" },
    badRequest: { statusCode: 400, errorName: "Bad Request" },
    forbidden: { statusCode: 403, errorName: "Forbidden" },
    conflict: { statusCode: 409, errorName: "Conflict" },
    serverError: { statusCode: 500, errorName: "Internal Server Error" },
    unprocessable: { statusCode: 422, errorName: "Unprocessable Entity" },
};

export const commonError = (key: CommonErrorType) => {
    const error = commonErrorMapping[key];

    if (!error) {
        return appError(
            "Invalid Error Type",
            500,
            "The provided error type is not recognized",
            true
        );
	}

	return error;
};

