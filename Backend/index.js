const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const db = require('./db');


console.log("Loading mqtt.js...");
const mqttHandler = require('./mqtt');
console.log("mqtt.js loaded.");
const app = express();


app.use(cors({
    origin:[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    credentials:true
}));

app.use(express.json());

app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false,  // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 80,
        sameSite: 'lax' }
        }
));

// Log every incoming request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.post("/admin-login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    const sql = `
        SELECT
            id,
            admin_name,
            email,
            password_hash
        FROM admins
        WHERE email = ?
    `;

    db.query(
        sql,
        [email],
        async (err, results) => {

            if (err) {
                console.error("Admin login error:", err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    error: "Invalid login details"
                });
            }

            const admin = results[0];

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    admin.password_hash
                );

            if (!passwordCorrect) {
                return res.status(401).json({
                    error: "Invalid login details"
                });
            }

            req.session.admin = {
                admin_id: admin.id,
                admin_name: admin.admin_name,
                email: admin.email
            };

            console.log(
                "Admin logged in:",
                req.session.admin
            );

            res.json({
                message: "Admin login successful",
                admin: {
                    admin_name: admin.admin_name,
                    email: admin.email
                }
            });

        }
    );

});

function requireAdminLogin(req, res, next) {

    if (!req.session.admin) {
        return res.status(401).json({
            error: "Admin login required"
        });
    }

    next();
}

function generateOrganizationCode(organizationName) {

    // Remove common words that don't help identify
    // the organization.
    const ignoredWords = [
        "the",
        "of",
        "and",
        "for",
        "a",
        "an"
    ];

    const words = organizationName
        .trim()
        .split(/\s+/)
        .filter(word => {
            return !ignoredWords.includes(
                word.toLowerCase()
            );
        });

    let prefix = "";

    if (words.length === 1) {

        // Example:
        // Medplus → MEDP
        prefix = words[0]
            .replace(/[^a-zA-Z]/g, "")
            .substring(0, 4)
            .toUpperCase();

    } else {

        // Take first letter of each important word
        // Example:
        // University College Hospital
        // → UCH
        prefix = words
            .map(word =>
                word
                    .replace(/[^a-zA-Z]/g, "")
                    .charAt(0)
                    .toUpperCase()
            )
            .join("");

        // Keep prefix manageable
        prefix = prefix.substring(0, 5);
    }

    // Generate 4 random characters
    const randomPart = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();

    return `${prefix}-${randomPart}`;
}
app.post(
    "/admin/organizations",
    requireAdminLogin,
    (req, res) => {

        const {
            organization_name
        } = req.body;

        if (!organization_name) {

            return res.status(400).json({
                error: "Organization name is required"
            });

        }

        const organizationCode =
            generateOrganizationCode(
                organization_name
            );

        const insertSql = `
            INSERT INTO organizations
            (
                organization_code,
                organization_name
            )
            VALUES (?, ?)
        `;

        db.query(
            insertSql,
            [
                organizationCode,
                organization_name.trim()
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Organization creation error:",
                        err
                    );

                    return res.status(500).json({
                        error: err.sqlMessage
                    });

                }

                console.log(
                    "Organization created:",
                    organization_name
                );

                console.log(
                    "Organization code:",
                    organizationCode
                );

                res.status(201).json({

                    message:
                        "Organization created successfully",

                    organization: {

                        id:
                            result.insertId,

                        organization_name:
                            organization_name.trim(),

                        organization_code:
                            organizationCode

                    }

                });

            }
        );

    }
);

app.post("/doctor-register", async (req, res) => {

    const {
        organization_code,
        doctor_name,
        email,
        password
    } = req.body;

    if (
        !organization_code ||
        !doctor_name ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            error: "All fields are required"
        });
    }
    try {
        // Find organization
        const organizationSql = `
            SELECT id, organization_name, organization_code
            FROM organizations
            WHERE organization_code = ?
        `;
        db.query(
            organizationSql,
            [organization_code],
            async (err, organizations) => {

                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        error: "Database error"
                    });
                }

                if (organizations.length === 0) {
                    return res.status(404).json({
                        error: "Organization not found"
                    });
                }
                const organization = organizations[0];
                // Check whether doctor already exists
                const checkDoctorSql = `
                    SELECT id
                    FROM doctors
                    WHERE organization_code = ?
                    AND email = ?
                `;
                db.query(
                    checkDoctorSql,
                    [organization_code, email],
                    async (err, doctors) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                error: "Database error"
                            });
                        }

                        if (doctors.length > 0) {
                            return res.status(409).json({
                                error: "Doctor already registered"
                            });
                        }


                        // Hash password
                        const passwordHash =
                            await bcrypt.hash(password, 10);


                        const insertSql = `
                            INSERT INTO doctors
                            (
                                organization_code,
                                doctor_name,
                                email,
                                password_hash
                            )
                            VALUES (?, ?, ?, ?)
                        `;

                        db.query(
                            insertSql,
                            [
                                organization.organization_code,
                                doctor_name,
                                email,
                                passwordHash
                            ],
                            (err, result) => {

                                if (err) {
                                    console.error(err);

                                    return res.status(500).json({
                                        error: "Could not register doctor"
                                    });
                                }

                                res.status(201).json({
                                    message: "Doctor registered successfully",
                                    doctor_id: result.insertId
                                });

                            }
                        );

                    }
                );

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Registration failed"
        });

    }

});
app.post("/doctor-login", (req, res) => {

    const {
        organization_code,
        email,
        password
    } = req.body;

    if (!organization_code || !email || !password) {

        return res.status(400).json({
            error: "Organization, email and password are required"
        });

    }


    const sql = `
        SELECT
            doctors.id AS doctor_id,
            doctors.doctor_name,
            doctors.email,
            doctors.password_hash,

            organizations.id AS organization_id,
            organizations.organization_name,
            organizations.organization_code

        FROM doctors

        JOIN organizations
        ON doctors.organization_code = organizations.organization_code

        WHERE organizations.organization_code = ?
        AND doctors.email = ?
    `;


    db.query(
        sql,
        [organization_code, email],
        async (err, results) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    error: "Database error"
                });

            }


            if (results.length === 0) {

                return res.status(401).json({
                    error: "Invalid login details"
                });

            }


            const doctor = results[0];


            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    doctor.password_hash
                );


            if (!passwordCorrect) {

                return res.status(401).json({
                    error: "Invalid login details"
                });

            }


            // Save authenticated doctor
            // inside the session

            req.session.doctor = {

                doctor_id: doctor.doctor_id,

                doctor_name:
                    doctor.doctor_name,

                organization_id:
                    doctor.organization_id,

                organization_name:
                    doctor.organization_name,

                organization_code:
                    doctor.organization_code

            };


            console.log(
                "Doctor logged in:",
                req.session.doctor
            );
req.session.save((err) => {

    if (err) {
        console.error("SESSION SAVE ERROR:", err);

        return res.status(500).json({
            error: "Could not save login session"
        });
    }

    console.log("Doctor session saved successfully");  

            res.json({

                message:
                    "Login successful",

                doctor: {
    doctor_name: doctor.doctor_name,
    organization_name:doctor.organization_name,
    organization_code: doctor.organization_code
                }

            });

        }
    );
        });
});
function requireDoctorLogin(req, res, next) {

    console.log("========== requireDoctorLogin ==========");
    console.log("Session ID:", req.sessionID);
    console.log("Session:", req.session);
    console.log("Doctor:", req.session.doctor);

    if (!req.session.doctor) {

        console.log("❌ DOCTOR SESSION NOT FOUND");

        return res.status(401).json({
            error: "Doctor login required"
        });
    }

    console.log("✅ DOCTOR SESSION FOUND");
    console.log("Organization:", req.session.doctor.organization_code);
    console.log("========================================");

    next();
}
// function requireDoctorLogin(req, res, next) {

//     if (!req.session.doctor) {
//         return res.status(401).json({
//             error: "Doctor login required"
//         });
//     }

//     next();
// }
// app.get("/patients", (req, res) => {

//     const { patient_id } = req.query;

//     if (!patient_id) {
//         return res.status(400).json({
//             error: "patient_id is required"
//         });
//     }

//     const sql = `
//         SELECT *
//         FROM patients
//         WHERE patient_id = ?
//     `;

