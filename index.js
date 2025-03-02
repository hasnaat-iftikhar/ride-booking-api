const express = require("express");
const app = express();
app.use(express.json());

// Components
const { register, login } = require('./apps/auth/authController');

// Endpoints
app.post('/register', register);
app.post('/login', login);

// Start the server
app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});