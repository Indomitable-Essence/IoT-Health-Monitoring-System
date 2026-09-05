let mode = 'live';
let selectedHistoryDate = null;
console.log("JavaScript connected!");

// function updateDateTime() {
//     const now = new Date();

//     const options = {
//         weekday: 'long',
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric'
//     };

//     const date = now.toLocaleDateString('en-US', options);

//     const time = now.toLocaleTimeString('en-US', {
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         hour12: true
//     });
// document.getElementById("currentDate").textContent =
//         now.toLocaleDateString("en-US", options);

//     document.getElementById("currentTime").textContent =
//         now.toLocaleTimeString("en-US", time);
// }
//     document.getElementById("dateTime").innerHTML = `
//         ${date}<br>
//         // <span style="font-size:1.2rem;color:#94A3B8;">${time}</span>
//     `;
// }

// Run immediately

// Update every second
// setInterval(updateDateTime, 1000);


// const client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');

//     client.on('connect', () => {
//         console.log("MQTT Connected");
//         // client.subscribe(['patient/ecg','patient/data']);
//         // console.log("Subscribed to topics");
//         const topics = ['patient/ecg', 'patient/data'];
//         topics.forEach(topic => {
//         client.subscribe(topic, err => {
//             if (err) {
//                 console.log("Failed:", topic);
//             } else {
//                 console.log("Subscribed:", topic);
//             }
//         });
//     });
//     });

//     // client.on('message', (topic, message) => {
//     // });
// client.on('message', (topic, message) => {
//     const data = JSON.parse(message.toString());

//     console.log(`MQTT [${topic}]:`, data);
//     console.log(document.getElementById("tempValue"));
//     console.log(document.getElementById("humValue"));
//     console.log(document.getElementById("aqiValue"));
//     console.log(document.getElementById("spo2Value"));

//     switch (topic) {
//         case 'patient/ecg': {
//             const ecgVal = data.samples(data.samples.forEach(sample => {

//     ecgLabels.push("");
//     ecgData.push(sample);

// }););
// while (ecgData.length > 200) {
//     ecgData.shift();
//     ecgLabels.shift();
// }

// ecgGraph.update();

// document.getElementById("ecg-data").textContent =
//     data.samples[data.samples.length - 1];
//             document.getElementById('ecg-data').textContent = ecgVal;


           
//             break;
//         }
    //     case 'patient/data': {
    //          document.getElementById('tempValue').textContent = `${temp.toFixed(1)}°C`;
    //         tempData.push(temp);

    // if (tempData.length > 20)
    //     tempData.shift();
    //     chartTrend.update();
    //         const hum = Number(value);
    //         document.getElementById('humValue').textContent = `${hum.toFixed(0)}%`;
    //         humData.push(hum);

    // if (humData.length > 20)
    //     humData.shift();
            // chartTrend.update();
//    'aq/data': {
//             const aqi = Number(value);
//             document.getElementById('aqiValue').textContent = `${aqi.toFixed(0)} AQI`;
//             aqiData.push(aqi);

//     if (aqiData.length > 20)
//         aqiData.shift();
//             // chartTrend.update();
//         }
//        'spo2/data': {
//             const spo2 = Number(data.spo2);
//             document.getElementById('spo2Value').textContent = `${spo2.toFixed(0)}%`;
//             spo2Data.push(spo2);

//     if (spo2Data.length > 20)
//         spo2Data.shift();
//             // chartTrend.update();
//             break;
//         }
//         'bpm/data': {
//     const bpm = Number(data.bpm);

//     document.getElementById("bpmValue").textContent =
//         `${bpm.toFixed(0)} BPM`;

    
//             if (mode === 'live') {
//                 const ecgVal = Number(data.samples.forEach(sample => {

//     ecgLabels.push("");

//     ecgData.push(sample);
//                 // keep only the last ~200 points so the chart doesn't grow forever
//                 if (ecgData.length > 200) {
//                     ecgData.shift();
//                     ecgLabels.shift();
//                 }

