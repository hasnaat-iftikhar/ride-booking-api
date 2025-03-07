import express, { Request, Response, NextFunction } from "express";

// Services
import { loginUser, registerUser } from "../../domain/authService";

// Type definitions
import { User as UserType } from "../../../../models/types";

const router = express.Router();

router.post(
	"/register",
	async (req: Request, res: Response, next: NextFunction) => {
		const { name, email, phone_number, password } = req.body;

		try {
			const user: UserType = await registerUser(
				name,
				email,
				phone_number,
				password
			);

			res.status(201).json(user);
		} catch (error) {
			console.error("Registration error:", error);
			next(error);
		}
	}
);

router.post(
	"/login",
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, password } = req.body;

		try {
			const result = await loginUser(email, password);
            
			res.status(200).json(result);
		} catch (error) {
			console.error("Login error:", error);
			next(error);
		}
	}
);

export default router;
