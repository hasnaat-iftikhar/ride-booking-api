import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const Driver = sequelize.define(
	"Driver",
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
			type: DataTypes.ENUM("online", "offline", "busy"),
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
	},
	{
		tableName: "drivers",
		timestamps: false,
	}
);

export default Driver;