const loginSection =
    document.getElementById("loginSection");

const registerSection =
    document.getElementById("registerSection");


// ==============================
// SWITCH TO REGISTER
// ==============================

function showRegister() {

    loginSection.style.display = "none";

    registerSection.style.display = "block";

}


// ==============================
// SWITCH TO LOGIN
// ==============================

function showLogin() {

    registerSection.style.display = "none";

    loginSection.style.display = "block";

}


// ==============================
// DOCTOR LOGIN
// ==============================

document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const organization_code =
            document
                .getElementById("loginOrganizationCode")
                .value
                .trim();

        const email =
            document
                .getElementById("loginEmail")
                .value
                .trim();

        const password =
            document
                .getElementById("loginPassword")
                .value;

        const message =
            document.getElementById("loginMessage");


        try {

            const response = await fetch(
                "http://localhost:3000/doctor-login",
                {

                    method: "POST",
                    credentials: "include",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        organization_code,
                        email,
                        password
                    })

                }
            );


            const data =
                await response.json();


            console.log(
                "Login response:",
                data
            );


            if (!response.ok) {

                message.textContent =
                    data.error || "Login failed";

                message.className = "error";

                return;
            }


            message.textContent =
                "Login successful!";

            message.className = "success";


            // Open dashboard
            setTimeout(() => {

                window.location.href =
                    "inde.html";

            }, 500);


        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            message.textContent =
                "Unable to connect to server.";

            message.className = "error";

        }

    });


// ==============================
// DOCTOR REGISTRATION
// ==============================

document
    .getElementById("registerForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();


        const organization_code =
            document
                .getElementById("registerOrganizationCode")
                .value
                .trim();

        const doctor_name =
            document
                .getElementById("doctorName")
                .value
                .trim();

        const email =
            document
                .getElementById("registerEmail")
                .value
                .trim();

        const password =
            document
                .getElementById("registerPassword")
                .value;
console.log("LOGIN DETAILS BEING SENT:");
console.log("Organization:", organization_code);
console.log("Email:", email);
console.log("Password:", password.length>0);

        const message =
            document.getElementById(
                "registerMessage"
            );


        try {

            const response = await fetch(
                "http://localhost:3000/doctor-register",
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        organization_code,
                        doctor_name,
                        email,
                        password

                    })

                }
            );


            const data =
                await response.json();


            console.log(
                "Registration response:",
                data
            );


            if (!response.ok) {

                message.textContent =
                    data.error ||
                    "Registration failed";

                message.className = "error";

                return;
            }


            message.textContent =
                "Registration successful! You can now login.";

            message.className = "success";


            // Clear registration form
            document
                .getElementById("registerForm")
                .reset();


            // Switch to login after 1 second
            setTimeout(() => {

                showLogin();

            }, 1000);


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            message.textContent =
                "Unable to connect to server.";

            message.className = "error";

        }

    });