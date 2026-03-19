import { Sliders, Wind } from 'lucide-react';

interface SidebarProps {
    velocity: number; setVelocity: (v: number) => void;
    angle: number; setAngle: (a: number) => void;
    gravity: number; setGravity: (g: number) => void;
    timeStep: number; setTimeStep: (t: number) => void;
    airResistance: boolean; setAirResistance: (a: boolean) => void;
    saveTrajectory: () => void;
    clearTrajectories: () => void;
    savedCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
    velocity, setVelocity, angle, setAngle,
    gravity, setGravity, timeStep, setTimeStep,
    airResistance, setAirResistance,
    saveTrajectory, clearTrajectories, savedCount
}) => {
    const getPresetClass = (g: number) => {
        if (gravity !== g) return 'preset-btn';
        if (g === 9.8) return 'preset-btn active-earth';
        if (g === 3.7) return 'preset-btn active-mars';
        return 'preset-btn active-moon';
    };

    return (
        <div className="sidebar glass">
            <div className="sidebar-title">
                <Sliders size={16} /> Controls
            </div>

            {/* Velocity */}
            <div className="control-group">
                <div className="control-header">
                    <span className="control-label">Initial Velocity (u)</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        <input
                            type="number" className="control-input"
                            value={velocity}
                            onChange={e => setVelocity(Math.max(1, Math.min(150, Number(e.target.value))))}
                        />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>m/s</span>
                    </div>
                </div>
                <input type="range" min="1" max="150" value={velocity} onChange={e => setVelocity(Number(e.target.value))} />
            </div>

            {/* Angle */}
            <div className="control-group">
                <div className="control-header">
                    <span className="control-label">Angle of Projection (θ)</span>
                    <span className="control-value">{angle}°</span>
                </div>
                <input type="range" min="0" max="90" value={angle} onChange={e => setAngle(Number(e.target.value))} />
            </div>

            {/* Gravity */}
            <div className="control-group">
                <div className="control-header">
                    <span className="control-label">Gravity (g)</span>
                    <span className="control-value">{gravity} m/s²</span>
                </div>
                <input type="range" min="1" max="30" step="0.1" value={gravity} onChange={e => setGravity(Number(e.target.value))} />
                <div className="presets-grid">
                    <button className={getPresetClass(9.8)} onClick={() => setGravity(9.8)}>
                        <span className="preset-emoji">🌍</span>Earth
                    </button>
                    <button className={getPresetClass(3.7)} onClick={() => setGravity(3.7)}>
                        <span className="preset-emoji">🔴</span>Mars
                    </button>
                    <button className={getPresetClass(1.6)} onClick={() => setGravity(1.6)}>
                        <span className="preset-emoji">🌙</span>Moon
                    </button>
                </div>
            </div>

            <div className="divider" />

            <div className="section-label">✨ Advanced</div>

            {/* Time slider */}
            <div className="control-group">
                <div className="control-header">
                    <span className="control-label">⏱ Time Progress</span>
                    <span className="control-value">{timeStep}%</span>
                </div>
                <input type="range" min="0" max="100" value={timeStep} onChange={e => setTimeStep(Number(e.target.value))} />
            </div>

            {/* Air Resistance */}
            <label className="toggle-row">
                <div className={`toggle-track ${airResistance ? 'active' : ''}`} onClick={() => setAirResistance(!airResistance)}>
                    <div className="toggle-thumb" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Wind size={14} style={{ opacity: airResistance ? 1 : 0.4, color: airResistance ? '#a78bfa' : 'var(--text-muted)', transition: 'all 0.2s' }} />
                    <span className="toggle-label">Air Resistance</span>
                </div>
            </label>

            <div className="divider" />

            {/* Compare */}
            <div className="control-group">
                <span className="control-label">📊 Compare Trajectories</span>
                <div className="btn-row">
                    <button className="btn-primary" onClick={saveTrajectory} disabled={savedCount >= 5} style={{ flex: 1 }}>
                        + Save State
                    </button>
                    <button className="btn-secondary" onClick={clearTrajectories} disabled={savedCount === 0}>
                        Clear
                    </button>
                </div>
                {savedCount > 0 && (
                    <div className="dots-row">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={`dot ${i < savedCount ? 'active' : ''}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
