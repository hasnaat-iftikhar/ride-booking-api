class AppError extends Error {
    httpCode: number;
    description: string;
    isOperational: boolean;

    constructor(name: string, httpCode: number, description: string, isOperational: boolean) {
        super(description);
        this.name = name;
        this.httpCode = httpCode;
        this.description = description;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
};

const appError = (name: string, httpCode: number, description: string, isOperational: boolean) => {
    throw new AppError(name, httpCode, description, isOperational);
};

export {
    AppError,
    appError
}