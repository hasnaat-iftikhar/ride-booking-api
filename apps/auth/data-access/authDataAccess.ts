import argon2 from "argon2";

// Models - Updated import
import { User } from "../../../models"; // Import from centralized models/index.ts

// Type definition (UserType can now potentially come from User model itself if attributes are well-defined)
// Or continue using the one from models/types if preferred for separation
import type { UserAttributes as UserType } from "../../../models/types"; // Using UserAttributes for the return type of DB ops
import type { UserCreationAttributes } from "../../../models/types";

class AuthDataAccess {
	/**
	 * Find a user by email
	 * @param email User's email address
	 * @returns User object or null if not found
	 */
	async findUserByEmail(email: string): Promise<UserType | null> {
		const user = await User.findOne({ where: { email } });
		return user ? (user.toJSON() as UserType) : null;
	}

	/**
	 * Create a new user in the database
	 * @param userData User data to create. Matches UserCreationAttributes shape.
	 * @returns Created user object
	 */
	async createUser(userData: Omit<UserCreationAttributes, 'role' | 'user_id' | 'password'> & { password_plaintext: string }): Promise<UserType> {
		const hashedPassword = await argon2.hash(userData.password_plaintext);

		// Construct the data for User.create, matching UserCreationAttributes
		const createData: UserCreationAttributes = {
			name: userData.name,
			email: userData.email,
			phone_number: userData.phone_number,
			password: hashedPassword,
			role: 'rider', // Default role for this creation method
		};

		const user = await User.create(createData);

		return user.toJSON() as UserType;
	}

	/**
	 * Verify user credentials for login
	 * @param email User's email
	 * @param password User's password (plain text)
	 * @returns User object if credentials are valid, null otherwise
	 */
	async verifyUserCredentials(
		email: string,
		password_plaintext: string
	): Promise<UserType | null> {
		const userInstance = await User.findOne({ where: { email } });

		if (!userInstance) {
			return null;
		}

		// Verify the password
		const passwordValid = await argon2.verify(
			userInstance.password, // Direct access to property from class model
			password_plaintext
		);

		if (!passwordValid) {
			return null;
		}

		return userInstance.toJSON() as UserType;
	}
}

export const authDataAccess = new AuthDataAccess();
