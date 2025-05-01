import { type QueryInterface, DataTypes } from "sequelize"

// This migration ensures the database schema matches our models
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Create users table
  await queryInterface.createTable(
    "users",
    {
      user_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("rider", "admin"),
        allowNull: false,
        defaultValue: "rider",
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }
  )

  // Create drivers table
  await queryInterface.createTable(
    "drivers",
    {
      driver_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      license_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      status: {
        // Use STRING instead of ENUM to avoid conflicts
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }
  )

  // Create rides table
  await queryInterface.createTable(
    "rides",
    {
      ride_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      driver_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "drivers",
          key: "driver_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      pickup_location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      dropoff_location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("requested", "in_progress", "completed", "canceled"),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }
  )

  // Add indexes
  await queryInterface.addIndex("users", ["role"])
  await queryInterface.addIndex("rides", ["driver_id"])
  await queryInterface.addIndex("rides", ["user_id"])
  await queryInterface.addIndex("rides", ["status"])
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await queryInterface.dropTable("rides")
  await queryInterface.dropTable("drivers")
  await queryInterface.dropTable("users")
}
