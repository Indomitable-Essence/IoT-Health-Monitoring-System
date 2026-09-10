const API_BASE_URL =
    "https://iot-health-monitoring-system.onrender.com";

let adminAccessToken =
    sessionStorage.getItem("adminAccessToken");
const adminLoginForm =
    document.getElementById("adminLoginForm");

const adminLoginEmail =
    document.getElementById("adminLoginEmail");

const adminLoginPassword =
    document.getElementById("adminLoginPassword");

const adminLoginMessage =
    document.getElementById("adminLoginMessage");

const loginArea =
    document.getElementById("loginArea");

const authenticatedArea =
    document.getElementById("authenticatedArea");

const accessTitle =
    document.getElementById("accessTitle");

const accessDescription =
    document.getElementById("accessDescription");

const adminName =
    document.getElementById("adminName");

const adminEmail =
    document.getElementById("adminEmail");

const logoutBtn =
    document.getElementById("logoutBtn");

const organizationPanel =
    document.getElementById("organizationPanel");

const lockMessage =
    document.getElementById("lockMessage");

const organizationForm =
    document.getElementById("organizationForm");

const organizationName =
    document.getElementById("organizationName");

const createOrganizationBtn =
    document.getElementById("createOrganizationBtn");

const organizationMessage =
    document.getElementById("organizationMessage");

const generatedCodeContainer =
    document.getElementById("generatedCodeContainer");

const generatedOrganizationCode =
    document.getElementById("generatedOrganizationCode");

const copyCodeBtn =
    document.getElementById("copyCodeBtn");


// =========================================================
// INITIALIZE PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    if (adminAccessToken) {

        showAuthenticatedState();

    } else {

        showLoginState();

    }

});


// =========================================================
// ADMIN LOGIN
// =========================================================

adminLoginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const email =
            adminLoginEmail.value.trim();

        const password =
            adminLoginPassword.value;


        clearMessage(adminLoginMessage);


        if (!email || !password) {
            showMessage(
                adminLoginMessage,
                "Please enter your email and password.",
                "error"
            );

            return;
        }


        const loginButton =
            adminLoginForm.querySelector(
                ".primary-btn"
            );


        loginButton.disabled = true;

        loginButton.textContent =
            "Authenticating...";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/admin-login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to authenticate."
                );

            }


            // Store access token

            adminAccessToken =
                data.access_token;


            sessionStorage.setItem(
                "adminAccessToken",
                adminAccessToken
            );


            // Store admin information

            if (data.admin) {

                sessionStorage.setItem(
                    "adminName",
                    data.admin.admin_name || ""
                );

                sessionStorage.setItem(
                    "adminEmail",
                    data.admin.email || email
                );

            } else {

                sessionStorage.setItem(
                    "adminEmail",
                    email
                );

            }


            // Show authenticated state

            showAuthenticatedState();


        } catch (error) {

            showMessage(
                adminLoginMessage,
                error.message ||
                    "Login failed. Please try again.",
                "error"
            );


        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Continue to Admin Portal";

        }

    }
);


// =========================================================
// SHOW LOGIN STATE
// =========================================================

function showLoginState() {

    loginArea.style.display = "block";

    authenticatedArea.style.display =
        "none";


    accessTitle.textContent =
        "Request administrative access";

    accessDescription.textContent =
        "Sign in with your administrator credentials to continue.";


    organizationPanel.classList.add(
        "locked"
    );


    lockMessage.style.display =
        "flex";


    organizationName.disabled = true;

    createOrganizationBtn.disabled = true;


    adminLoginEmail.focus();

}


// =========================================================
// SHOW AUTHENTICATED STATE
// =========================================================

function showAuthenticatedState() {

    loginArea.style.display =
        "none";

    authenticatedArea.style.display =
        "flex";


    accessTitle.textContent =
        "You're securely signed in";

    accessDescription.textContent =
        "Administrative access is active. You can now manage organizations.";


    const storedName =
        sessionStorage.getItem("adminName");

    const storedEmail =
        sessionStorage.getItem("adminEmail");


    adminName.textContent =
        storedName || "Administrator";

    adminEmail.textContent =
        storedEmail || "—";


    // Unlock organization creation

    organizationPanel.classList.remove(
        "locked"
    );


    lockMessage.style.display =
        "none";


    organizationName.disabled = false;

    createOrganizationBtn.disabled = false;


    organizationName.focus();

}


