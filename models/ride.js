const { DataTypes, Sequelize } = require("sequelize");

const Ride = Sequelize.define(
	"Ride",
	{
		ride_id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		driver_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
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
	},
	{
		tableName: "rides",
		timestamps: false,
	}
);

// Define relationships
Ride.belongsTo(Driver, { foreignKey: "driver_id" });
Ride.belongsTo(User, { foreignKey: "user_id" });

module.exports = Ride;
