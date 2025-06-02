import dotenv from "dotenv";
import express from "express";
import { DatabaseError } from "sequelize";

// Load environment variables FIRST
dotenv.config();

// Rate Limiter
import rateLimit from "express-rate-limit";

// Middlewares
import errorHandler from "./middleware/errorHandler";

// Configurations
import originalSequelize from "./config/database"; // Renamed to avoid conflict
import { syncModels } from "./models"; // Import syncModels

// Controllers
import authRouter from "./apps/auth/entry-points/api/authController";
import riderRouter from "./apps/riders/entry-points/api/riderController";
import driverRouter from "./apps/drivers/entry-points/api/driverController";

// Export app and sequelize for testing purposes
export const app = express();
export const sequelize = originalSequelize; // Export the imported sequelize

// --- Main Application Setup ---
async function startServer() {
  const PORT = process.env.PORT || 3000; // Use environment variable for port

  // --- Core Middlewares ---
  app.use(express.json());

  // --- Rate Limiting ---
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: "Too many login attempts, please try again later",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  // Assuming API prefix /api/v1/
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/driver/login", authLimiter); 

  try {
    // --- Database Connection & Sync (async) ---
    await sequelize.authenticate();
    console.log("Database connected successfully");

    // Sync models using the centralized function
    // For test environment, sync is handled by Jest setup (e.g., sequelize.sync({ force: true }))
    if (process.env.NODE_ENV !== 'test') {
        await syncModels(true); // Pass true for alter: true, or false/omit for default
    }

    // --- API Routers ---
    // Mount routers AFTER DB sync
    // Assuming API prefix /api/v1/
    app.use("/api/v1/auth", authRouter);
    app.use("/api/v1/rider", riderRouter);
    app.use("/api/v1/driver", driverRouter);

    // --- Error Handling Middleware (must be last app.use) ---
    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        errorHandler(err, req, res, next);
      },
    );

    // --- Start Listening (ONLY AFTER sync succeeds and NOT IN TEST ENV) ---
    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    }

  } catch (err) {
    // --- Database/Sync Error Handling ---
    console.error("Failed to start server due to database error:", err);
    if (err instanceof DatabaseError) {
      console.error("SQL:", err.sql);
    } else {
      console.error("Non-DB error during startup:", err);
    }
    // Avoid exiting in test environment, let tests handle errors
    if (process.env.NODE_ENV !== 'test') {
        process.exit(1); 
    }
  }
}

// --- Start the application ---
// Only call startServer directly if not in test environment
// For testing, the test runner will import the app and manage its lifecycle.
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

// Export startServer for potential programmatic use if needed elsewhere, e.g. for specific test setups
// export { startServer }; 
