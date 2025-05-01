import { Sequelize } from "sequelize"
import { up } from "../migrations/01-init-schema"

async function runMigrations() {
  // Create a new Sequelize instance
  const sequelize = new Sequelize(process.env.DB_NAME || "", process.env.DB_USER || "", process.env.DB_PASSWORD || "", {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 5432,
    dialect: "postgres",
    logging: console.log,
  })

  try {
    // Connect to the database
    await sequelize.authenticate()
    console.log("Connected to the database")

    // Run migrations
    console.log("Running migrations...")
    await up(sequelize.getQueryInterface())
    console.log("Migrations completed successfully")

    // Close the connection
    await sequelize.close()
  } catch (error) {
    console.error("Error running migrations:", error)
    process.exit(1)
  }
}

// Run the migrations
runMigrations()
