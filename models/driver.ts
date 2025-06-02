import { DataTypes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';
import type { DriverAttributes, DriverCreationAttributes } from './types';

class Driver extends Model<DriverAttributes, DriverCreationAttributes> implements DriverAttributes {
    public driver_id!: string;
    public name!: string;
    public email!: string;
    public phone_number!: string;
    public license_number!: string;
    public status!: 'online' | 'busy' | 'offline';
    public password!: string;

    public readonly created_at!: Date;
    public readonly updated_at!: Date;

    public static initialize(sequelize: Sequelize): void {
        Driver.init({
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
                type: DataTypes.ENUM('online', 'offline', 'busy'),
                allowNull: false,
                defaultValue: 'offline',
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            created_at: {
                type: DataTypes.DATE
            },
            updated_at: {
                type: DataTypes.DATE
            }
        }, {
            sequelize,
            tableName: 'drivers',
            timestamps: true,
            underscored: true,
            modelName: 'Driver',
        });
    }

    // Associations will be defined in models/index.ts
}

export default Driver;
