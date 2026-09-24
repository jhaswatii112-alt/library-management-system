const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const bookRoutes = require("./routes/books");
const memberRoutes = require("./routes/members");
const transactionRoutes = require("./routes/transactions");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/books", bookRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/transactions", transactionRoutes);


app.get("/", (req, res) => {
    res.send("Library Management System Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});