require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const pidusage = require("pidusage");
const { IsolationForest } = require("isolation-forest");
const psList = require("ps-list").default;
const WebSocket = require("ws");
const os = require("os");
const { exec } = require("child_process");
const promisify = require("util").promisify;
const execAsync = promisify(exec);

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
  timestamp: { type: Date, default: Date.now },
  status: String,
  priority: Number,
  user: String,
  command: String,
});

const Process = mongoose.model("Process", ProcessSchema);

// System Stats Schema
const SystemStatsSchema = new mongoose.Schema({
  cpu: Number,
  memory: Number,
  disk: Number,
  network: Number,
  timestamp: { type: Date, default: Date.now },
});

const SystemStats = mongoose.model("SystemStats", SystemStatsSchema);

// Function to get system-wide CPU usage
async function getSystemCPUUsage() {
  try {
    const { stdout } = await execAsync("top -l 1 | grep 'CPU usage'");
    const cpuUsage = stdout.match(/(\d+\.\d+)%/g).map(parseFloat);
    return cpuUsage.reduce((a, b) => a + b, 0);
  } catch (error) {
    console.error("Error getting CPU usage:", error);
    return 0;
  }
}

// Function to get system memory usage
function getSystemMemoryUsage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  return ((totalMemory - freeMemory) / totalMemory) * 100;
}

// Function to get disk usage
async function getDiskUsage() {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $5}'");
    return parseFloat(stdout);
  } catch (error) {
    console.error("Error getting disk usage:", error);
    return 0;
  }
}

// Function to get network usage
async function getNetworkUsage() {
  try {
    const { stdout } = await execAsync("netstat -ib | grep -e \"en0\" -m 1 | awk '{print $7}'");
    return parseFloat(stdout);
  } catch (error) {
    console.error("Error getting network usage:", error);
    return 0;
  }
}

// Function to fetch process statistics
async function getProcessData(pid) {
  if (!pid || isNaN(pid)) {
    return null;
  }

  try {
    const stats = await pidusage(pid);
    return stats;
  } catch (err) {
    // Silently skip processes that can't be monitored
    return null;
  }
}

// Enhanced anomaly detection
const detectAnomalies = async () => {
  const processes = await Process.find({}).sort({ timestamp: -1 }).limit(100);
  if (processes.length < 5) return [];

  const data = processes.map((p) => [p.cpu, p.memory, p.priority]);
  const model = new IsolationForest({
    contamination: 0.1,
    randomState: 42,
  });

  model.fit(data);
  const results = model.predict(data);

  return results
    .map((val, index) => (val === -1 ? processes[index]._id : null))
    .filter(Boolean);
};

// WebSocket setup
const wss = new WebSocket.Server({ port: 8081 });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  const sendUpdate = async () => {
    try {
      const processes = await Process.find({}).sort({ timestamp: -1 }).limit(50);
      const systemStats = await SystemStats.findOne().sort({ timestamp: -1 });
      ws.send(JSON.stringify({ processes, systemStats }));
    } catch (error) {
      console.error("Error sending WebSocket update:", error);
    }
  };

  const interval = setInterval(sendUpdate, 5000);
  ws.on("close", () => clearInterval(interval));
});

// Route to fetch and store process data
app.get("/processes", async (req, res) => {
  try {
    const runningProcesses = await psList();
    const processData = [];
    const validProcesses = [];

    // First pass: collect valid processes
    for (const proc of runningProcesses) {
      const { pid, name, ppid, priority, user, command } = proc;
      if (!pid) continue;

      const stats = await getProcessData(pid);
      if (stats) {
        validProcesses.push({
          name,
          pid,
          ppid,
          cpu: stats.cpu,
          memory: stats.memory,
          anomaly: false,
          status: "running",
          priority,
          user,
          command,
        });
      }
    }

    // Only proceed if we have valid processes
    if (validProcesses.length > 0) {
      // Store in MongoDB
      await Process.deleteMany({});
      await Process.insertMany(validProcesses);

      // Detect anomalies
      const anomalies = await detectAnomalies();
      await Process.updateMany({ _id: { $in: anomalies } }, { anomaly: true });

      // Get system stats
      const systemStats = {
        cpu: await getSystemCPUUsage(),
        memory: getSystemMemoryUsage(),
        disk: await getDiskUsage(),
        network: await getNetworkUsage(),
      };
      await SystemStats.create(systemStats);

      const updatedProcesses = await Process.find({});
      res.json({
        processes: updatedProcesses,
        systemStats,
        totalProcesses: runningProcesses.length,
        monitoredProcesses: validProcesses.length
      });
    } else {
      res.json({
        processes: [],
        systemStats: {
          cpu: 0,
          memory: 0,
          disk: 0,
          network: 0
        },
        totalProcesses: 0,
        monitoredProcesses: 0
      });
    }
  } catch (err) {
    console.error("❌ Error fetching processes:", err);
    res.status(500).json({
      error: "Internal Server Error",
      message: err.message
    });
  }
});

// Route to kill a process
app.post("/processes/:pid/kill", async (req, res) => {
  try {
    const { pid } = req.params;
    await execAsync(`kill -9 ${pid}`);
    res.json({ success: true, message: `Process ${pid} killed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to get process history
app.get("/processes/history", async (req, res) => {
  try {
    const history = await Process.find({})
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