//     db.query(sql, [patient_id], (err, results) => {

//         if (err) {
//             return res.status(500).json(err);
//         }

//         if (results.length === 0) {
//             return res.status(404).json({
//                 message: "Patient not found"
//             });
//         }

//         res.json(results[0]);

//     });

// });
app.get("/patients", requireDoctorLogin, (req, res) => {

    const { patient_id } = req.query;

    if (!patient_id) {
        return res.status(400).json({
            error: "patient_id is required"
        });
    }

    const organizationCode =
        req.session.doctor.organization_code;

    const sql = `
        SELECT *
        FROM patients
        WHERE patient_id = ?
        AND organization_code = ?
    `;

    db.query(
        sql,
        [patient_id, organizationCode],
        (err, results) => {

            if (err) {
                console.error("Patient lookup error:", err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Patient not found"
                });
            }

            res.json(results[0]);

        }
    );

});
app.get('/ecg', (req, res) => {

    db.query(
        'SELECT * FROM ecg_data ORDER BY id DESC LIMIT 100',
        (err, results) => {

            if (err) {
                res.status(500).send(err);
                return;
            }

            res.json(results);
        }
    );

});

// app.get('/records', (req, res) => {

//     const patient = req.query.patient;
//     const date = req.query.date;

//                 const sql = `SELECT * FROM ecg_data WHERE patient_id = ? AND DATE(created_at) = ? ORDER BY id ASC LIMIT 300`;

