import dotenv from "dotenv"
import express from "express"
import { DatabaseError } from "sequelize"

// Load environment variables FIRST
dotenv.config()

// Rate Limiter
import rateLimit from "express-rate-limit"

// Middlewares
import errorHandler from "./middleware/errorHandler"

// Configurations
import sequelize from "./config/database"

// Controllers
import authRouter from "./apps/auth/entry-points/api/authController"
import riderRouter from "./apps/riders/entry-points/api/riderController"
import driverRouter from "./apps/drivers/entry-points/api/driverController"

// --- Main Application Setup ---
async function startServer() {
  const app = express()
  const PORT = process.env.PORT || 3000 // Use environment variable for port

  // --- Core Middlewares ---
  app.use(express.json())

  // --- Rate Limiting ---
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: "Too many login attempts, please try again later",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  })
  app.use("/auth/login", authLimiter)
  app.use("/driver/login", authLimiter)

  try {
    // --- Database Connection & Sync (async) ---
    await sequelize.authenticate()
    console.log("Database connected successfully")

    // WARNING: sequelize.sync() is not recommended for production!
    // Using { alter: true } for development to add missing columns/indexes.
    // Replace with migrations for production.
    await sequelize.sync({ alter: true })
    console.log("Database synchronized (development - alter: true)")

    // --- API Routers ---
    // Mount routers AFTER DB sync
    app.use("/auth", authRouter)
    app.use("/rider", riderRouter)
    app.use("/driver", driverRouter)

    // --- Error Handling Middleware (must be last app.use) ---
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      errorHandler(err, req, res, next)
    })

    // --- Start Listening (ONLY AFTER sync succeeds) ---
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  } catch (err) {
    // --- Database/Sync Error Handling ---
    console.error("Failed to start server due to database error:", err)
    if (err instanceof DatabaseError) {
      console.error("SQL:", err.sql)
    } else {
      console.error("Non-DB error during startup:", err)
    }
    process.exit(1) // Exit if DB connection/sync fails
  }
}

// --- Start the application ---
startServer()
