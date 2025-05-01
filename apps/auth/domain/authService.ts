import { authDataAccess } from "../data-access/authDataAccess";

// Type definition
import type { User as UserType, UserRole } from "../../../models/types";

// JWT Authenticator
import { JwtAuthenticator } from "../../../libraries/authenticator/jwtAuthenticator";

// Unified response handling
import { throwError, ErrorType } from "../../../libraries/responses";

export const registerUser = async (
	name: string,
	email: string,
	phone_number: string,
	password: string
): Promise<Partial<UserType>> => {
	try {
		// Check if user already exists
		const existingUser = await authDataAccess.findUserByEmail(email);

		if (existingUser) {
			throwError(ErrorType.CONFLICT, "User with this email already exists");
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
		return userWithoutPassword;
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
		// Verify user credentials (ensure verifyUserCredentials returns the role)
		const user = await authDataAccess.verifyUserCredentials(email, password);

		if (!user) {
			throwError(ErrorType.UNAUTHORIZED, "Invalid email or password");
		}

		// Ensure role is present on the user object returned from data access
		if (!user.role) {
			console.error(`User ${user.email} found but missing role.`);
			throwError(ErrorType.SERVER_ERROR, "User role information is missing.");
		}

		// Generate JWT Token including the role
		const token = JwtAuthenticator.generateToken({
			userId: user.user_id,
			email: user.email,
			role: user.role
		});

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
