import { Sequelize } from "sequelize"

// Fetch configuration from environment variables
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 5432; // Default PG port
const nodeEnv = process.env.NODE_ENV || 'development';

// Validate required environment variables
if (!dbName || !dbUser || !dbPassword || !dbHost) {
    console.error("FATAL ERROR: Missing required database environment variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST).");
    process.exit(1); // Exit if essential config is missing
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: nodeEnv === 'development' ? console.log : false, // Log queries in dev
    pool: { // Basic connection pool settings
        max: 5, // Max number of connection in pool
        min: 0, // Min number of connection in pool
        acquire: 30000, // Max time (ms) that pool will try to get connection before throwing error
        idle: 10000 // Max time (ms) a connection can be idle before being released
    }
});

export default sequelize;