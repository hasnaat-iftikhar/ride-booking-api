import express, { Request, Response, NextFunction } from "express";

// Services
import { registerUser } from "../../domain/authService";

// Type definitions
import { User as UserType } from "../../../../models/types";

const router = express.Router();

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone_number, password } = req.body;

    try {
        const user: UserType = await registerUser(name, email, phone_number, password);

        res.status(201).json(user);
    } catch (error) {
        console.error("Error saving user:", error);
        next(error);
    }
});

export default router;