//                 ecgGraph.update();
//                 document.getElementById('ecg-data').textContent = ecgVal;
//             })
//         )
//         }
//     }
// });
const client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');

client.on('connect', () => {
    console.log("MQTT Connected");

    client.subscribe(['patient/ecg', 'patient/data'], (err) => {
        if (err) {
            console.error("Subscription failed:", err);
        } else {
            console.log("Subscribed to patient/ecg and patient/data");
        }
    });
});

client.on('message', (topic, message) => {

    if (mode !== "live") return;

    try {

        const data = JSON.parse(message.toString());

        switch (topic) {

            case "patient/ecg": {

                if (!Array.isArray(data.samples)) break;

                data.samples.forEach(sample => {

                    ecgLabels.push("");
                    ecgData.push(Number(sample));``

                });

                while (ecgData.length > 100) {
                    ecgData.shift();
                    ecgLabels.shift();
                }

                ecgGraph.update();

                document.getElementById("ecg-data").textContent =
                    data.samples[data.samples.length - 1];

                break;
            }

            case "patient/data": {

                document.getElementById("tempValue").textContent =
                    `${data.temperature}°C`;

                document.getElementById("humValue").textContent =
                    `${data.humidity}%`;

                document.getElementById("aqiValue").textContent =
                    `${data.aqi}`;

                document.getElementById("spo2Value").textContent =
                    `${data.spo2}`;

                document.getElementById("bpmValue").textContent =
                    `${data.bpm}`;
                document.getElementById("body_temp").textContent =
                    `${data.body_temp}°C`;


                trendLabels.push("");

                tempData.push(Number(data.temperature));
                humData.push(Number(data.humidity));
                body_tempData.push(Number(data.body_temp));

                // aqiData.push(Number(data.aqi));

                if (typeof data.spo2 === "number") {
                    spo2Data.push(data.spo2);
                } else {
                    spo2Data.push(null);
                }

                while (trendLabels.length > 20) {

                    trendLabels.shift();
                    tempData.shift();
                    humData.shift();
                    aqiData.shift();
                    spo2Data.shift();
                    body_tempData.shift();

                }

                chartTrend.update();
                bodyTempGraph.update();

                break;
            }

        }

    } catch (err) {

        console.error("MQTT Error:", err);

    }

});
const ECGctx = document.getElementById('ecgGraph').getContext('2d');
const ecgLabels = [];
const ecgData = [];

const ecgGraph = new Chart(ECGctx, {
    type: 'line',
    data: {
        labels: ecgLabels,
        datasets: [{
            label: 'ECG',
            data: ecgData,
            borderColor: '#00E5A8',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0
        }]
    },
    options: {
        animation: false,
        responsive: true,
        scales: {
            x: { display: false,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#0a6cf4' }
            },
            y: { display: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#687c97' }
            }
        }
    }
});

const trendctx = document.getElementById('chart-trend').getContext('2d');
const trendLabels = [];

const tempData = [];
const humData = [];
const aqiData = [];
const spo2Data = [];
const body_tempData = [];


const chartTrend = new Chart(trendctx, {
    type: 'line',
    data: {
        labels: trendLabels,
        datasets: [
            {
                label: 'Temperature (°C)',
                data: tempData,
                borderColor: '#6fe099',
                backgroundColor: 'rgba(34,197,94,0.1)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Humidity (%)',
                data: humData,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                tension: 0.4,
                fill: true,
            },
            // {
            //     label: 'Air Quality Index (AQI)',
            //     data: aqiData,
            //     borderColor: '#FACC15',
            //     backgroundColor: 'rgba(250,204,21,0.1)',
            //     tension: 0.4,
            //     fill: true,
            // },
            {
                label: 'SpO2 (%)',
                data: spo2Data,
                borderColor: '#A855F7',
                backgroundColor: 'rgba(168,85,247,0.1)',
                tension: 0.4,
                fill: true,
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: true, position: 'top' }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94A3B8' }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#34d6b0' }
            }
        }
    }
});
function getCorrelationPoints() {

    const points = [];

    const length = Math.min(
        tempData.length,
        body_tempData.length
    );

    for (let i = 0; i < length; i++) {

        const x = Number(tempData[i]);
        const y = Number(body_tempData[i]);

        if (
            Number.isFinite(x) &&
            Number.isFinite(y)
        ) {

            points.push({
                x: x,
                y: y
            });
        }
    }

    return points;
}


