# VitalAI - Smart Health & Biomarkers Dashboard

A futuristic health companion and biomarker analytics dashboard featuring interactive metrics, AI health advisories, dynamic visualizations, and local-first persistence.

## Features

- **Biomarker Analytics**: Precision BMI calculation with metric & imperial unit support.
- **Body Fat Estimation**: Computed using the clinical Deurenberg formula.
- **Fitness & Vitality Score (0-100)**: Dynamic vitality rating weighted across BMI consistency and ideal body fat ratios.
- **Real-Time Biomarker Gauge**: Animated SVG circular meter with color-coded classification zones (Underweight, Normal, Overweight, Obese).
- **AI Health & Nutrition Advisor**: Multi-turn health planner and streaming advice powered by OpenRouter / LLM integrations.
- **Voice Input**: Web Speech API recognition for hands-free metric entry.
- **Analytics History**: Chart.js trend tracking showing historical BMI and fitness progression.
- **Interactive Audio Feedback**: Synthesized audio chimes powered by the Web Audio API.
- **Floating AI Assistant**: On-demand conversational health assistant.

## Quick Start

```bash
cd vital-ai
npm install
npm run dev
```

The application will launch locally at `http://localhost:3001`.

## Production Build

```bash
npm run build
npm run preview
```
