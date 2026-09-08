// const mysql = require('mysql2');

// const db = mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'ecg_system',
//     port:3306
// });

// db.connect((err) => {
//     if (err) {
//         console.error('Database connection failed:', err);
//         return;
//     }

//     console.log('MySQL Connected');
// });
// module.exports = db;

require("dotenv").config();

const { Pool } = require("pg");

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect()
    .then(client => {
        console.log("Supabase PostgreSQL Connected");
        client.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err);
    });

module.exports = db;