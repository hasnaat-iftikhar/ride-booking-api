const { Sequelize } = require("sequelize");

const sequelize = new Sequelize('ride_booking_db', 'api_admin', 'Pakistanzindabad@123', {
    host: "localhost",
    dialect: 'postgres',
    logging: false
});

module.exports = sequelize;