document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const heightUnitRadios = document.querySelectorAll('input[name="heightUnit"]');
    const cmGroup = document.getElementById('cmGroup');
    const ftGroup = document.getElementById('ftGroup');
    const heightCm = document.getElementById('heightCm');
    const heightFt = document.getElementById('heightFt');
    const heightIn = document.getElementById('heightIn');
    const weightKg = document.getElementById('weightKg');
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const themeToggle = document.getElementById('themeToggle');
    const historyBtn = document.getElementById('historyBtn');
    const closeModal = document.getElementById('closeModal');
    const historyModal = document.getElementById('historyModal');
    const resultCard = document.getElementById('resultCard');
    const resultContent = document.querySelector('.result-content');
    const resultPlaceholder = document.querySelector('.result-placeholder');
    const gaugeProgress = document.getElementById('gaugeProgress');
    const bmiScore = document.getElementById('bmiScore');
    const bmiLabel = document.getElementById('bmiLabel');
    const healthAdvice = document.getElementById('healthAdvice');
    const idealWeight = document.getElementById('idealWeight');
    const dailyCal = document.getElementById('dailyCal');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const successSound = document.getElementById('successSound');

    // --- State ---
    let history = JSON.parse(localStorage.getItem('bmi_history') || '[]');
    let currentTheme = localStorage.getItem('theme') || 'dark';

    // --- Initialization ---
    if (currentTheme === 'light') toggleTheme(true);
    updateHistoryList();

    // --- Event Listeners ---
    heightUnitRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'cm') {
                cmGroup.classList.remove('hidden');
                ftGroup.classList.add('hidden');
            } else {
                cmGroup.classList.add('hidden');
                ftGroup.classList.remove('hidden');
            }
        });
    });

    calculateBtn.addEventListener('click', calculateBMI);
    resetBtn.addEventListener('click', resetForm);
    themeToggle.addEventListener('click', () => toggleTheme());
    historyBtn.addEventListener('click', () => historyModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => historyModal.classList.add('hidden'));
    clearHistoryBtn.addEventListener('click', clearHistory);

    // Enter key listener
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') calculateBMI();
    });

    // --- Main Logic ---
    function calculateBMI() {
        const hUnit = document.querySelector('input[name="heightUnit"]:checked').value;
        let finalHeightCm = 0;
        let weight = parseFloat(weightKg.value);

        if (hUnit === 'cm') {
            finalHeightCm = parseFloat(heightCm.value);
        } else {
            const ft = parseFloat(heightFt.value) || 0;
            const inch = parseFloat(heightIn.value) || 0;
            finalHeightCm = (ft * 30.48) + (inch * 2.54);
        }

        if (!finalHeightCm || !weight || finalHeightCm < 50 || weight < 10) {
            showToast('Please enter valid measurements.', 'error');
            return;
        }

        // Show loading state
        calculateBtn.disabled = true;
        calculateBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Calculating...';
        lucide.createIcons();

        setTimeout(() => {
            const bmi = weight / ((finalHeightCm / 100) ** 2);
            displayResult(bmi, finalHeightCm, weight);
            saveToHistory(bmi);

            // Success feedback
            successSound.play();
            if (window.navigator.vibrate) window.navigator.vibrate(100);

            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '<span>Calculate Now</span><i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }, 800);
    }

    function displayResult(bmi, hCm, wKg) {
        resultCard.classList.remove('empty');
        resultPlaceholder.classList.add('hidden');
        resultContent.classList.remove('hidden');

        // Animate counter
        animateCounter(bmiScore, bmi);

        // Update Gauges & Categories
        const status = getBMIStatus(bmi);
        bmiLabel.textContent = status.label;
        bmiLabel.style.color = `var(--${status.id})`;

        // Gauge fill animation
        const circleLength = 283;
        // Map BMI 15-40 to gauge percentage
        const safeBmi = Math.min(Math.max(bmi, 15), 40);
        const percent = (safeBmi - 15) / (40 - 15);
        const offset = circleLength - (percent * circleLength);
        gaugeProgress.style.strokeDashoffset = offset;
        gaugeProgress.style.stroke = `var(--${status.id})`;

        // Active indicator
        document.querySelectorAll('.indicator').forEach(i => {
            i.classList.remove('active');
            if (i.dataset.cat === status.label) i.classList.add('active', status.id);
        });

        // Advanced metrics
        const idealMin = (18.5 * ((hCm / 100) ** 2)).toFixed(1);
        const idealMax = (24.9 * ((hCm / 100) ** 2)).toFixed(1);
        idealWeight.textContent = `${idealMin} - ${idealMax} kg`;

        const bmr = (10 * wKg) + (6.25 * hCm) - (5 * 25) + 5; // Basal estimate
        dailyCal.textContent = `${Math.round(bmr * 1.3)} kcal`;

        healthAdvice.textContent = status.advice;
    }

    function getBMIStatus(bmi) {
        if (bmi < 18.5) return {
            id: 'underweight', label: 'Underweight',
            advice: 'Consider consulting a nutritionist to plan a weight gain strategy through healthy caloric intake.'
        };
        if (bmi < 25) return {
            id: 'normal', label: 'Normal',
            advice: 'Fantastic! You are in the healthy range. Maintain your active lifestyle and balanced diet.'
        };
        if (bmi < 30) return {
            id: 'overweight', label: 'Overweight',
            advice: 'Focus on regular cardiovascular exercise and mindful portion control for gradual weight management.'
        };
        return {
            id: 'obese', label: 'Obese',
            advice: 'Consider working with health professionals for a sustainable exercise and wellness plan.'
        };
    }

    function animateCounter(el, val) {
        let current = 0;
        const target = val;
        const step = target / 50;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                el.textContent = target.toFixed(1);
                clearInterval(timer);
            } else {
                el.textContent = current.toFixed(1);
            }
        }, 20);
    }

    function resetForm() {
        heightCm.value = '';
        heightFt.value = '';
        heightIn.value = '';
        weightKg.value = '';
        resultCard.classList.add('empty');
        resultPlaceholder.classList.remove('hidden');
        resultContent.classList.add('hidden');
        showToast('Form reset successfully', 'info');
    }

    function toggleTheme(forceLight = false) {
        if (forceLight || document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            document.getElementById('themeIcon').setAttribute('data-lucide', 'sun');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            document.getElementById('themeIcon').setAttribute('data-lucide', 'moon');
            localStorage.setItem('theme', 'dark');
        }
        lucide.createIcons();
    }

    function saveToHistory(bmi) {
        const item = {
            bmi: bmi.toFixed(1),
            date: new Date().toLocaleString(),
            id: Date.now()
        };
        history.unshift(item);
        if (history.length > 10) history.pop();
        localStorage.setItem('bmi_history', JSON.stringify(history));
        updateHistoryList();
    }

    function updateHistoryList() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No history recorded yet.</div>';
            return;
        }
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <span class="bmi-label">${item.bmi} BMI</span>
                    <span class="date">${item.date}</span>
                </div>
                <div class="history-bmi" style="color:var(--${getBMIStatus(parseFloat(item.bmi)).id})">
                    ${getBMIStatus(parseFloat(item.bmi)).label}
                </div>
            </div>
        `).join('');
    }

    function clearHistory() {
        history = [];
        localStorage.removeItem('bmi_history');
        updateHistoryList();
        showToast('History cleared', 'info');
    }

    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${msg}</span>`;
        document.getElementById('toastContainer').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
});
