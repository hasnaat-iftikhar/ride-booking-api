const express = require("express");
const app = express();

// A simple hello world endpoint
app.get("/hello", (req, res) => {
    res.send("Hello world!")
});

// Start the server
app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});