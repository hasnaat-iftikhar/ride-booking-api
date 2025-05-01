import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

const User = sequelize.define('User', {
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
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'users',
    timestamps: false,
    indexes: [
        { fields: ['role'] }
    ]
});

export default User;