import { useMemo } from 'react';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import type { TrajectoryData } from '../App';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
    u: number; theta: number; g: number;
    timeStep: number; airResistance: boolean;
    savedTrajectories: TrajectoryData[]; isDarkMode: boolean;
}

const genPoints = (vel: number, angDeg: number, grav: number, hasAir: boolean) => {
    const rad = angDeg * (Math.PI / 180);
    const R0 = (vel ** 2 * Math.sin(2 * rad)) / grav;
    const H0 = (vel ** 2 * Math.sin(rad) ** 2) / (2 * grav);
    const drag = hasAir ? Math.max(0.4, 1 - vel * 0.005) : 1;
    const actualR = R0 * (hasAir ? drag ** 2 : 1);
    const actualH = H0 * (hasAir ? drag ** 2 : 1);

    const pts: { x: number; y: number }[] = [];
    let maxPt = { x: 0, y: 0 };
    const n = 120;
    const step = actualR / n;

    for (let x = 0; x <= actualR; x += step) {
        let y: number;
        if (hasAir) {
            const t = x / actualR;
            y = 4 * actualH * t * (1 - t);
        } else {
            y = x * Math.tan(rad) - (grav * x ** 2) / (2 * vel ** 2 * Math.cos(rad) ** 2);
        }
        if (y > maxPt.y) maxPt = { x, y };
        pts.push({ x, y: Math.max(0, y) });
    }
    if (pts.length > 0 && pts[pts.length - 1].y > 0.1) pts.push({ x: actualR, y: 0 });

    return { pts, actualR, H: actualH, maxPt };
};

const TrajectoryChart: React.FC<Props> = ({ u, theta, g, timeStep, airResistance, savedTrajectories, isDarkMode }) => {
    const data = useMemo(() => genPoints(u, theta, g, airResistance), [u, theta, g, airResistance]);

    const savedDS = useMemo(() =>
        savedTrajectories.map(t => {
            const d = genPoints(t.u, t.theta, t.g, airResistance);
            return {
                label: `u=${t.u} θ=${t.theta}° g=${t.g}`,
                data: d.pts,
                borderColor: t.color,
                borderWidth: 2,
                borderDash: [6, 4],
                pointRadius: 0,
                showLine: true,
                fill: false,
            };
        }), [savedTrajectories, airResistance]);

    const idx = Math.min(Math.floor((timeStep / 100) * (data.pts.length - 1)), data.pts.length - 1);
    const active = data.pts[idx];
    const trail = data.pts.slice(0, idx + 1);

    const datasets = [
        // Active trail (glowing)
        {
            label: 'Trail',
            data: trail,
            borderColor: isDarkMode ? 'rgba(167, 139, 250, 0.9)' : 'rgba(99, 102, 241, 0.9)',
            borderWidth: 3,
            pointRadius: 0,
            showLine: true,
            fill: false,
            tension: 0.3,
        },
        // Projectile
        {
            label: 'Projectile',
            data: [active],
            backgroundColor: '#f43f5e',
            borderColor: isDarkMode ? 'rgba(244, 63, 94, 0.3)' : '#fff',
            borderWidth: isDarkMode ? 6 : 3,
            pointRadius: 9,
            pointHoverRadius: 12,
            showLine: false,
        },
        // Max Height star
        {
            label: 'Max Height',
            data: [data.maxPt],
            backgroundColor: '#fbbf24',
            borderColor: 'rgba(251, 191, 36, 0.25)',
            borderWidth: 4,
            pointStyle: 'star' as const,
            pointRadius: 12,
            pointHoverRadius: 14,
            showLine: false,
        },
        // Full trajectory (faded)
        {
            label: 'Trajectory',
            data: data.pts,
            borderColor: isDarkMode ? 'rgba(129, 140, 248, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            backgroundColor: isDarkMode ? 'rgba(129, 140, 248, 0.04)' : 'rgba(99, 102, 241, 0.04)',
            borderWidth: 2,
            pointRadius: 0,
            showLine: true,
            fill: true,
            tension: 0.3,
        },
        ...savedDS,
    ];

    const opts: ChartOptions<'scatter'> = {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.innerWidth < 768 ? 1.2 : 2,
        animation: { duration: 0 },
        layout: { padding: { top: 15, right: 15, bottom: 5, left: 5 } },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDarkMode ? 'rgba(226,232,240,0.5)' : 'rgba(71,85,105,0.6)',
                    font: { family: 'Inter', size: 11 },
                    padding: 14,
                    usePointStyle: true,
                    pointStyleWidth: 8,
                },
            },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(6,9,24,0.95)' : 'rgba(255,255,255,0.95)',
                titleColor: isDarkMode ? '#e2e8f0' : '#1e293b',
                bodyColor: isDarkMode ? '#94a3b8' : '#475569',
                borderColor: isDarkMode ? 'rgba(129,140,248,0.2)' : 'rgba(99,102,241,0.15)',
                borderWidth: 1,
                cornerRadius: 10,
                padding: 10,
                bodyFont: { family: 'JetBrains Mono', size: 11 },
                callbacks: {
                    label: ctx => `Dist: ${ctx.parsed.x?.toFixed(1) ?? 0}m · Height: ${ctx.parsed.y?.toFixed(1) ?? 0}m`,
                },
            },
        },
        scales: {
            x: {
                type: 'linear',
                title: { display: true, text: 'Distance (m)', color: isDarkMode ? '#475569' : '#94a3b8', font: { family: 'Inter', size: 12, weight: 'bold' as const } },
                grid: { color: isDarkMode ? 'rgba(51,65,85,0.25)' : 'rgba(226,232,240,0.5)' },
                ticks: { color: isDarkMode ? '#334155' : '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
                min: 0,
                max: Math.ceil((data.actualR * 1.1) / 10) * 10,
            },
            y: {
                title: { display: true, text: 'Height (m)', color: isDarkMode ? '#475569' : '#94a3b8', font: { family: 'Inter', size: 12, weight: 'bold' as const } },
                grid: { color: isDarkMode ? 'rgba(51,65,85,0.25)' : 'rgba(226,232,240,0.5)' },
                ticks: { color: isDarkMode ? '#334155' : '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
                min: 0,
                max: Math.ceil((data.H * 1.3) / 5) * 5,
            },
        },
    };

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
            <Scatter data={{ datasets: datasets as any }} options={opts} />
        </div>
    );
};

export default TrajectoryChart;
