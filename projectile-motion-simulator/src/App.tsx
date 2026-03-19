import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Stats from './components/Stats';
import TrajectoryChart from './components/TrajectoryChart';
import { Moon, Sun, Download, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import './index.css';

export type TrajectoryData = {
  id: string;
  u: number;
  theta: number;
  g: number;
  color: string;
};

const COLORS = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa'];

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [velocity, setVelocity] = useState(50);
  const [angle, setAngle] = useState(45);
  const [gravity, setGravity] = useState(9.8);
  const [timeStep, setTimeStep] = useState(100);
  const [airResistance, setAirResistance] = useState(false);
  const [savedTrajectories, setSavedTrajectories] = useState<TrajectoryData[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const saveTrajectory = () => {
    if (savedTrajectories.length >= 5) return;
    setSavedTrajectories(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      u: velocity, theta: angle, g: gravity,
      color: COLORS[prev.length % COLORS.length]
    }]);
  };

  const clearTrajectories = () => setSavedTrajectories([]);

  const exportAsImage = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: isDarkMode ? '#060918' : '#f1f5f9',
    });
    const link = document.createElement('a');
    link.download = 'projectile-trajectory.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <>
      {/* Space background */}
      <div className="space-bg">
        <div className="stars" />
        <div className="orb-cyan" />
      </div>

      <div className="app-shell">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="header glass"
        >
          <div className="header-brand">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
            >
              <Rocket size={28} strokeWidth={2.5} style={{ color: '#818cf8' }} />
            </motion.div>
            <div>
              <h1 className="header-title">Projectile Motion Pro</h1>
              <p className="header-subtitle">Interactive Physics Simulation</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" onClick={exportAsImage} title="Export PNG">
              <Download size={18} style={{ color: '#818cf8' }} />
            </button>
            <button className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle theme">
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun size={18} style={{ color: '#fbbf24' }} />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon size={18} style={{ color: '#6366f1' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.header>

        {/* Dashboard */}
        <div className="dashboard">
          <div className="main-area">
            <motion.div
              ref={chartRef}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="chart-container glass"
            >
              <TrajectoryChart
                u={velocity} theta={angle} g={gravity}
                timeStep={timeStep} airResistance={airResistance}
                savedTrajectories={savedTrajectories} isDarkMode={isDarkMode}
              />
            </motion.div>
            <Stats u={velocity} theta={angle} g={gravity} airResistance={airResistance} />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <Sidebar
              velocity={velocity} setVelocity={setVelocity}
              angle={angle} setAngle={setAngle}
              gravity={gravity} setGravity={setGravity}
              timeStep={timeStep} setTimeStep={setTimeStep}
              airResistance={airResistance} setAirResistance={setAirResistance}
              saveTrajectory={saveTrajectory} clearTrajectories={clearTrajectories}
              savedCount={savedTrajectories.length}
            />
          </motion.div>
        </div>

        <footer className="footer">
          Built with React, Chart.js & Framer Motion · Physics Engine
        </footer>
      </div>
    </>
  );
}

export default App;