/*
    Calculate simple linear regression.
*/

function calculateRegression(points) {

    if (points.length < 2) {
        return [];
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    points.forEach(point => {

        sumX += point.x;
        sumY += point.y;

        sumXY += point.x * point.y;
        sumXX += point.x * point.x;

    });

    const n = points.length;

    const denominator =
        (n * sumXX) - (sumX * sumX);

    if (denominator === 0) {
        return [];
    }

    const slope =
        ((n * sumXY) - (sumX * sumY)) /
        denominator;

    const intercept =
        (sumY - slope * sumX) / n;


    const xValues = points.map(p => p.x);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    return [

        {
            x: minX,
            y: slope * minX + intercept
        },

        {
            x: maxX,
            y: slope * maxX + intercept
        }
    ];
}


const correlationPoints = getCorrelationPoints();

const regressionLine = calculateRegression(correlationPoints);

const trend2ctx =
    document.getElementById("chart-trend2").getContext("2d");
const temperatureCorrelation =
    new Chart(trend2ctx, {

        type: 'scatter',

        data: {

            datasets: [

                {
                    label: 'Measurements',

                    data: correlationPoints,

                    backgroundColor: 'rgba(54, 120, 190, 0.65)',

                    borderColor: 'rgba(54, 120, 190, 0.9)',

                    borderWidth: 0.7,

                    pointRadius: 3,

                    pointHoverRadius: 5
                },

                {
                    label: 'Trend',

                    data: regressionLine,

                    type: 'line',

                    borderColor: '#d08a3e',

                    borderWidth: 1.5,

                    pointRadius: 0,

                    pointHoverRadius: 0,

                    tension: 0,

                    fill: false
                }
            ]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            animation: false,

            plugins: {

                legend: {

                    display: true,

                    position: 'top',

                    align: 'start',

                    labels: {

                        usePointStyle: true,

                        pointStyle: 'circle',

                        boxWidth: 7,

                        boxHeight: 7,

                        padding: 14,

                        color: '#526174',

                        font: {
                            size: 14,
                            family: 'Inter'
                        }
                    }
                },

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            const x =
                                context.parsed.x?.toFixed(1);

                            const y =
                                context.parsed.y?.toFixed(1);

                            return `Environment: ${x}°C | Body: ${y}°C`;
                        }
                    }
                }
            },

            scales: {

                x: {

                    type: 'linear',

                    title: {

                        display: true,

                        text: 'Environment Temperature (°C)',

                        color: '#66758a',

                        font: {
                            size: 14,
                            weight: '500'
                        }
                    },

                    grid: {

                        color:
                            'rgba(100, 116, 139, 0.07)',

                        drawBorder: false
                    },

                    ticks: {

                        color: '#8a96a6',

                        font: {
                            size: 9
                        },

                        maxTicksLimit: 7
                    },

                    grace: '8%'
                },

                y: {

                    title: {

                        display: true,

                        text: 'Body Temperature (°C)',

                        color: '#66758a',

                        font: {
                            size: 14,
                            weight: '500'
                        }
                    },

                    grid: {

                        color:
                            'rgba(100, 116, 139, 0.07)',

                        drawBorder: false
                    },

                    ticks: {

                        color: '#8a96a6',

                        font: {
                            size: 14,
                        },

                        maxTicksLimit: 6
                    },

                    grace: '8%'
                }
            }
        }
    });