// =========================================================
// CREATE ORGANIZATION
// =========================================================

organizationForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        // Extra frontend protection

        if (!adminAccessToken) {

            showMessage(
                organizationMessage,
                "Admin authentication is required.",
                "error"
            );

            showLoginState();

            return;
        }


        const name =
            organizationName.value.trim();


        if (!name) {

            showMessage(
                organizationMessage,
                "Please enter an organization name.",
                "error"
            );

            return;
        }


        clearMessage(
            organizationMessage
        );


        // Hide previous code

        generatedCodeContainer.style.display =
            "none";


        createOrganizationBtn.disabled =
            true;

        createOrganizationBtn.textContent =
            "Generating Code...";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/admin/organizations`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${adminAccessToken}`
                        },

                        credentials: "include",

                        body: JSON.stringify({
                            organization_name: name
                        })
                    }
                );


            const data =
                await response.json();


            // Token is invalid/expired

            if (response.status === 401) {

                handleUnauthorized();

                return;
            }


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Could not create organization."
                );

            }


            const organization =
                data.organization;


            const generatedCode =
                organization &&
                (
                    organization.organization_code ||
                    organization.organizationCode
                );


            if (!generatedCode) {

                throw new Error(
                    "Organization was created, but no organization code was returned."
                );

            }


            // Success message

            showMessage(
                organizationMessage,
                "Organization created successfully.",
                "success"
            );


            // Display generated code

            generatedOrganizationCode.textContent =
                generatedCode;


            generatedCodeContainer.style.display =
                "block";


            // Clear input

            organizationForm.reset();


            // Bring generated code into view

            generatedCodeContainer.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


        } catch (error) {

            showMessage(
                organizationMessage,
                error.message ||
                    "Could not create organization.",
                "error"
            );


        } finally {

            createOrganizationBtn.disabled =
                false;

            createOrganizationBtn.textContent =
                "Generate Organization Code";

        }

    }
);


// =========================================================
// COPY ORGANIZATION CODE
// =========================================================

copyCodeBtn.addEventListener(
    "click",
    async () => {

        const code =
            generatedOrganizationCode.textContent.trim();


        if (!code) {
            return;
        }


        try {

            await navigator.clipboard.writeText(
                code
            );


            const originalText =
                copyCodeBtn.textContent;


            copyCodeBtn.textContent =
                "Copied ✓";


            setTimeout(() => {

                copyCodeBtn.textContent =
                    originalText;

            }, 1500);


        } catch (error) {

            copyCodeBtn.textContent =
                "Copy failed";


            setTimeout(() => {

                copyCodeBtn.textContent =
                    "Copy Code";

            }, 1500);

        }

    }
);


// =========================================================
// LOGOUT
// =========================================================

logoutBtn.addEventListener(
    "click",
    async () => {

        sessionStorage.removeItem(
            "adminAccessToken"
        );

        sessionStorage.removeItem(
            "adminName"
        );

        sessionStorage.removeItem(
            "adminEmail"
        );


        adminAccessToken = null;


        generatedCodeContainer.style.display =
            "none";


        organizationName.value = "";


        showLoginState();

    }
);


// =========================================================
// UNAUTHORIZED
// =========================================================

function handleUnauthorized() {

    sessionStorage.removeItem(
        "adminAccessToken"
    );

    sessionStorage.removeItem(
        "adminName"
    );

    sessionStorage.removeItem(
        "adminEmail"
    );


    adminAccessToken = null;


    showMessage(
        adminLoginMessage,
        "Your admin session has expired. Please sign in again.",
        "error"
    );


    showLoginState();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =========================================================
// MESSAGE HELPERS
// =========================================================

function showMessage(
    element,
    message,
    type
) {

    element.textContent = message;

    element.className =
        `message ${type}`;

}


function clearMessage(element) {

    element.textContent = "";

    element.className =
        "message";

}
