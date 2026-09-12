const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const db = require('./db');

const supabase = require('./supabase');

console.log("Loading mqtt.js...");
const mqttHandler = require('./mqtt');
console.log("mqtt.js loaded.");

const app = express();


app.use(cors({
    origin: [
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://elaz-hms.vercel.app"
    ],
    credentials: true
}));

app.use(express.json());

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'my-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 80
    }
}));


// Log every incoming request
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// =====================================================
// ADMIN LOGIN
// =====================================================

app.post("/admin-login", async (req, res) => {

    const {
        email,
        password
    } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    try {

        // Authenticate using Supabase Auth
        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user) {

            return res.status(401).json({
                error: "Invalid login details"
            });
        }

        const user = data.user;

        // Check that this Auth user is actually an admin
        const adminResult = await db.query(
            `
            SELECT
                id,
                admin_name,
                email,
                user_id
            FROM admins
            WHERE user_id = $1
            `,
            [user.id]
        );

        if (adminResult.rows.length === 0) {

            // Sign the user out of the Supabase session
            await supabase.auth.signOut();

            return res.status(403).json({
                error: "User is not registered as an admin"
            });
        }

        const admin = adminResult.rows[0];

        req.session.admin = {
            admin_id: admin.id,
            admin_name: admin.admin_name,
            email: admin.email,
            user_id: admin.user_id
        };

        console.log(
            "Admin logged in:",
            req.session.admin
        );

        req.session.save((err) => {

            if (err) {

                console.error(
                    "SESSION SAVE ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "Could not save login session"
                });
            }

            res.json({
    message: "Admin login successful",

    access_token: data.session.access_token,

    admin: {
        admin_name: admin.admin_name,
        email: admin.email
    }
});
        });

    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );

        res.status(500).json({
            error: "Authentication failed"
        });
    }
});


// =====================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// =====================================================

async function requireAdminAuth(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: "Authorization token required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                error: "Invalid authorization header"
            });
        }

        // Verify the token with Supabase
        const {
            data: {
                user
            },
            error
        } = await supabase.auth.getUser(token);

        if (error || !user) {

            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        console.log("Supabase admin user:", user.id);

        // Check that this Supabase user exists
        // in the admins table
        const adminResult = await db.query(
            `
            SELECT
                id,
                admin_name,
                email,
                user_id
            FROM admins
            WHERE user_id = $1
            `,
            [user.id]
        );

        if (adminResult.rows.length === 0) {

            return res.status(403).json({
                error: "User is not registered as an admin"
            });
        }

        // Store admin information in request
        req.admin = adminResult.rows[0];

        next();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        return res.status(500).json({
            error: "Authentication failed"
        });
    }
}

app.get(
    "/admin/organizations",
    requireAdminAuth,
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT
                    id,
                    organization_name,
                    organization_code,
                    created_at
                FROM organizations
                ORDER BY created_at DESC
            `);

            res.json({
                organizations: result.rows
            });

        } catch (error) {
            console.error(
                "Organization retrieval error:",
                error
            );

            res.status(500).json({
                error: "Could not load organizations"
            });
        }
    }
);

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


// =====================================================
// CREATE ORGANIZATION
// =====================================================

app.post(
    "/admin/organizations",
    requireAdminAuth,
    async (req, res) => {

        const {
            organization_name
        } = req.body;

        if (!organization_name) {

            return res.status(400).json({
                error: "Organization name is required"
            });

        }

        try {

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
                VALUES ($1, $2)
                RETURNING id, organization_code, organization_name
            `;

            const result = await db.query(
                insertSql,
                [
                    organizationCode,
                    organization_name.trim()
                ]
            );

            const organization = result.rows[0];

            console.log(
                "Organization created:",
                organization.organization_name
            );

            console.log(
                "Organization code:",
                organization.organization_code
            );

            res.status(201).json({
                message: "Organization created successfully",
                organization: {
                    id: organization.id,
                    organization_name:
                        organization.organization_name,
                    organization_code:
                        organization.organization_code
                }
            });

        } catch (error) {

            console.error(
                "Organization creation error:",
                error
            );

            // PostgreSQL unique constraint
            if (error.code === "23505") {
                return res.status(409).json({
                    error: "Organization code already exists"
                });
            }

            res.status(500).json({
                error: "Could not create organization"
            });
        }
    }
);