// const bodyTempGraph = new Chart(trend2ctx, {
//     type: "line",

//     data: {
//         labels: trendLabels,

//         datasets: [
//             {
//                 label: "Environment Temperature (°C)",
//                 data: tempData,
//                 borderColor: "#b86fe0",
//                 backgroundColor: "rgba(53, 1, 46, 0.1)",
//                 borderWidth: 2,
//                 tension: 0,
//                 fill: false
//             },
//             {
//                 label: "Body Temperature (°C)",
//                 data: body_tempData,
//                 borderColor: "#e70585",
//                 backgroundColor: "rgba(69, 1, 35, 0)",
//                 borderWidth: 2,
//                 tension: 0.4,
//                 fill: false
//             }
//         ]
//     },

//     options: {
//         responsive: true,
//         plugins: {
//             legend: {
//                 display: true,
//                 position: "top"
//             }
//         },
//         scales: {
//             x: {
//                 grid: {
//                     color: "rgba(255,255,255,0.05)"
//                 },
//                 ticks: {
//                     color: "#94A3B8"
//                 }
//             },
//             y: {
//                 title: {
//                     display: true,
//                     text: "Temperature (°C)"
//                 },
//                 grid: {
//                     color: "rgba(6, 142, 215, 0.7)"
//                 },
//                 ticks: {
//                     color: "#94A3B8"
//                 }
//             }
//         }
//     }
// });
function showHistory() {
    // Just reveal the date picker — don't switch modes yet.
    // Live ECG keeps running until a date is actually chosen.
    document.getElementById("dateSelected").style.display = "block";
}

function loadLive() {
    mode = "live";
    document.getElementById("dateSelected").style.display = "none";
    document.getElementById('ecg-data').textContent = "Waiting for ECG data...";
    ecgLabels.length = 0;
    ecgData.length = 0;
    ecgGraph.update();
}

document.getElementById("dateSelected").addEventListener("change", function () {

     selectedHistoryDate  = this.value;
    
    console.log("Selected history date:", selectedHistoryDate);

    if (!selectedHistoryDate) return;

    mode = "history";


    
const patientId = document.getElementById("patientId").value;

fetch( `http://localhost:3000/records?patient=${patientId}&date=${selectedHistoryDate}`,{
    credentials: "include"
})       
       .then(res => res.json())
        .then(data => {

            console.log(data[0]);

            ecgLabels.length = 0;
            ecgData.length = 0;

            data.forEach(d => {
                ecgLabels.push('');
                ecgData.push(Number(d.ecg_value));
            });

            ecgGraph.update();
    if (data.length > 0) {

    // Get the most recent record for the selected date
    const latest = data[0];

    document.getElementById("tempValue").textContent =
        `${latest.env_temp}°C`;

    document.getElementById("humValue").textContent =
        `${latest.env_hum}%`;

    document.getElementById("aqiValue").textContent =
        `${latest.aqi} AQI`;

    document.getElementById("spo2Value").textContent =
        `${latest.SPO2}%`;

    document.getElementById("bpmValue").textContent =
        `${latest.heart_rate} BPM`;
        
    document.getElementById("body_temp").textContent =
        `${latest.body_temp}°C`;
}

            document.getElementById('ecg-data').textContent =
                data.length > 0
                    ? `ECG History for ${selectedHistoryDate }`
                    : `No data for ${selectedHistoryDate}`;
        })
        .catch(err => {
            console.error('Failed to fetch history:', err);
            document.getElementById('ecg-data').textContent = 'Failed to load history';
        });
    });
// function loadPatient() {
//     const patientId = document.getElementById("patientId").value.trim();
//     if (!patientId) {
//         alert("Please enter a patient ID");
//         return;
//     }
//     fetch(`http://localhost:3000/patients?patient_id=${patientId}`)
//     .then(res => res.json())
//     .then(data => {
//         console.log(data);

