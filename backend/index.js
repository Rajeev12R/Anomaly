require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const pidusage = require("pidusage");
const { IsolationForest } = require("isolation-forest");
const psList = require("ps-list").default; // ✅ Fixed Import

const app = express();
app.use(cors());
app.use(express.json());

// Load MongoDB URI from .env
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/processDB";
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define Mongoose Schema for Process Data
const ProcessSchema = new mongoose.Schema({
  name: String,
  pid: Number,
  cpu: Number,
  memory: Number,
  anomaly: Boolean,
});

const Process = mongoose.model("Process", ProcessSchema);

// Function to fetch process statistics
async function getProcessData(pid) {
  if (!pid || isNaN(pid)) {
    console.error(`❌ Invalid PID: ${pid}`);
    return null;
  }

  try {
    const stats = await pidusage(pid);
    return stats;
  } catch (err) {
    console.error(`⚠️ Error fetching process ${pid}:`, err.message);
    return null;
  }
}

// Function to detect anomalies using Isolation Forest
// Train an Anomaly Detection Model and Detect Anomalies
const detectAnomalies = async () => {
    const processes = await Process.find({});
    if (processes.length < 5) return []; // Not enough data for ML
  
    const data = processes.map((p) => [p.cpu, p.memory]);
    const model = new IsolationForest();
    
    // Train the model on the data
    model.fit(data);
    
    // Predict anomalies using the trained model
    const results = model.predict(data);
  
    // Return the process IDs that are detected as anomalies
    return results
      .map((val, index) => (val === -1 ? processes[index]._id : null))
      .filter(Boolean);
  };
  

// Route to fetch and store process data
app.get("/processes", async (req, res) => {
  try {
    const runningProcesses = await psList(); // ✅ Fetch running processes
    const processData = [];

    for (const proc of runningProcesses) {
      const { pid, name } = proc;
      if (!pid) continue; // Skip invalid PIDs

      const stats = await getProcessData(pid);
      if (stats) {
        processData.push({ 
          name, 
          pid, 
          cpu: stats.cpu, 
          memory: stats.memory, 
          anomaly: false 
        });
      }
    }

    // Store in MongoDB
    await Process.deleteMany({});
    await Process.insertMany(processData);

    // Detect anomalies
    const anomalies = await detectAnomalies();
    await Process.updateMany({ _id: { $in: anomalies } }, { anomaly: true });

    const updatedProcesses = await Process.find({});
    res.json(updatedProcesses);
  } catch (err) {
    console.error("❌ Error fetching processes:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
