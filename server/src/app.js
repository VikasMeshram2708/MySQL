const express = require("express");
require("dotenv").config();

const app = express();
const morgan = require("morgan");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// middlewares
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(morgan("dev"));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Adjust the maximum number of connections in the pool
  queueLimit: 0, // Unlimited queue for connections
});

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Hello, World!",
  });
});

// Create a User
app.post("/signup", async (req, res) => {
  try {
    const reqBody = req.body;
    const { name, email, password } = reqBody;

    if (!name.trim() || !email.trim() || !password.trim())
      throw new Error("All the fields are required.");

    console.log("data", reqBody);

    // get a connection from the pool
    const connection = await pool.getConnection();

    try {
      // store into the DB
      const sql = `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50),
        email VARCHAR(50) UNIQUE,
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;

      await connection.query(sql);

      const dataQuery = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

      // hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Check if the email is already in use
      const uniqueEmailQuery = `SELECT * FROM users WHERE email = ?`;
      const [emailExists] = await connection.query(uniqueEmailQuery, [email]);

      if (emailExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use.",
        });
      }

      await connection.query(dataQuery, [
        name,
        email,
        hashedPassword,
      ]);

      res.json({
        success: true,
        message: "User registered successfully.",
      });
    } finally {
      connection.release();
      console.log('Connection released.')
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

module.exports = app;