//     })
//     .catch(err => {
//         console.error(err);
//         alert("Patient not found ");
//     });

// };
async function loadPatient(patientId){

    try{

        const response = await fetch(
            `http://localhost:3000/patients?patient_id=${patientId}`,{
    credentials: "include"
}
        );

        const patient = await response.json();
        console.log(patient);

        document.getElementById("displayPatientID").textContent =
            patient.patient_id;

        document.getElementById("displayPatientName").textContent =
            patient.patient_name;

        document.getElementById("displayPatientAge").textContent =
            patient.age;

        document.getElementById("displayPatientGender").textContent =
            patient.gender;
        


    }
    catch(error){
        console.log(error);
    }

}

function submitButton(){
    console.log("Submit button clicked!");
    const patient_id = document.getElementById("idInput").value;
    const age = document.getElementById("ageInput").value;
    const gender = document.getElementById("genderInput").value;
    const patient_name= document.getElementById("nameInput").value;
    const height = document.getElementById("heightInput").value;
    const weight = document.getElementById("weightInput").value;
    const blood_pressure = document.getElementById("bloodPressureInput").value;

    console.log({
    patient_id,
    patient_name,
    age,
    gender,
    height,
    weight,
    blood_pressure
});

    fetch("http://localhost:3000/patients", {
    method: "POST",
    credentials: "include",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        patient_id: patient_id,
        patient_name: patient_name,
        age: age,
        gender: gender,
        height: height,
        weight: weight,
        blood_pressure: blood_pressure
    })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
.then(({ ok, data }) => {
    if (!ok) {
        alert(data.error || "Failed to register patient");
        return;
    }
    alert("Patient Registered");
    document.getElementById("modal").style.display = "none";
    document.getElementById("patientId").value = patient_id;
    loadPatient(patient_id);
})
.catch(console.error);
    // .then(res => res.json())
    // .then(data => {
    //     console.log(data);
    //     alert("Patient Registered");
    //     document.getElementById("modal").style.display = "none";
    //     document.getElementById("patientId").value = patient_id;
    //     loadPatient(patient_id);
    // })
    // .catch(console.error)
}
const startMonitoringButton = document.getElementById("startMonitoringButton");
document.getElementById("startMonitoringButton").addEventListener("click", () => {
    const patientId = document.getElementById("establishedIdInput").value.trim();
    if (!patientId) {
        alert("Please enter a patient ID");
        return;
    }
    fetch("http://localhost:3000/set-patient", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        document.getElementById("modal").style.display = "none";
        document.getElementById("patientId").value = patientId; // keeps the lookup field in sync
        loadPatient(patientId); // Load patient details after setting the patient
    })
    .catch(console.error);
});
async function loadDoctorInfo() {

    try {

        const response = await fetch(
            "http://localhost:3000/doctor-me",
            {
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            // window.location.href = "doctor-login.html";
            console.error("DOCTOR SESSION FAILED");
    console.error("Status:", response.status);
    console.error("Response:", data);

    alert("Doctor session failed. Check the console.");

            return;
        }

        console.log("Logged-in doctor:", data.doctor);

        document.getElementById("organizationName").textContent =
            data.doctor.organization_name;

    } catch (error) {

        console.error("Failed to load doctor:", error);

    }
}

loadDoctorInfo();
// startMonitoringButton.addEventListener("click", async()=>{

//     const patientId = document.getElementById("patient_id").value;
//     document.getElementById("displayPatientName").textContent =
//             patient.patient_name;

//         document.getElementById("displayPatientAge").textContent =
//             patient.age;

//         document.getElementById("displayPatientGender").textContent =
//             patient.gender;


//     await fetch("http://localhost:3000/set-patient",{
//         method:"POST",
//         headers:{
//             "Content-Type":"application/json"
//         },
//         body:JSON.stringify({
//             patient_id:patientId
//         })
//     });

//     loadPatient(patientId);

// })
