import { DataTypes, Model } from 'sequelize';
import type { Sequelize } from 'sequelize';
import type { UserAttributes, UserCreationAttributes } from './types';

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public user_id!: string;
    public name!: string;
    public email!: string;
    public phone_number!: string;
    public password!: string;
    public role!: 'rider' | 'admin';

    // Timestamps are managed by Sequelize due to `timestamps: true`
    // and `underscored: true` will make them `created_at` and `updated_at`
    public readonly created_at!: Date;
    public readonly updated_at!: Date;

    public static initialize(sequelize: Sequelize): void {
        User.init({ // Changed from this.init to User.init to avoid linter warning, though `this` is also fine.
            user_id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            email: {
                type: DataTypes.STRING(255),
                unique: true,
                allowNull: false
            },
            phone_number: {
                type: DataTypes.STRING(20),
                allowNull: false
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM('rider', 'admin'),
                allowNull: false,
                defaultValue: 'rider'
            },
            created_at: {
                type: DataTypes.DATE
            },
            updated_at: {
                type: DataTypes.DATE
            }
        }, {
            sequelize,
            tableName: 'users',
            timestamps: true,
            underscored: true, // This will create 'created_at' and 'updated_at' columns
            modelName: 'User',
            indexes: [
                { fields: ['role'] }
            ]
        });
    }

    // Associations will be defined in models/index.ts
}

export default User; // Changed back to default export