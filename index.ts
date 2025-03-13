import dotenv from 'dotenv';
import express from 'express';
import { DatabaseError } from 'sequelize';

// Load environment variables
dotenv.config();

// Rate Limiter
import rateLimit from "express-rate-limit";

// Middlewares
import errorHandler from "./middleware/errorHandler";

// Configurations
import sequelize from "./config/database";

// Controllers
import authRouter from './apps/auth/entry-points/api/authController';
import riderRouter from './apps/riders/entry-points/api/riderController';
import driverRouter from './apps/drivers/entry-points/api/driverController';

const app = express();
app.use(express.json());

// Rate limiting to sensitive routes
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 requests per windowMs
	message: "Too many login attempts, please try again later",
});

app.use("/auth/login", authLimiter);
app.use("/driver/login", authLimiter);

// Database connection
sequelize.authenticate().then(() => {
    console.log("Database connected successfully");

    // Sync all models with the database
    return sequelize.sync();
}).catch((err: unknown) => {
    console.error("Database connection error:", err);
    if (err instanceof DatabaseError) {
        console.error("SQL:", err.sql);
    } else {
        console.error("No SQL available");
    }
});

// Endpoints
app.use('/auth', authRouter);
app.use('/rider', riderRouter);
app.use('/driver', driverRouter);

// Middlewares
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler(err, req, res, next);
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});