// =====================================================
// DOCTOR REGISTRATION
// =====================================================

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

        // ---------------------------------------------
        // Find organization
        // ---------------------------------------------

        const organizationSql = `
            SELECT
                id,
                organization_name,
                organization_code
            FROM organizations
            WHERE organization_code = $1
        `;

        const organizationResult = await db.query(
            organizationSql,
            [organization_code]
        );

        if (organizationResult.rows.length === 0) {
            return res.status(404).json({
                error: "Organization not found"
            });
        }

        const organization =
            organizationResult.rows[0];


        // ---------------------------------------------
        // Check existing doctor
        // ---------------------------------------------

        const checkDoctorSql = `
            SELECT id
            FROM doctors
            WHERE organization_code = $1
            AND email = $2
        `;

        const doctorResult = await db.query(
            checkDoctorSql,
            [
                organization_code,
                email
            ]
        );

        if (doctorResult.rows.length > 0) {
            return res.status(409).json({
                error: "Doctor already registered"
            });
        }


        // ---------------------------------------------
        // Hash password
        // ---------------------------------------------

        const passwordHash =
            await bcrypt.hash(password, 10);


        // ---------------------------------------------
        // Create doctor
        // ---------------------------------------------

        const insertSql = `
            INSERT INTO doctors
            (
                organization_code,
                doctor_name,
                email,
                password_hash
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;

        const insertResult = await db.query(
            insertSql,
            [
                organization.organization_code,
                doctor_name,
                email,
                passwordHash
            ]
        );

        const doctorId =
            insertResult.rows[0].id;


        res.status(201).json({
            message: "Doctor registered successfully",
            doctor_id: doctorId
        });

    } catch (error) {

        console.error(
            "Doctor registration error:",
            error
        );

        if (error.code === "23505") {
            return res.status(409).json({
                error: "Doctor already registered"
            });
        }

        res.status(500).json({
            error: "Registration failed"
        });
    }
});


// =====================================================
// DOCTOR LOGIN
// =====================================================

app.post("/doctor-login", async (req, res) => {

    const {
        organization_code,
        email,
        password
    } = req.body;

    if (
        !organization_code ||
        !email ||
        !password
    ) {
        return res.status(400).json({
            error:
                "Organization, email and password are required"
        });
    }

    try {

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
                ON doctors.organization_code =
                   organizations.organization_code

            WHERE organizations.organization_code = $1
            AND doctors.email = $2
        `;

        const result = await db.query(
            sql,
            [
                organization_code,
                email
            ]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid login details"
            });
        }

        const doctor = result.rows[0];


        // ---------------------------------------------
        // Check password
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Save doctor session
        // ---------------------------------------------

        req.session.doctor = {

            doctor_id:
                doctor.doctor_id,

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


        // ---------------------------------------------
        // Explicitly save session
        // ---------------------------------------------

        req.session.save((err) => {

            if (err) {

                console.error(
                    "SESSION SAVE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Could not save login session"
                });
            }

            console.log(
                "Doctor session saved successfully"
            );

            res.json({

                message: "Login successful",

                doctor: {
                    doctor_name:
                        doctor.doctor_name,

                    organization_name:
                        doctor.organization_name,

                    organization_code:
                        doctor.organization_code
                }
            });
        });

    } catch (error) {

        console.error(
            "Doctor login error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }
});


// =====================================================
// DOCTOR AUTHENTICATION MIDDLEWARE
// =====================================================

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
    console.log(
        "Organization:",
        req.session.doctor.organization_code
    );

    console.log("========================================");

    next();
}


// =====================================================
// GET PATIENT
// =====================================================

