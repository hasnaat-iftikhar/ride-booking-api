import { DataTypes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';
import type { RideAttributes, RideCreationAttributes, RideStatus } from './types';
// User and Driver models are not needed here for definition, only for associations which are in models/index.ts

class Ride extends Model<RideAttributes, RideCreationAttributes> implements RideAttributes {
	public ride_id!: string;
	public driver_id!: string | null;
	public user_id!: string;
	public start_time!: Date;
	public end_time!: Date | null;
	public pickup_location!: string;
	public dropoff_location!: string;
	public fare!: number;
	public status!: RideStatus;

	public readonly created_at!: Date;
	public readonly updated_at!: Date;

	public static initialize(sequelize: Sequelize): void {
		Ride.init({
			ride_id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			driver_id: {
				type: DataTypes.UUID,
				allowNull: true, // Stays true
			},
			user_id: {
				type: DataTypes.UUID,
				allowNull: false,
			},
			start_time: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW, // Added default
			},
			end_time: {
				type: DataTypes.DATE,
				allowNull: true, // Stays true
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
				type: DataTypes.ENUM('requested', 'in_progress', 'completed', 'canceled'),
				allowNull: false,
				defaultValue: 'requested', // Added default
			},
			created_at: {
				type: DataTypes.DATE
			},
			updated_at: {
				type: DataTypes.DATE
			}
		}, {
			sequelize,
			tableName: 'rides',
			timestamps: true, // Changed to true
			underscored: true, // Added for consistency
			modelName: 'Ride',
			indexes: [
				{ fields: ['driver_id'] },
				{ fields: ['user_id'] },
				{ fields: ['status'] },
			]
		});
	}

	// Associations are defined in models/index.ts
}

export default Ride;
