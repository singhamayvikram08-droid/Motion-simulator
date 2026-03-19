"use client";

import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Subject {
  id: string;
  name: string;
  conducted: number;
  attended: number;
  targetPercent: number;
  studyHours: number;
  pastMarks: number;
  prediction: {
    current_percent: number;
    classes_needed_for_target: number;
    safe_bunks_available: number;
  };
  predictedScore: number | null;
}

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<{ firstName: string } | null>(null);
  const [loginInput, setLoginInput] = useState("");

  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: "subj-1",
      name: "Mathematics",
      conducted: 0,
      attended: 0,
      targetPercent: 75,
      studyHours: 0,
      pastMarks: 0,
      prediction: { current_percent: 0, classes_needed_for_target: 0, safe_bunks_available: 0 },
      predictedScore: null
    }
  ]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("subj-1");

  const [newSubjectName, setNewSubjectName] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Theme State
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  // Helper to get active subject
  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  // Chat UI states
  const [chatOpen, setChatOpen] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const videoCallOpenRef = useRef(videoCallOpen);
  const [isMicActive, setIsMicActive] = useState(false);
  const isMicActiveRef = useRef(isMicActive);

  useEffect(() => { videoCallOpenRef.current = videoCallOpen; }, [videoCallOpen]);
  useEffect(() => { isMicActiveRef.current = isMicActive; }, [isMicActive]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'msg-ai', content: 'System online. How can I assist with your analytics today?' }
  ]);
  const [videoMessages, setVideoMessages] = useState<{ role: string, content: string }[]>([
    { role: 'msg-ai', content: 'Face-to-face assistance online. How can I help you today?' }
  ]);

  const handleSendChatRef = useRef<any>(null);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Detect Hindi characters
      const isHindi = /[\u0900-\u097F]/.test(text);

      // Voice Selection Logic for "Clear" Professional Voices
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (isHindi) {
        // High quality Hindi voices like Rishi or Lekha
        selectedVoice = voices.find(v => v.lang === 'hi-IN' && (v.name.includes('Rishi') || v.name.includes('Lekha'))) ||
          voices.find(v => v.lang === 'hi-IN');
        utterance.lang = 'hi-IN';
      } else {
        // High quality English voices like Siri, Alex, or Samantha (Premium)
        selectedVoice = voices.find(v => (v.name.includes('Siri') || v.name.includes('Alex') || v.name.includes('Samantha')) && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en'));
        utterance.lang = 'en-US';
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Optimal parameters for clarity
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Pre-load voices for lower latency and better selection
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => { window.speechSynthesis.onvoiceschanged = null; };
    }
  }, []);

  // Handle user media (camera/mic)
  const startMedia = async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setUserStream(stream);
      // Ensure tracks match initial state
      stream.getAudioTracks().forEach(t => t.enabled = isMicActive);
    } catch (err: any) {
      console.error("Error accessing media devices:", err);
      setMediaError(err.name === 'NotAllowedError' ? "Permission Denied" : "Device not found");
      speak("I couldn't access your camera or microphone. Please check your system settings.");
    }
  };

  const stopMedia = () => {
    if (userStream) {
      userStream.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      setUserStream(null);
    }
    // Force mic off if ending call
    setIsMicActive(false);
    if (recognition) {
      try { recognition.stop(); } catch (e) { }
    }
  };

  const toggleVideoCall = () => {
    const newState = !videoCallOpen;
    setVideoCallOpen(newState);
    if (newState) {
      startMedia();
      speak("Face-to-face assistance online. How can I help you today?");
    } else {
      stopMedia();
    }
  };

  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript.trim() && handleSendChatRef.current) {
          // Use Ref to get LATEST state and LATEST function
          handleSendChatRef.current(transcript.trim(), videoCallOpenRef.current ? 'video' : 'chat');
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') setIsMicActive(false);
      };

      rec.onend = () => {
        // Handle auto-restart if still active
        setRecognition((currentRec: any) => {
          if (isMicActiveRef.current && currentRec) {
            try { currentRec.start(); } catch (e) { }
          }
          return currentRec;
        });
      };

      setRecognition(rec);
      return () => {
        try { rec.stop(); } catch (e) { }
      };
    }
  }, []); // Stable initialization

  useEffect(() => {
    if (isMicActive && recognition) {
      try {
        recognition.start();
      } catch (e) { }
    } else if (!isMicActive && recognition) {
      try {
        recognition.stop();
      } catch (e) { }
    }
  }, [isMicActive, recognition]);

  const toggleMic = () => {
    const nextState = !isMicActive;
    setIsMicActive(nextState);

    if (nextState) {
      const msg = "Listening...";
      speak(msg);
      recognition?.start();
    } else {
      recognition?.stop();
    }

    // Sync state with physical stream
    if (userStream) {
      userStream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
  };

  // Handle adding a new subject
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;

    const newSubj: Subject = {
      id: `subj-${Date.now()}`,
      name: newSubjectName.trim(),
      conducted: 0,
      attended: 0,
      targetPercent: 75,
      studyHours: 0,
      pastMarks: 0,
      prediction: { current_percent: 0, classes_needed_for_target: 0, safe_bunks_available: 0 },
      predictedScore: null
    };

    setSubjects([...subjects, newSubj]);
    setActiveSubjectId(newSubj.id);
    setNewSubjectName("");
    setShowAddSubject(false);
  };

  const updateActiveSubject = (updates: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === activeSubjectId ? { ...s, ...updates } : s));
  };

  // Chart Data
  const chartData = {
    labels: subjects.map(s => s.name),
    datasets: [
      {
        label: 'Attendance %',
        data: subjects.map(s => s.prediction.current_percent),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        ticks: { color: 'var(--text-muted)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-muted)' }
      }
    }
  };

  const handleSendChat = async (directMsg?: string, source: 'chat' | 'video' = 'chat') => {
    const userMsg = directMsg || (source === 'chat' ? chatInput.trim() : videoInput.trim());
    if (!userMsg) return;

    if (!directMsg) {
      if (source === 'chat') setChatInput('');
      else setVideoInput('');
    }

    const newUserMessage = { role: 'msg-user', content: userMsg };
    const thinkingMessage = { role: 'msg-ai', content: 'Thinking...' };

    const setter = source === 'chat' ? setMessages : setVideoMessages;
    setter(prev => [...prev, newUserMessage, thinkingMessage]);

    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          subject_name: activeSubject.name,
          attendance_percent: activeSubject.prediction.current_percent,
          predicted_score: activeSubject.predictedScore,
          context: source // Pass context to backend if needed
        })
      });

      if (response.ok) {
        const data = await response.json();
        setter(prev => {
          const base = prev.filter(m => m.content !== 'Thinking...');
          return [...base, { role: 'msg-ai', content: data.response }];
        });

        // ONLY speak if it's a video interaction
        if (source === 'video' || videoCallOpen) {
          speak(data.response);
        }
      } else {
        const errorMsg = "I'm having trouble connecting to the twin protocol.";
        setter(prev => {
          const base = prev.filter(m => m.content !== 'Thinking...');
          return [...base, { role: 'msg-ai', content: errorMsg }];
        });
        if (source === 'video') speak(errorMsg);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const offlineMsg = "Connection offline.";
      setter(prev => {
        const base = prev.filter(m => m.content !== 'Thinking...');
        return [...base, { role: 'msg-ai', content: offlineMsg }];
      });
      if (source === 'video') speak(offlineMsg);
    }
  };

  useEffect(() => {
    handleSendChatRef.current = handleSendChat;
  }, [handleSendChat]);

  // Calculate attendance prediction
  useEffect(() => {
    if (activeSubject.conducted === 0 || activeSubject.attended > activeSubject.conducted) return;
    const fetchPrediction = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/predict/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conducted: activeSubject.conducted,
            attended: activeSubject.attended,
            target_percent: activeSubject.targetPercent
          })
        });
        if (response.ok) {
          const data = await response.json();
          updateActiveSubject({ prediction: data });
        }
      } catch (error) {
        console.error('Error fetching prediction:', error);
      }
    };
    const timeoutId = setTimeout(() => { fetchPrediction(); }, 500);
    return () => clearTimeout(timeoutId);
  }, [activeSubject.conducted, activeSubject.attended, activeSubject.targetPercent, activeSubjectId]);

  // Calculate Exam Score
  useEffect(() => {
    if (activeSubject.studyHours === 0 && activeSubject.pastMarks === 0) return;
    const fetchExamScore = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/predict/exam-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            study_hours: activeSubject.studyHours,
            past_marks: activeSubject.pastMarks,
            attendance_percent: activeSubject.prediction.current_percent || activeSubject.targetPercent
          })
        });
        if (response.ok) {
          const data = await response.json();
          updateActiveSubject({ predictedScore: data.predicted_score });
        }
      } catch (error) {
        console.error('Error fetching exam score:', error);
      }
    };
    const timeoutId = setTimeout(() => { fetchExamScore(); }, 500);
    return () => clearTimeout(timeoutId);
  }, [activeSubject.studyHours, activeSubject.pastMarks, activeSubject.prediction.current_percent, activeSubject.targetPercent, activeSubjectId]);

  useEffect(() => {
    setIsClient(true);
    const storedUser = localStorage.getItem('digital_twin_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = () => {
    if (loginInput.trim()) {
      const newUser = { firstName: loginInput.trim() };
      setUser(newUser);
      localStorage.setItem('digital_twin_user', JSON.stringify(newUser));
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginInput("");
    localStorage.removeItem('digital_twin_user');
  };

  if (!isClient) return null;

  return (
    <div className={`app-container ${isLightMode ? 'theme-transition' : 'theme-transition'}`}>
      {/* LOGIN OVERLAY */}
      {!user && (
        <div className="fullscreen-overlay">
          <div className="login-card">
            <i className="fa-solid fa-layer-group" style={{ fontSize: "3rem", color: "var(--accent-primary)", marginBottom: "1.5rem" }}></i>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Welcome to Nexus</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem" }}>Secure access to your Digital Twin analytics.</p>

            <div className="modern-input-group" style={{ width: "100%", textAlign: "left", marginBottom: "1.5rem" }}>
              <label htmlFor="login-name">Identifier</label>
              <input
                className="modern-input"
                type="text"
                id="login-name"
                placeholder="Enter your first name"
                autoComplete="off"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <button className="btn-primary" style={{ width: "100%" }} onClick={handleLogin}>
              Authenticate <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION */}
      <header className="top-nav">
        <a href="#" className="brand-logo">
          <i className="fa-solid fa-layer-group brand-icon"></i>
          Twin.ai
        </a>
        <div className="nav-actions">
          <button className="btn-icon" style={{ color: videoCallOpen ? "var(--status-success)" : "var(--accent-primary)" }} onClick={toggleVideoCall} title="AI Video Call">
            <i className="fa-solid fa-video"></i>
          </button>
          <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
            <i className={`fa-solid ${isLightMode ? 'fa-moon' : 'fa-sun'}`}></i>
          </button>
          <div className="user-profile">
            <div className="user-avatar">
              {user ? user.firstName.substring(0, 2).toUpperCase() : "ST"}
            </div>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, display: "none" }} className="sm-block">
              {user?.firstName}
            </span>
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: "0.5rem" }}>
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT DASHBOARD */}
      <main className="main-wrapper">

        {/* Header / Subject Tabs */}
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>Predictive Analytics</h1>

          <div className="subject-nav">
            {subjects.map(subj => (
              <button
                key={subj.id}
                className={`subject-tab ${activeSubjectId === subj.id ? 'active' : ''}`}
                onClick={() => setActiveSubjectId(subj.id)}
              >
                <i className="fa-solid fa-book"></i> {subj.name}
              </button>
            ))}

            {!showAddSubject ? (
              <button className="subject-add-btn" onClick={() => setShowAddSubject(true)}>
                <i className="fa-solid fa-plus"></i> Add
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.25rem", borderRadius: "var(--radius-full)", border: "1px solid var(--border-color)" }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Subject name"
                  className="modern-input"
                  style={{ padding: "0.25rem 0.75rem", background: "transparent", border: "none", width: "120px" }}
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                />
                <button className="btn-icon" style={{ width: "24px", height: "24px", color: "var(--accent-cyan)" }} onClick={handleAddSubject}><i className="fa-solid fa-check"></i></button>
                <button className="btn-icon" style={{ width: "24px", height: "24px", color: "var(--status-danger)" }} onClick={() => setShowAddSubject(false)}><i className="fa-solid fa-xmark"></i></button>
              </div>
            )}
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="bento-grid">

          {/* Data Entry Card (Left Column) */}
          <div className="bento-card col-span-4">
            <h3 className="card-title"><i className="fa-solid fa-sliders"></i> Context Parameters</h3>
            <div className="input-stack">
              <div className="modern-input-group">
                <label>Classes Conducted</label>
                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  value={activeSubject.conducted || ''}
                  onChange={(e) => updateActiveSubject({ conducted: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="modern-input-group">
                <label>Classes Attended</label>
                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  value={activeSubject.attended || ''}
                  onChange={(e) => updateActiveSubject({ attended: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="modern-input-group">
                <label>Required Target (%)</label>
                <input
                  className="modern-input"
                  type="number"
                  min="1"
                  max="100"
                  value={activeSubject.targetPercent}
                  onChange={(e) => updateActiveSubject({ targetPercent: parseInt(e.target.value) || 75 })}
                />
              </div>
            </div>
          </div>

          {/* Predictions & Progress (Middle Column) */}
          <div className="bento-card col-span-8" style={{ gap: "2rem" }}>
            <div>
              <h3 className="card-title"><i className="fa-solid fa-chart-pie"></i> Real-time Telemetry</h3>
              <div className="progress-container">
                <div className="progress-header">
                  <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>Current Attendance</span>
                  <span className="progress-value">{activeSubject.prediction.current_percent}%</span>
                </div>
                <div className="progress-track" style={{ marginTop: "0.5rem" }}>
                  <div
                    className={`progress-fill ${activeSubject.prediction.current_percent >= activeSubject.targetPercent ? 'success' : 'danger'}`}
                    style={{ width: `${Math.min(activeSubject.prediction.current_percent, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat-box">
                <span className="stat-value">{activeSubject.prediction.classes_needed_for_target}</span>
                <span className="stat-label">Classes Needed to Reach Target</span>
              </div>
              <div className="stat-box">
                <span className="stat-value" style={{ color: "var(--accent-cyan)" }}>{activeSubject.prediction.safe_bunks_available}</span>
                <span className="stat-label">Safe Leaves Available</span>
              </div>
            </div>
          </div>

          {/* Exam Predictor */}
          <div className="bento-card col-span-6">
            <h3 className="card-title"><i className="fa-solid fa-brain"></i> Exam AI Modeler</h3>
            <div className="input-stack" style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
              <div className="modern-input-group" style={{ flex: 1 }}>
                <label>Daily Study Time (hrs)</label>
                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  max="24"
                  value={activeSubject.studyHours || ''}
                  onChange={(e) => updateActiveSubject({ studyHours: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="modern-input-group" style={{ flex: 1 }}>
                <label>Past Average Score</label>
                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  max="100"
                  value={activeSubject.pastMarks || ''}
                  onChange={(e) => updateActiveSubject({ pastMarks: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-base)", borderRadius: "var(--radius-md)", border: "1px dashed var(--accent-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: 500 }}>Projected Result</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent-primary)" }}>
                {activeSubject.predictedScore !== null ? `${activeSubject.predictedScore}%` : 'Waiting for Data...'}
              </span>
            </div>
          </div>

          {/* Chart Overview */}
          <div className="bento-card col-span-6">
            <h3 className="card-title"><i className="fa-solid fa-chart-line"></i> Cross-Subject Distribution</h3>
            <div style={{ height: "200px", width: "100%" }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* AI Presence Card */}
          <div className="bento-card col-span-12" style={{ background: "linear-gradient(90deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)", borderColor: "var(--accent-primary)", borderStyle: "dashed", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div className="ai-avatar-pulse" style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}>
                <i className="fa-solid fa-robot"></i>
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>AI Digital Twin Active</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Face-to-face assistance is ready for your attendance queries.</p>
              </div>
            </div>
            <button className="btn-primary" onClick={toggleVideoCall}>
              <i className="fa-solid fa-video"></i> Launch Video Consult
            </button>
          </div>

        </div>
      </main>

      {/* CHATBOT PILL */}
      <div className="chat-wrapper">
        <div className={`chat-panel ${chatOpen ? '' : 'hidden'}`}>
          <div className="chat-header">
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-wave-square" style={{ color: "var(--accent-cyan)" }}></i> Twin Protocol
            </h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn-icon" style={{ width: "24px", height: "24px", color: videoCallOpen ? "var(--status-success)" : "var(--accent-primary)" }} onClick={toggleVideoCall} title="Start Video Call">
                <i className="fa-solid fa-video"></i>
              </button>
              <button className="btn-icon" style={{ width: "24px", height: "24px" }} onClick={() => setChatOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="chat-input-box">
            <button
              className={`btn-icon ${isMicActive ? 'pulse-mic' : ''}`}
              style={{ width: "32px", height: "32px", color: isMicActive ? "var(--status-danger)" : "var(--accent-cyan)" }}
              onClick={toggleMic}
              title="Voice Input"
            >
              <i className="fa-solid fa-microphone"></i>
            </button>
            <input
              type="text"
              placeholder={`Query ${activeSubject.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <button className="btn-icon" style={{ background: "var(--accent-primary)", color: "white" }} onClick={() => handleSendChat()}>
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>

        {!chatOpen && (
          <button className="chat-pill-btn" onClick={() => setChatOpen(true)}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--accent-cyan)" }}></i> System Assistant
          </button>
        )}
      </div>

      {/* VIDEO CALL MODAL */}
      {videoCallOpen && (
        <div className="video-overlay">
          <div className="video-container">
            <div className="chat-header" style={{ padding: "1.5rem", borderBottom: "none" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="fa-solid fa-video" style={{ color: "var(--accent-primary)" }}></i> AI Video Consult
                </h3>
                <span style={{ fontSize: "0.875rem", color: "var(--status-success)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
                  <i className="fa-solid fa-circle" style={{ fontSize: "0.5rem" }}></i> Secure Connection Established
                </span>
              </div>
              <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>00:15</span>
            </div>

            <div className="video-main" style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "1rem", flex: 1, minHeight: 0 }}>
              <div style={{ position: "relative", height: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--bg-base)" }}>
                <div className={`ai-avatar-pulse ${isSpeaking ? 'ai-active-motion' : ''}`} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                  <img
                    src="/robot-avatar.png"
                    alt="AI Robot"
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                    className={isSpeaking ? 'robot-movement' : ''}
                  />
                </div>

                <div className="user-pip" style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "120px", height: "160px", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", border: "2px solid var(--accent-primary)", zIndex: 10 }}>
                  {userStream ? (
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={video => { if (video) video.srcObject = userStream; }}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", padding: "10px" }}>
                      <i className="fa-solid fa-user-slash" style={{ fontSize: "1.5rem", color: "var(--text-muted)", marginBottom: "5px" }}></i>
                      {mediaError && <p style={{ fontSize: "0.65rem", color: "var(--status-danger)", fontWeight: 600 }}>{mediaError}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* VIDEO CHAT TRANSCRIPT */}
              <div className="video-chat-pane" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", border: "1px solid var(--border-color)" }}>
                <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {videoMessages.map((msg, i) => (
                    <div key={i} className={`msg-bubble ${msg.role}`} style={{ maxWidth: "100%", fontSize: "0.875rem" }}>
                      {msg.content}
                    </div>
                  ))}
                </div>
                <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border-color)", display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Ask the bot..."
                    className="modern-input"
                    style={{ flex: 1, background: "var(--bg-base)", fontSize: "0.875rem" }}
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat(undefined, 'video')}
                  />
                  <button className="btn-icon" style={{ background: "var(--accent-primary)", color: "white" }} onClick={() => handleSendChat(undefined, 'video')}>
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="video-controls">
              <button className={`btn-control ${isMicActive ? 'active' : ''}`} onClick={toggleMic} title="Toggle Microphone">
                <i className={`fa-solid ${isMicActive ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
              </button>
              <button className="btn-control" onClick={() => { stopMedia(); startMedia(); }} title="Reset Camera">
                <i className="fa-solid fa-video"></i>
              </button>
              <button className="btn-control"><i className="fa-solid fa-closed-captioning"></i></button>
              <button className="btn-control btn-end-call" onClick={toggleVideoCall} title="End Call">
                <i className="fa-solid fa-phone-slash"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
