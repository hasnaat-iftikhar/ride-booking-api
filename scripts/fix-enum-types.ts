import { Sequelize, DataTypes, QueryTypes } from "sequelize"

async function fixEnumTypes() {
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

    // Get the query interface
    const queryInterface = sequelize.getQueryInterface()

    // Check if the driver_status enum exists
    const enums = await sequelize.query<{ typname: string }>( 
        "SELECT typname FROM pg_type WHERE typname = 'driver_status'", 
        { type: QueryTypes.SELECT } 
    );

    if (enums.length > 0) {
      console.log("Found driver_status enum, fixing...")

      // 1. Create a temporary column
      await queryInterface.addColumn("drivers", "status_new", {
        type: DataTypes.STRING,
        allowNull: true,
      })

      // 2. Copy data from status to status_new
      await sequelize.query("UPDATE drivers SET status_new = status::text")

      // 3. Drop the status column
      await queryInterface.removeColumn("drivers", "status")

      // 4. Rename status_new to status
      await queryInterface.renameColumn("drivers", "status_new", "status")

      // 5. Make status NOT NULL
      await sequelize.query("ALTER TABLE drivers ALTER COLUMN status SET NOT NULL")

      console.log("Fixed drivers.status column")
    } else {
      console.log("driver_status enum not found, no fix needed")
    }

    // Close the connection
    await sequelize.close()
    console.log("Database connection closed")
  } catch (error) {
    console.error("Error fixing enum types:", error)
    process.exit(1)
  }
}

// Run the fix
fixEnumTypes()
