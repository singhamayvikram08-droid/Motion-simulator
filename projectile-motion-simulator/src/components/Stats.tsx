import { motion } from 'framer-motion';
import { Clock, ArrowUp, ArrowRight } from 'lucide-react';

interface StatsProps {
    u: number; theta: number; g: number; airResistance: boolean;
}

const Stats: React.FC<StatsProps> = ({ u, theta, g, airResistance }) => {
    const rad = theta * (Math.PI / 180);
    let T = (2 * u * Math.sin(rad)) / g;
    let H = (u ** 2 * Math.sin(rad) ** 2) / (2 * g);
    let R = (u ** 2 * Math.sin(2 * rad)) / g;

    if (airResistance) {
        const d = Math.max(0.4, 1 - u * 0.005);
        T *= d; H *= d * d; R *= d * d;
    }

    const cards = [
        { label: 'Time of Flight', symbol: 'T', value: T.toFixed(2), unit: 's', formula: 'T = (2u sinθ) / g', color: 'blue', Icon: Clock },
        { label: 'Max Height', symbol: 'H', value: H.toFixed(2), unit: 'm', formula: 'H = (u² sin²θ) / 2g', color: 'purple', Icon: ArrowUp },
        { label: 'Range', symbol: 'R', value: R.toFixed(2), unit: 'm', formula: 'R = (u² sin2θ) / g', color: 'green', Icon: ArrowRight },
    ];

    return (
        <div className="stats-grid">
            {cards.map((c, i) => (
                <motion.div
                    key={c.symbol}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200 }}
                    className={`stat-card glass ${c.color}`}
                >
                    <div className="stat-icon">
                        <c.Icon size={15} />
                        <span className="stat-label">{c.label}</span>
                    </div>
                    <div>
                        <span className={`stat-value ${c.color}`}>{c.value}</span>
                        <span className="stat-unit">{c.unit}</span>
                    </div>
                    <div className="stat-formula">
                        <span className="stat-formula-label">Formula</span>
                        <span className="stat-formula-text">{c.formula}</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default Stats;
