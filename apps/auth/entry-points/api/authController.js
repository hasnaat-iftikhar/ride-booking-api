const express = require("express");
const router = express.Router();

const authService = require("../../domain/authService");

router.post("/register", async (req, res) => {
    const { name, email, phone_number, password } = req.body;

    try {
        const user = authService.registerUser(name, email, phone_number, password);

        res.status(201).json(user);
    } catch(error) {
        res.status(400).json({ error: error.message })
    }
});

module.exports = router;