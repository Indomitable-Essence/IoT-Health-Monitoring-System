// const mqtt = require('mqtt');
// const db = require('./db');

// const client = mqtt.connect(
//     'ws://broker.hivemq.com:8000/mqtt'
// );

// client.on('connect', () => {

//     console.log('MQTT Connected');

//     client.subscribe('ecg/data', (err) => {
//         if (!err) {
//             console.log('Subscribed');
//         }
//     });
// });

// client.on('message', (topic, message) => {

//     const value = Number(
//         message.toString()
//     );

//     console.log('ECG:', value);
//     console.log('MQTT MESSAGE RECEIVED:', message.toString());
//     console.log("DATE RECEIVED:", date);

//     db.query(
//         'INSERT INTO ecg_data (ecg_value) VALUES (?)',
//         [value],
//         (err) => {
//             if (err) {
//                 console.error(err);
//             } else {
//                 console.log('Saved');
//             }
//         }  
//     );

// });
console.log("=== THIS IS THE MQTT.JS FILE ===");
console.log("1");
const mqtt = require('mqtt');
console.log("2");
const db = require('./db');
console.log("3");

function numberOrNull(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}
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

const client = mqtt.connect(
    'ws://broker.hivemq.com:8000/mqtt'
);
console.log("5");

client.on('connect', () => {

    console.log('MQTT Connected');

    const topics = ['patient/ecg', 'patient/data'];
    client.subscribe(topics, (err) => {
    if (err) {
        console.error(err);
    } else 
        console.log("Subscribed to all topics");
    })
});

client.on('message', (topic, message) => {
    try{
    const data = JSON.parse(message.toString());

    switch (topic) {
        case 'patient/ecg':
            latestData.ecg_value = data.samples;
            break;

        case 'patient/data':
            latestData.env_temp = numberOrNull(data.temperature);
            latestData.env_hum = numberOrNull(data.humidity);
            latestData.SPO2 = numberOrNull(data.spo2);
            latestData.body_temp = numberOrNull(data.body_temp);
            latestData.heart_rate = numberOrNull(data.bpm);
            latestData.aqi = numberOrNull(data.aqi ?? data.airQuality);

            const newPoints = getCorrelationPoints();

            temperatureCorrelation.data.datasets[0].data =newPoints;
            temperatureCorrelation.data.datasets[1].data = calculateRegression(newPoints);
            temperatureCorrelation.update();
         break;
    };
    // console.log("Latest Data:", latestData);
    // if (topic === 'patient/ecg') {
    //     console.log("Received ECG data:", data);
    // }
    // if (topic === 'patient/data') {
    //     console.log("Received patient data:", data);
    // }
    //  console.log(data.samples);
    //  console.log(data.temperature);
    //  console.log(data.humidity);
    //  console.log(data.spo2);
    //  console.log(data.body_temp);
    //  console.log(data.airQuality);
    //  console.log(data.bpm);


    } catch (err) {
        console.error('Error handling MQTT message:', err);
    }

});
setInterval(() => {
    console.log("Timer running");
     if (!latestData.patient_id) {
        console.log("No patient selected.");
        return;
    }

    db.query(
        `INSERT INTO ecg_data
        (patient_id, ecg_value, SPO2, body_temp, env_temp, env_hum, BPM, aqi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            latestData.patient_id,
            JSON.stringify(latestData.ecg_value),
            latestData.SPO2,
            latestData.body_temp,
            latestData.env_temp,
            latestData.env_hum,
            latestData.heart_rate,
            latestData.aqi
        ],
        (err) => {
            if (err) {
                console.error("Database Error:", err);
            } else {
                console.log("Vitals saved",{
                    patient_id: latestData.patient_id,
                    SPO2: latestData.SPO2,
                    body_temp: latestData.body_temp,
                    env_temp: latestData.env_temp,
                    env_hum: latestData.env_hum,
                    heart_rate: latestData.heart_rate,
                    aqi: latestData.aqi
                });
            }
        }
    );
},5000);
// setInterval(() => {

//     if (!latestData.patient_id) {
//         console.log("No patient selected.");
//         return;
//     }

//     console.log("Saving:", latestData);
//     console.log("About to insert into MySQL");


//     db.query(
//         `INSERT INTO ecg_data
//         (patient_id, ecg_value, SPO2, body_temp, env_temp, env_hum, heart_rate, aqi)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//             latestData.patient_id,
//             latestData.ecg_value,
//             latestData.SPO2,
//             latestData.body_temp,
//             latestData.env_temp,
//             latestData.env_hum,
//             latestData.heart_rate,
//             latestData.aqi
//         ],
//         (err) => {
//             if (err) {
//                 console.error(err);
//             } else {
//                 console.log("Vitals saved");
//             }
//         }
//     );

// }, 5000);
console.log("Creating timer...");

// setInterval(() => {
//     console.log("Timer fired");

//     if (!latestData.patient_id) {
//         console.log("No patient selected");
//         return;
//     }

//     console.log("Saving:", latestData);

// }, 5000);
function setCurrentlyMonitoredPatient(patientId) {
    latestData.patient_id = patientId;
    console.log("Current patient:", patientId);
}

module.exports = {
    setCurrentlyMonitoredPatient
};
console.log("END OF FILE");

// client.on('message', (topic, message) => 

//     try {
//         const value = Number(message.toString());

//         console.log('ECG:', value);
//         console.log('MQTT MESSAGE RECEIVED:', message.toString());

//         db.query(
//             'INSERT INTO ecg_data (ecg_value) VALUES (?)',
//             [value],
//             (err) => {
//                 if (err) {
//                     console.error(err);
//                 } else {
//                     console.log('Saved');
//                 }
//             }
//         );
//     } catch (err) {
//         console.error('Error handling MQTT message:', err);
//     }

// });