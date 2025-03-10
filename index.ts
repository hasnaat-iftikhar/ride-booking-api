import express from 'express';
import { Error } from 'sequelize';

// Middlewares
import errorHandler from './middleware/errorHandler';

// Configurations
import sequelize from "./config/database";

// Controllers
import authRouter from './apps/auth/entry-points/api/authController';
import riderRouter from './apps/riders/entry-points/api/riderController';

const app = express();
app.use(express.json());

// Database connection
sequelize.authenticate().then(() => {
    console.log("Database connected successfully");

    // Sync all models with the database
    return sequelize.sync();
}).catch((err: Error) => {
    console.error("Database connection error:", err);
    console.error("SQL:", (err as any).sql || "No SQL available");
});

// Endpoints
app.use('/auth', authRouter);
app.use('/rider', riderRouter);

// Middlewares
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler(err, req, res, next);
});

// Start the server
app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});