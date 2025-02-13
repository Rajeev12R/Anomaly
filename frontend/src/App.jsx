import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Bar, Line, Pie, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement
);

// 🏠 Home Page - Table View
const HomePage = () => {
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get("http://localhost:8080/processes");
      setProcesses(response.data);
    } catch (error) {
      console.error("Error fetching process data", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">📋 Process Table</h1>

      {/* Navigation to Chart Page */}
      <div className="flex justify-center mb-4">
        <Link to="/charts" className="px-6 py-3 bg-blue-500 rounded-lg text-white font-semibold hover:bg-blue-600">
          View Charts 📊
        </Link>
      </div>

      {/* Process Table */}
      <div className="overflow-x-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="py-3 px-4 border-b-2 border-gray-600">Process Name</th>
              {/* <th className="py-3 px-4 border-b-2 border-gray-600">PID</th> */}
              <th className="py-3 px-4 border-b-2 border-gray-600">CPU Usage (%)</th>
              <th className="py-3 px-4 border-b-2 border-gray-600">Memory (MB)</th>
              <th className="border p-3">Anomaly</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((proc, index) => (
              <tr key={index} className="hover:bg-gray-700">
                <td className="py-3 px-4 border border-gray-600">{proc.name}</td>
                {/* <td className="py-3 px-4 border border-gray-600">{proc.pid}</td> */}
                <td className="py-3 px-4 border border-gray-600">{proc.cpu}%</td>
                <td className="py-3 px-4 border-t border-l border-b border-gray-600">{proc.memory} MB</td>
                <td className="border border-white p-3 font-bold">
                  {proc.anomaly ? <span className="text-yellow-300">⚠️ Yes</span> : <span className="text-green-400">✅ No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 📊 Charts Page
const ChartsPage = () => {
  const [processes, setProcesses] = useState([]);
  const [chartType, setChartType] = useState("cpu");
  const [selectedChart, setSelectedChart] = useState("bar");

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      const response = await axios.get("http://localhost:8080/processes");
      setProcesses(response.data);
    } catch (error) {
      console.error("Error fetching process data", error);
    }
  };

  const labels = processes.map((proc) => proc.name);
  const dataValues = chartType === "cpu" ? processes.map((proc) => proc.cpu) : processes.map((proc) => proc.memory);

  const chartData = {
    labels,
    datasets: [
      {
        label: chartType === "cpu" ? "CPU Usage (%)" : "Memory Usage (MB)",
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 159, 64, 0.8)",
        ],
        borderColor: "rgba(255,255,255,0.3)",
        borderWidth: 1.5,
        data: dataValues,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">📊 Process Charts</h1>

      {/* Navigation Back to Table */}
      <div className="flex justify-center mb-4">
        <Link to="/" className="px-6 py-3 bg-green-500 rounded-lg text-white font-semibold hover:bg-green-600">
          Back to Table 📋
        </Link>
      </div>

      {/* CPU vs Memory Toggle */}
      <div className="flex justify-center space-x-4 mb-6">
        <button
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            chartType === "cpu" ? "bg-pink-500 text-white" : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => setChartType("cpu")}
        >
          CPU Usage
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            chartType === "memory" ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => setChartType("memory")}
        >
          Memory Usage
        </button>
      </div>

      {/* Select Chart Type */}
      <div className="flex justify-center space-x-4 mb-6">
        {["bar", "line", "pie", "radar"].map((type) => (
          <button
            key={type}
            className={`px-5 py-2 rounded-lg font-semibold transition ${
              selectedChart === type ? "bg-green-500 text-white" : "bg-gray-700 hover:bg-gray-600"
            }`}
            onClick={() => setSelectedChart(type)}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart Display */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          {chartType === "cpu" ? "📊 CPU Usage" : "📊 Memory Usage"} - {selectedChart.toUpperCase()} Chart
        </h2>
        <div className="h-80 flex justify-center">
          {selectedChart === "bar" && <Bar data={chartData} />}
          {selectedChart === "line" && <Line data={chartData} />}
          {selectedChart === "pie" && <Pie data={chartData} />}
          {selectedChart === "radar" && <Radar data={chartData} />}
        </div>
      </div>
    </div>
  );
};

// 🏗️ Main App
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/charts" element={<ChartsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