app.get(
    "/patients",
    requireDoctorLogin,
    async (req, res) => {

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
            WHERE patient_id = $1
            AND organization_code = $2
        `;

        try {

            const result = await db.query(
                sql,
                [
                    patient_id,
                    organizationCode
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Patient not found"
                });
            }

            res.json(result.rows[0]);

        } catch (error) {

            console.error(
                "Patient lookup error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);


// =====================================================
// GET ECG
// =====================================================

app.get('/ecg', async (req, res) => {

    try {

        const result = await db.query(
            'SELECT * FROM ecg_data ORDER BY id DESC LIMIT 100'
        );

        res.json(result.rows);

    } catch (error) {

        console.error(
            "ECG query error:",
            error
        );

        res.status(500).json({
            error: "Database error"
        });
    }

});


// =====================================================
// GET RECORDS BY DATE
// =====================================================

app.get(
    '/records',
    requireDoctorLogin,
    async (req, res) => {

        const patient = req.query.patient;
        const date = req.query.date;

        const organizationCode =
            req.session.doctor.organization_code;

        const sql = `
            SELECT ecg_data.*
            FROM ecg_data
            INNER JOIN patients
                ON ecg_data.patient_id =
                   patients.patient_id
            WHERE ecg_data.patient_id = $1
            AND patients.organization_code = $2
            AND DATE(ecg_data.created_at) = $3
            ORDER BY ecg_data.id DESC
            LIMIT 300
        `;

        try {

            const result = await db.query(
                sql,
                [
                    patient,
                    organizationCode,
                    date
                ]
            );

            console.log(
                "HISTORY RESULTS:",
                result.rows.length
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "History error:",
                error
            );

            res.status(500).json({
                error: "Database error"
            });
        }
    }
);

app.post(
    "/patients",
    requireDoctorLogin,
    async (req, res) => {

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

        if (
            !patient_id ||
            !patient_name ||
            !age ||
            !gender ||
            !height ||
            !weight ||
            !blood_pressure
        ) {

            console.log(
                "ERROR: Missing patient fields"
            );

            return res.status(400).json({
                error: "All patient fields are required"
            });
        }

        // Get organization from logged-in doctor
        const organizationCode =
            req.session.doctor.organization_code;

        console.log(
            "Organization from doctor session:",
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING patient_id
        `;

        console.log(
            "About to insert patient into database..."
        );

        try {

            const result = await db.query(
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
                ]
            );

            console.log(
                "PATIENT SAVED SUCCESSFULLY"
            );

            res.status(201).json({

                message:
                    "Patient Registered",

                patient_id:
                    result.rows[0].patient_id,

                organization_code:
                    organizationCode
            });

        } catch (error) {

            console.error(
                "PATIENT REGISTRATION ERROR:",
                error
            );

            if (error.code === "23505") {

                return res.status(409).json({
                    error:
                        "Patient ID already exists"
                });
            }

            res.status(500).json({
                error:
                    "Database error"
            });
        }
    }
);


// =====================================================
// SET CURRENT PATIENT
// =====================================================

app.post(
    "/set-patient",
    requireDoctorLogin,
    async (req, res) => {

        console.log("=================================");
        console.log("POST /set-patient REACHED");
        console.log("Request body:", req.body);
        console.log("Doctor session:", req.session.doctor);
        console.log("=================================");

        const { patient_id } = req.body;

        if (!patient_id) {

            console.log(
                "ERROR: No patient_id received"
            );

            return res.status(400).json({
                error: "patient_id is required"
            });
        }

        const organizationCode =
            req.session.doctor.organization_code;

        console.log(
            "Patient ID:",
            patient_id
        );

        console.log(
            "Organization:",
            organizationCode
        );

        const sql = `
            SELECT *
            FROM patients
            WHERE patient_id = $1
            AND organization_code = $2
        `;

        try {

            const result = await db.query(
                sql,
                [
                    patient_id,
                    organizationCode
                ]
            );

            if (result.rows.length === 0) {

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
                result.rows[0].patient_id
            );

            mqttHandler.setCurrentlyMonitoredPatient(
                patient_id
            );

            console.log(
                "Patient selected successfully:",
                patient_id
            );

            res.json({

                message:
                    "Monitoring started",

                patient_id:
                    patient_id
            });

        } catch (error) {

            console.error(
                "PATIENT LOOKUP ERROR:",
                error
            );

            res.status(500).json({
                error:
                    "Database error"
            });
        }
    }
);


// =====================================================
// PATIENT RECORDS
// =====================================================

app.get(
    "/patient-records",
    requireDoctorLogin,
    async (req, res) => {

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
                ecg_data.patient_id,
                ecg_data.ecg_value,
                ecg_data.spo2,
                ecg_data.body_temp,
                ecg_data.env_temp,
                ecg_data.env_hum,
                ecg_data.bpm,
                ecg_data.aqi,
                ecg_data.created_at
            FROM ecg_data
            INNER JOIN patients
                ON ecg_data.patient_id =
                   patients.patient_id
            WHERE ecg_data.patient_id = $1
            AND patients.organization_code = $2
            ORDER BY ecg_data.created_at DESC
            LIMIT 300
        `;

        try {

            const result = await db.query(
                sql,
                [
                    patient_id,
                    organizationCode
                ]
            );

            console.log(
                `Found ${result.rows.length} records for ${patient_id}`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "Patient records error:",
                error
            );

            res.status(500).json({
                error:
                    "Database error"
            });
        }
    }
);


// =====================================================
// DOCTOR LOGOUT
// =====================================================

app.post(
    "/doctor-logout",
    requireDoctorLogin,
    (req, res) => {

        req.session.destroy((err) => {

            if (err) {

                console.error(
                    "Logout error:",
                    err
                );

                return res.status(500).json({
                    error: "Logout failed"
                });
            }

            res.json({
                message:
                    "Logged out successfully"
            });

        });

    }
);


// =====================================================
// CURRENT DOCTOR
// =====================================================

app.get(
    "/doctor-me",
    requireDoctorLogin,
    (req, res) => {

        res.json({
            doctor:
                req.session.doctor
        });

    }
);


// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});