//     db.query(sql, [patient, date], (err, results) => {

//         if (err) {
//             console.log(err);
//             return res.status(500).send(err);
//         }
       

//         console.log("HISTORY RESULTS:", results.length);

//         res.json(results);
//     });
// });

// app.post("/patients", (req, res) => {


// console.log("Loading patient routes...");

//     console.log("POST /patients reached");
//     console.log(req.body);

//     const {
//         patient_id,
//         patient_name,
//         age,
//         gender
//     } = req.body;
    
//     const sql = `
//         INSERT INTO patients
//         (patient_id, patient_name, age, gender)
//         VALUES (?, ?, ?, ?)
//     `;

//     db.query(
//         sql,
//         [patient_id, patient_name, age, gender],
//         (err) => {

//             if(err){
//                 return res.status(500).json(err);  
//             }

//             mqttHandler.setCurrentlyMonitoredPatient(patient_id);
//             res.json({
//                 message:"Patient Registered"
//             });

//         });
//         console.log(db.state);


// });
app.get('/records', requireDoctorLogin, (req, res) => {

    const patient = req.query.patient;
    const date = req.query.date;

    const organizationCode =
        req.session.doctor.organization_code;

    const sql = `
        SELECT ecg_data.*
        FROM ecg_data 
        INNER JOIN patients 
            ON ecg_data.patient_id = patients.patient_id
        WHERE ecg_data.patient_id = ?
        AND patients.organization_code = ?
        AND DATE(ecg_data.created_at) = ?
        ORDER BY ecg_data.id DESC
        LIMIT 300
    `;

    db.query(
        sql,
        [patient, organizationCode, date],
        (err, results) => {

            if (err) {
                console.error("History error:", err);

                return res.status(500).json({
                    error: "Database error"
                });
            }

            console.log("HISTORY RESULTS:", results.length);

            res.json(results);
        }
    );
});
app.post("/patients", requireDoctorLogin, (req, res) => {

    console.log("=================================");
    console.log("POST /patients REACHED");
    console.log("Request body:", req.body);
    console.log("Doctor session:", req.session.doctor);
    console.log("=================================");

    const {
        patient_id,
        patient_name,
        age,
        gender,
        height,
        weight,
        blood_pressure
    } = req.body;

    if (!patient_id || !patient_name || !age || !gender || !height || !weight || !blood_pressure) {

        console.log("ERROR: Missing patient fields");

        return res.status(400).json({
            error: "All patient fields are required"
        });
    }

    // Get organization from logged-in doctor
    const organizationCode =
        req.session.doctor.organization_code;

    console.log("Organization from doctor session:",
        organizationCode
    );

    const sql = `
        INSERT INTO patients
        (
            patient_id,
            patient_name,
            age,
            gender,
            height,
            weight,
            blood_pressure,
            organization_code
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    console.log("About to insert patient into database...");

    db.query(
        sql,
        [
            patient_id,
            patient_name,
            age,
            gender,
            height,
            weight,
            blood_pressure,
            organizationCode
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "PATIENT REGISTRATION ERROR:",
                    err
                );

                return res.status(500).json({
                    error: err.sqlMessage || "Database error"
                });
            }

            console.log("PATIENT SAVED SUCCESSFULLY");
            console.log("Inserted patient:", {
                patient_id,
                patient_name,
                age,
                gender,
                height,
                weight,
                blood_pressure,
                organization_code: organizationCode
            });

            res.json({
                message: "Patient Registered",
                patient_id: patient_id,
                organization_code: organizationCode
            });

        }
    );

});
// app.post("/patients", requireDoctorLogin, (req, res) => {

//     console.log("POST /patients reached");
//     console.log(req.body);

//     const {
//         patient_id,
//         patient_name,
//         age,
//         gender
//     } = req.body;

//     if (!patient_id || !patient_name || !age || !gender) {
//         return res.status(400).json({
//             error: "All patient fields are required"
//         });
//     }

//     const organizationCode =
//         req.session.doctor.organization_code;

//     const sql = `
//         INSERT INTO patients
//         (
//             patient_id,
//             patient_name,
//             age,
//             gender,
//             organization_code
//         )
//         VALUES (?, ?, ?, ?, ?)
//     `;

//     db.query(
//         sql,
//         [
//             patient_id,
//             patient_name,
//             age,
//             gender,
//             organizationCode
//         ],
//         (err) => {

//             if (err) {

//                 console.error(
//                     "Patient registration error:",
//                     err
//                 );

//                 return res.status(500).json({
//                     error: err.sqlMessage
//                 });
//             }

//             mqttHandler.setCurrentlyMonitoredPatient(
//                 patient_id
//             );

//             res.json({
//                 message: "Patient Registered",
//                 patient_id,
//                 organization_code: organizationCode
//             });

//         }
//     );

// });
// app.post("/set-patient",requireDoctorLogin, (req, res) => {
//      console.log("POST /set-patient");
//     console.log(req.body);
//     const { patient_id } = req.body;
//     // currentPatient = patient_id;
//     if (!patient_id) {
//         return res.status(400).json({ error: "patient_id is required" });
//     }
//     const organizationCode = req.session.doctor.organization_code;

//     const sql = `
//         SELECT *
//         FROM patients
//         WHERE patient_id = ?
//         AND organization_code = ?
//     `;
//     db.query(
//         sql,
//         [patient_id,organizationCode],
//         (err, results) => {

//             if (err) {
//                 console.error("Patient lookup error:", err);
//                 return res.status(500).json({
//                     error: err.sqlMessage
//                 });
//             }

//             if (results.length === 0) {
//                 return res.status(403).json({
//                     error: "Patient does not belong to your organization"
//                 });
//             }

//             mqttHandler.setCurrentlyMonitoredPatient(patient_id);
//             res.json({ message: "Monitoring started", patient_id });
//         }
//     );
// });
// app.post("/set-patient", (req, res) => {
//     console.log("POST /set-patient");
//     console.log(req.body);

//     const { patient_id } = req.body;

//     if (!patient_id) {
//         return res.status(400).json({
//             error: "patient_id is required"
//         });
//     }

//     mqttHandler.setCurrentlyMonitoredPatient(patient_id);

//     res.json({
//         message: "Monitoring started"
//     });
// });
app.post("/set-patient", requireDoctorLogin, (req, res) => {

    console.log("=================================");
    console.log("POST /set-patient REACHED");
    console.log("Request body:", req.body);
    console.log("Doctor session:", req.session.doctor);
    console.log("=================================");

    const { patient_id } = req.body;

    if (!patient_id) {
        console.log("ERROR: No patient_id received");

        return res.status(400).json({
            error: "patient_id is required"
        });
    }

    const organizationCode =
        req.session.doctor.organization_code;

    console.log("Patient ID:", patient_id);
    console.log("Organization:", organizationCode);

    const sql = `
        SELECT *
        FROM patients
        WHERE patient_id = ?
        AND organization_code = ?
    `;

    db.query(
        sql,
        [patient_id, organizationCode],
        (err, results) => {

            if (err) {

                console.error(
                    "PATIENT LOOKUP ERROR:",
                    err
                );

                return res.status(500).json({
                    error: err.sqlMessage
                });
            }

            console.log(
                "Patient lookup results:",
                results
            );

            if (results.length === 0) {

                console.log(
                    "ERROR: Patient does not belong to organization"
                );

                return res.status(403).json({
                    error:
                        "Patient does not belong to your organization"
                });
            }

            console.log(
                "PATIENT FOUND:",
                results[0].patient_id
            );

            mqttHandler.setCurrentlyMonitoredPatient(
                patient_id
            );

            console.log(
                "setCurrentlyMonitoredPatient() CALLED"
            );
console.log(
    "setCurrentlyMonitoredPatient() CALLED"
);

console.log(
    "Patient selected successfully:",
    patient_id
);

            res.json({
                message: "Monitoring started",
                patient_id: patient_id
            });

        }
    );
});
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
app.get("/patient-records",requireDoctorLogin, (req, res) => {

    const { patient_id } = req.query;

    if (!patient_id) {
        return res.status(400).json({
            error: "patient_id is required"
        });
    }
    const organizationCode =
    req.session.doctor.organization_code;

    const sql = `
        SELECT
            patient_id,
            ecg_value,
            SPO2,
            body_temp,
            env_temp,
            env_hum,
            BPM,
            aqi,
            created_at
        FROM ecg_data
        INNER JOIN patients
         ON ecg_data.patient_id = patients.patient_id
        WHERE ecg_data.patient_id = ?
        AND patients.organization_code = ?
        ORDER BY ecg_data.created_at DESC
        LIMIT 300
    `;

    db.query(sql, [patient_id, organizationCode], (err, results) => {

        if (err) {
            console.error("Patient records error:", err);
            return res.status(500).json({
                error: err.sqlMessage
            });
        }

        console.log(
            `Found ${results.length} records for ${patient_id}`
        );

        res.json(results);
    });
});
app.post("/doctor-logout", requireDoctorLogin, (req, res) => {

    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({
                error: "Logout failed"
            });
        }
        res.json({ message: "Logged out successfully" });
    });
});
app.get("/doctor-me", requireDoctorLogin, (req, res) => {

    res.json({
        doctor: req.session.doctor
    });

});
// app.get('/records', (req, res) => {
//     let date = req.query.date;
//     db.query(
//         'SELECT * FROM ecg_data WHERE DATE(created_at)=? ORDER BY id DESC',
//         [date],
//     (err, results) => {
//         if (err) {
//                 res.status(500).send(err);
//                 return;
//             }

//             res.json(results);
//         });
// });
