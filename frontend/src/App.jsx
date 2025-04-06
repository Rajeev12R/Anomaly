import React, { useEffect, useState, useRef } from "react";
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
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';

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

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Dashboard Component
const Dashboard = () => {
  const [processes, setProcesses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    cpuCores: 1,
  });
  const [monitoringStats, setMonitoringStats] = useState({
    totalProcesses: 0,
    monitoredProcesses: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [cpuWaveData, setCpuWaveData] = useState([]);
  const [processWaveData, setProcessWaveData] = useState([]);
  const waveChartRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchProcesses();
    initializeWaveData();
  }, []);

  // Initialize wave data
  const initializeWaveData = () => {
    const initialData = Array(50).fill(0).map((_, i) => ({
      x: i,
      y: 0
    }));
    setCpuWaveData(initialData);
    setProcessWaveData(initialData);
  };

  // Update wave data
  const updateWaveData = (newValue, setData) => {
    setData(prevData => {
      const newData = [...prevData];
      newData.shift();
      newData.push({
        x: prevData[prevData.length - 1].x + 1,
        y: newValue
      });
      return newData;
    });
  };

  // Set up refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isUpdating) {
        fetchProcesses(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isUpdating]);

  const fetchProcesses = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setIsUpdating(true);
      const response = await axios.get("http://localhost:8080/processes");
      const { processes: processData, systemStats: stats, totalProcesses, monitoredProcesses } = response.data;

      // Calculate relative CPU usage
      const relativeCpu = stats.cpu / (stats.cpuCores || 1);

      // Update wave data with relative CPU usage
      updateWaveData(relativeCpu, setCpuWaveData);
      updateWaveData(monitoredProcesses, setProcessWaveData);

      // Smooth transition for system stats
      setSystemStats(prevStats => ({
        cpu: smoothTransition(prevStats.cpu, relativeCpu),
        memory: smoothTransition(prevStats.memory, stats.memory),
        disk: smoothTransition(prevStats.disk, stats.disk),
        network: smoothTransition(prevStats.network, stats.network),
        cpuCores: stats.cpuCores || prevStats.cpuCores,
      }));

      // Update processes with relative CPU usage
      const updatedProcesses = Array.isArray(processData)
        ? processData.map(proc => ({
          ...proc,
          relativeCpu: proc.cpu / (stats.cpuCores || 1)
        }))
        : [];

      setProcesses(updatedProcesses);
      setMonitoringStats({
        totalProcesses: totalProcesses || 0,
        monitoredProcesses: monitoredProcesses || 0,
      });

      if (showLoading) {
        setLoading(false);
      }
      setError(null);
    } catch (error) {
      console.error("Error fetching process data:", error);
      setError(error.response?.data?.message || "Failed to fetch process data");
      if (showLoading) {
        setLoading(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function for smooth transitions
  const smoothTransition = (oldValue, newValue) => {
    if (oldValue === undefined || newValue === undefined) return newValue;
    return oldValue + (newValue - oldValue) * 0.3; // Smooth transition factor
  };

  const filteredProcesses = Array.isArray(processes)
    ? processes.filter(proc =>
      proc.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : [];

  // Chart configuration
  const createChartConfig = (data, label, color, maxValue = 100) => ({
    type: 'line',
    data: {
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace('1)', '0.2)'),
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      scales: {
        x: {
          type: 'linear',
          display: true,
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            display: false
          }
        },
        y: {
          min: 0,
          max: maxValue,
          display: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            font: {
              size: 10
            },
            padding: 5
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function (context) {
              return `${label}: ${context.parsed.y.toFixed(2)}${label.includes('Usage') ? '%' : ''}`;
            }
          }
        }
      }
    }
  });

  const cpuChartConfig = createChartConfig(cpuWaveData, 'CPU Usage', 'rgba(75, 192, 192, 1)');
  const processChartConfig = createChartConfig(processWaveData, 'Process Count', 'rgba(255, 99, 132, 1)', monitoringStats.totalProcesses);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* System Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card sx={{ transition: 'all 0.3s ease-in-out' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU Usage
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({systemStats.cpuCores} cores)
                </Typography>
              </Typography>
              <Typography variant="h4" sx={{ transition: 'all 0.3s ease-in-out' }}>
                {systemStats.cpu.toFixed(2)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Relative to total capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ transition: 'all 0.3s ease-in-out' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Memory Usage</Typography>
              <Typography variant="h4" sx={{ transition: 'all 0.3s ease-in-out' }}>
                {systemStats.memory.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ transition: 'all 0.3s ease-in-out' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Disk Usage</Typography>
              <Typography variant="h4" sx={{ transition: 'all 0.3s ease-in-out' }}>
                {systemStats.disk.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ transition: 'all 0.3s ease-in-out' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Network Usage</Typography>
              <Typography variant="h4" sx={{ transition: 'all 0.3s ease-in-out' }}>
                {systemStats.network.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Process Monitoring and Wave Graphs */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            transition: 'all 0.3s ease-in-out',
            height: '100%',
            background: 'linear-gradient(145deg, rgba(30, 30, 30, 0.8), rgba(20, 20, 20, 0.8))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <CardContent>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                pb: 2,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Typography variant="h6" sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #2196F3, #21CBF3)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Process Monitoring
                </Typography>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CircularProgress
                    variant="determinate"
                    value={(monitoringStats.monitoredProcesses / monitoringStats.totalProcesses) * 100}
                    size={24}
                    thickness={4}
                    sx={{ color: '#21CBF3' }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {((monitoringStats.monitoredProcesses / monitoringStats.totalProcesses) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Total Processes
                    </Typography>
                    <Typography variant="h4" sx={{
                      fontWeight: 'bold',
                      color: '#21CBF3'
                    }}>
                      {monitoringStats.totalProcesses}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      System-wide processes
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Monitored Processes
                    </Typography>
                    <Typography variant="h4" sx={{
                      fontWeight: 'bold',
                      color: '#4CAF50'
                    }}>
                      {monitoringStats.monitoredProcesses}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Actively tracked
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Monitoring Status
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(monitoringStats.monitoredProcesses / monitoringStats.totalProcesses) * 100}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: 'linear-gradient(45deg, #2196F3, #21CBF3)'
                            }
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {monitoringStats.monitoredProcesses === 0
                          ? "No active monitoring"
                          : `${monitoringStats.monitoredProcesses} of ${monitoringStats.totalProcesses} processes`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      System Health
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2
                    }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {monitoringStats.monitoredProcesses === 0
                            ? "System monitoring inactive"
                            : monitoringStats.monitoredProcesses < monitoringStats.totalProcesses / 2
                              ? "Partial system coverage"
                              : "Full system coverage"}
                        </Typography>
                      </Box>
                      <Box sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: monitoringStats.monitoredProcesses === 0
                          ? '#f44336'
                          : monitoringStats.monitoredProcesses < monitoringStats.totalProcesses / 2
                            ? '#ff9800'
                            : '#4CAF50',
                        boxShadow: `0 0 8px ${monitoringStats.monitoredProcesses === 0
                          ? '#f44336'
                          : monitoringStats.monitoredProcesses < monitoringStats.totalProcesses / 2
                            ? '#ff9800'
                            : '#4CAF50'}`
                      }} />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ transition: 'all 0.3s ease-in-out', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Analysis</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ height: 150, position: 'relative', mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">CPU Usage</Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        {systemStats.cpu.toFixed(2)}%
                      </Typography>
                    </Box>
                    <Line ref={waveChartRef} data={cpuChartConfig.data} options={cpuChartConfig.options} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ height: 150, position: 'relative' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">Process Count</Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        {monitoringStats.monitoredProcesses} / {monitoringStats.totalProcesses}
                      </Typography>
                    </Box>
                    <Line ref={waveChartRef} data={processChartConfig.data} options={processChartConfig.options} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Process Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, transition: 'all 0.3s ease-in-out' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <TextField
                placeholder="Search processes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : processes.length === 0 ? (
              <Alert severity="info">No processes are currently being monitored</Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Process Name</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>CPU Usage</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Memory</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcesses.map((proc, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #333',
                          transition: 'all 0.3s ease-in-out',
                          opacity: isUpdating ? 0.7 : 1
                        }}
                      >
                        <td style={{ padding: '12px' }}>{proc.name}</td>
                        <td style={{ padding: '12px' }}>
                          {proc.relativeCpu.toFixed(2)}%
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({proc.cpu.toFixed(2)}% raw)
                          </Typography>
                        </td>
                        <td style={{ padding: '12px' }}>{proc.memory.toFixed(2)} MB</td>
                        <td style={{ padding: '12px' }}>
                          {proc.anomaly ? (
                            <Alert severity="warning">Anomaly Detected</Alert>
                          ) : (
                            <Alert severity="success">Normal</Alert>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={async () => {
                              try {
                                await axios.post(`http://localhost:8080/processes/${proc.pid}/kill`);
                                fetchProcesses(false);
                              } catch (error) {
                                console.error("Error killing process:", error);
                              }
                            }}
                          >
                            Kill
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
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
          className={`px-6 py-2 rounded-lg font-semibold transition ${chartType === "cpu" ? "bg-pink-500 text-white" : "bg-gray-700 hover:bg-gray-600"
            }`}
          onClick={() => setChartType("cpu")}
        >
          CPU Usage
        </button>
        <button
          className={`px-6 py-2 rounded-lg font-semibold transition ${chartType === "memory" ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600"
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
            className={`px-5 py-2 rounded-lg font-semibold transition ${selectedChart === type ? "bg-green-500 text-white" : "bg-gray-700 hover:bg-gray-600"
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

// Settings Page Component
const SettingsPage = () => {
  const [settings, setSettings] = useState({
    refreshInterval: 5000,
    maxProcesses: 50,
    theme: 'dark',
    notifications: true,
    anomalyThreshold: 0.1,
  });

  const handleSettingChange = (setting) => (event) => {
    setSettings({
      ...settings,
      [setting]: event.target.value,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={handleSettingChange('theme')}
                  label="Theme"
                >
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications}
                    onChange={handleSettingChange('notifications')}
                  />
                }
                label="Enable Notifications"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monitoring Settings
              </Typography>
              <Typography gutterBottom>
                Refresh Interval (ms)
              </Typography>
              <Slider
                value={settings.refreshInterval}
                onChange={handleSettingChange('refreshInterval')}
                min={1000}
                max={10000}
                step={1000}
                valueLabelDisplay="auto"
              />
              <Typography gutterBottom sx={{ mt: 2 }}>
                Maximum Processes to Display
              </Typography>
              <Slider
                value={settings.maxProcesses}
                onChange={handleSettingChange('maxProcesses')}
                min={10}
                max={100}
                step={10}
                valueLabelDisplay="auto"
              />
              <Typography gutterBottom sx={{ mt: 2 }}>
                Anomaly Detection Threshold
              </Typography>
              <Slider
                value={settings.anomalyThreshold}
                onChange={handleSettingChange('anomalyThreshold')}
                min={0.01}
                max={0.5}
                step={0.01}
                valueLabelDisplay="auto"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Process Monitor
            </Typography>
            <IconButton color="inherit" onClick={toggleTheme}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box sx={{ width: 250 }}>
            <List>
              <ListItem button component={Link} to="/">
                <ListItemIcon><DashboardIcon /></ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItem>
              <ListItem button component={Link} to="/charts">
                <ListItemIcon><BarChartIcon /></ListItemIcon>
                <ListItemText primary="Charts" />
              </ListItem>
              <ListItem button component={Link} to="/settings">
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
            </List>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
          <Router>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/charts" element={<ChartsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Router>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
