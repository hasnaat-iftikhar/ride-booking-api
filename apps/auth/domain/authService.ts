import jwt from "jsonwebtoken";

// Type defination
import { User as UserType } from "../../../models/types";

// Libraries
import { appError } from "../../../libraries/errors/AppError";

// Utility files
import { commonError } from "../../../libraries/errors/errors";

// Enum
import { CommonErrorType } from "../../../libraries/errors/errors.enum";
import { authDataAccess } from "../data-access/authDataAccess";

// ENV Variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const registerUser = async (
	name: string,
	email: string,
	phone_number: string,
	password: string
): Promise<UserType> => {
	try {
		// Check if user already exists
		const existingUser = await authDataAccess.findUserByEmail(email);

		if (existingUser) {
			return appError(
				"User Already Exists Error",
				commonError(CommonErrorType.CONFLICT).statusCode,
				commonError(CommonErrorType.CONFLICT).errorName,
				true
			);
		}

		// Create new user
		const newUser = await authDataAccess.createUser({
			name,
			email,
			phone_number,
			password,
		});

		// Remove password from returned user object
		const { password: _, ...userWithoutPassword } = newUser;
		return userWithoutPassword as UserType;
	} catch (error) {
		console.error("Error in registerUser service:", error);
		throw error;
	}
};

export const loginUser = async (
	email: string,
	password: string
): Promise<{ user: Partial<UserType>; token: string }> => {
	try {
		// Verify user credentials
		const user = await authDataAccess.verifyUserCredentials(email, password);

		if (!user) {
			return appError(
				"Invalid Credentials Error",
				commonError(CommonErrorType.UN_AUTHORIZED).statusCode,
				commonError(CommonErrorType.UN_AUTHORIZED).errorName,
				true
			);
		}

		// Generate JWT Token
		const token = jwt.sign(
			{
				user_id: user.user_id,
				email: user.email,
			},
			JWT_SECRET,
			{
				expiresIn: "24h",
			}
		);

		// Remove password from returned user object
		const { password: _, ...userWithoutPassword } = user;

		return {
			user: userWithoutPassword,
			token,
		};
	} catch (error) {
		console.error("Error in loginUser service:", error);
		throw error;
	}
};
