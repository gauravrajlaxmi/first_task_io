const express = require("express");
const cors = require("cors");
 
const app = express();
 
app.use(cors());
 
app.get("/api/message", (req, res) => {
res.json({
message: "Hello from NodeJS Backend - Version 1"
});
});
 
const PORT = 5000;
 
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
