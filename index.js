const express = require("express");
const app = express();
app.use(express.json());

// Controllers
const authRouter = require('./apps/auth/entry-points/api/authController');
const driverRouter = require('./apps/drivers/entry-points/api/driverController');
const riderRouter = require('./apps/riders/entry-points/api/riderController');

// Configurations
const sequelize = require("./config/database");

// Database connection
sequelize.authenticate().then(() => {
    console.log("Database connected successfully");
}).catch(err => {
    console.log("Error: ", err);
});

// Mount the routers with base paths
app.use('/auth', authRouter);
app.use('/drivers', driverRouter);
app.use('/riders', riderRouter);

// Start the server
app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});