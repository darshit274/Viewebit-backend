require('dotenv').config();
module.exports = {
  "development": {
    "username": process.env.DB_USERNAME || "root",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME || "MockTale",
    "host": process.env.DB_HOST,
    "dialect": process.env.DB_DIALECT || "mysql",
  },
  "test": {
    "username": process.env.DB_USERNAME || "root",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME || "MockTale",
    "host": process.env.DB_HOST,
    "dialect": process.env.DB_DIALECT || "mysql",
  },
  "production": {
    "username": process.env.DB_USERNAME || "root",
    "password": process.env.DB_PASSWORD || null,
    "database": process.env.DB_NAME || "MockTale",
    "host": process.env.DB_HOST,
    "dialect": process.env.DB_DIALECT || "mysql",
  },
}
