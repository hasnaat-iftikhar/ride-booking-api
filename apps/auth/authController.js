const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

// Temporary user storage - Will replace it with db later
const users = [];

async function register(req, res) {
    const {
        username,
        password
    } = req.body;

    if(!username || !password) {
        return res.status(400).send('Username and password are required');
    };

    const hashedPassword = await argon2.hash(password);
    users.push({ username, password: hashedPassword });

    return res.status(201).send('User registered')
};

async function login(req, res) {
    const {
        username,
        password
    } = req.body;

    const user = users.find(u => u.username == username);

    if(!user) {
        return res.status(401).send('User not found')
    };

    const isValid = await argon2.verify(user.password, password);

    if(!isValid) {
        return res.status(401).send('Invalid credentials')
    };

    const token = jwt.sign({ username }, 'your-secret-key', { expiresIn: '1h' });

    return res.json({ token });
}

module.exports = {
    register,
    login
};