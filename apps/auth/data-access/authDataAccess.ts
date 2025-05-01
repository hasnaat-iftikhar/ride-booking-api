import argon2 from "argon2";

// Model
import User from "../../../models/user";

// Type defination
import type { User as UserType } from "../../../models/types";

class AuthDataAccess {
	/**
	 * Find a user by email
	 * @param email User's email address
	 * @returns User object or null if not found
	 */
	async findUserByEmail(email: string): Promise<UserType | null> {
		try {
			const user = await User.findOne({ where: { email } });
			return user ? (user.toJSON() as UserType) : null;
		} catch (error) {
			console.error("Error finding user by email:", error);
			throw error;
		}
	}

	/**
	 * Create a new user in the database
	 * @param userData User data to create
	 * @returns Created user object
	 */
	async createUser(userData: {
		name: string;
		email: string;
		phone_number: string;
		password: string;
	}): Promise<UserType> {
		try {
			const hashedPassword = await argon2.hash(userData.password);

			const user = await User.create({
				...userData,
				password: hashedPassword,
			});

			console.log("user: ", user);

			return user.toJSON() as UserType;
		} catch (error) {
			console.error("Error creating user:", error);
			throw error;
		}
	}

	/**
	 * Verify user credentials for login
	 * @param email User's email
	 * @param password User's password (plain text)
	 * @returns User object if credentials are valid, null otherwise
	 */
	async verifyUserCredentials(
		email: string,
		password: string
	): Promise<UserType | null> {
		try {
			const user = await User.findOne({ where: { email } });

			if (!user) {
				return null;
			}

			// Verify the password
			const passwordValid = await argon2.verify(
				user.get("password") as string,
				password
			);

			if (!passwordValid) {
				return null;
			}

			return user.toJSON() as UserType;
		} catch (error) {
			console.error("Error verifying user credentials:", error);
			throw error;
		}
	}
}

export const authDataAccess = new AuthDataAccess();
