require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("./db");

const adminName = "System Administrator";
const email = "elaz@elaz.com";
const password = process.env.ADMIN_PASSWORD;

async function createAdmin() {

    try {

        // Check whether admin already exists
        const checkSql = `
            SELECT id
            FROM admins
            WHERE email = ?
        `;

        db.query(
            checkSql,
            [email],
            async (err, results) => {

                if (err) {
                    console.error(
                        "Error checking admin:",
                        err
                    );

                    db.end();
                    return;
                }

                if (results.length > 0) {

                    console.log(
                        "Admin already exists."
                    );

                    db.end();
                    return;
                }

                // Hash password
                const passwordHash =
                    await bcrypt.hash(password, 10);

                // Create admin
                const insertSql = `
                    INSERT INTO admins
                    (
                        admin_name,
                        email,
                        password_hash
                    )
                    VALUES (?, ?, ?)
                `;

                db.query(
                    insertSql,
                    [
                        adminName,
                        email,
                        passwordHash
                    ],
                    (err, result) => {

                        if (err) {

                            console.error(
                                "Admin creation error:",
                                err
                            );

                            db.end();
                            return;
                        }

                        console.log(
                            "Admin created successfully."
                        );

                        console.log(
                            "Admin ID:",
                            result.insertId
                        );

                        console.log(
                            "Email:",
                            email
                        );
                        db.end();
                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "Unexpected error:",
            error
        );

        db.end();
    }
}

createAdmin();