import { Sequelize } from 'sequelize';
import sequelize from '../config/database';
import User from './user';
import Driver from './driver';
import Ride from './ride';

// Initialize models
User.initialize(sequelize);
Driver.initialize(sequelize);
Ride.initialize(sequelize);

// Define relationships/associations
// User - Ride (One-to-Many)
User.hasMany(Ride, {
  foreignKey: 'user_id',
  as: 'rides',
});
Ride.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Driver - Ride (One-to-Many)
Driver.hasMany(Ride, {
  foreignKey: 'driver_id',
  as: 'rides',
});
Ride.belongsTo(Driver, {
  foreignKey: 'driver_id',
  as: 'driver',
});

// Function to sync all models (optional, can be called from main app setup)
const syncModels = async (alter = false) => {
  await sequelize.sync({ alter }); // Or { force: true } for development if needed
  console.log('All models were synchronized successfully.');
};

export { sequelize, User, Driver, Ride, syncModels }; 