console.log("=== THIS IS THE MQTT.JS FILE ===");
console.log("1");

const mqtt = require("mqtt");

console.log("2");

const db = require("./db");

console.log("3");


// =====================================================
// HELPER FUNCTION
// =====================================================

function numberOrNull(value) {

    const num = Number(value);

    return Number.isFinite(num) ? num : null;
}


// =====================================================
// LATEST SENSOR DATA
// =====================================================

const latestData = {

    patient_id: null,

    ecg_value: null,

    SPO2: null,

    body_temp: null,

    env_temp: null,

    env_hum: null,

    heart_rate: null,

    aqi: null
};


console.log("4");


// =====================================================
// MQTT CONNECTION
// =====================================================

const client = mqtt.connect(
    "wss://broker.hivemq.com:8884/mqtt"
);

console.log("5");


// =====================================================
// MQTT CONNECT
// =====================================================

client.on("connect", () => {

    console.log("MQTT Connected");


    const topics = [
        "patient/ecg",
        "patient/data"
    ];


    client.subscribe(topics, (err) => {

        if (err) {

            console.error(
                "MQTT subscription error:",
                err
            );

        } else {

            console.log(
                "Subscribed to all topics"
            );
        }

    });

});


// =====================================================
// MQTT MESSAGE RECEIVED
// =====================================================

client.on("message", (topic, message) => {

    try {

        const data =
            JSON.parse(message.toString());


        switch (topic) {


            // -----------------------------------------
            // ECG DATA
            // -----------------------------------------

            case "patient/ecg":

                latestData.ecg_value =
                    data.samples;

                break;


            // -----------------------------------------
            // OTHER PATIENT DATA
            // -----------------------------------------

            case "patient/data":

                latestData.env_temp =
                    numberOrNull(
                        data.temperature
                    );

                latestData.env_hum =
                    numberOrNull(
                        data.humidity
                    );

                latestData.SPO2 =
                    numberOrNull(
                        data.spo2
                    );

                latestData.body_temp =
                    numberOrNull(
                        data.body_temp
                    );

                latestData.heart_rate =
                    numberOrNull(
                        data.bpm
                    );

                latestData.aqi =
                    numberOrNull(
                        data.aqi ??
                        data.airQuality
                    );

                break;
        }


    } catch (err) {

        console.error(
            "Error handling MQTT message:",
            err
        );

    }

});


// =====================================================
// SAVE SENSOR DATA TO DATABASE
// =====================================================

setInterval(async () => {

    console.log("Timer running");


    // -----------------------------------------------
    // Make sure a patient has been selected
    // -----------------------------------------------

    if (!latestData.patient_id) {

        console.log(
            "No patient selected."
        );

        return;
    }


    try {

        const sql = `
            INSERT INTO ecg_data
            (
                patient_id,
                ecg_value,
                spo2,
                body_temp,
                env_temp,
                env_hum,
                bpm,
                aqi
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8
            )
        `;


        const result = await db.query(
            sql,
            [
                latestData.patient_id,

                JSON.stringify(
                    latestData.ecg_value
                ),

                latestData.SPO2,

                latestData.body_temp,

                latestData.env_temp,

                latestData.env_hum,

                latestData.heart_rate,

                latestData.aqi
            ]
        );


        console.log(
            "Vitals saved",
            {
                patient_id:
                    latestData.patient_id,

                SPO2:
                    latestData.SPO2,

                body_temp:
                    latestData.body_temp,

                env_temp:
                    latestData.env_temp,

                env_hum:
                    latestData.env_hum,

                heart_rate:
                    latestData.heart_rate,

                aqi:
                    latestData.aqi
            }
        );


    } catch (error) {

        console.error(
            "Database Error:",
            error
        );

    }

}, 5000);


console.log("Creating timer...");


// =====================================================
// SET CURRENTLY MONITORED PATIENT
// =====================================================

function setCurrentlyMonitoredPatient(patientId) {

    latestData.patient_id = patientId;

    console.log(
        "Current patient:",
        patientId
    );
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    setCurrentlyMonitoredPatient
};


console.log("END OF FILE");