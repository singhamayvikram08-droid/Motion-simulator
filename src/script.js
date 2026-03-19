document.addEventListener('DOMContentLoaded', () => {
    // ---- AUDIO CONTEXT ----
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playBeep() {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }

    // ---- STATE ----
    let unit = 'metric';
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let users = JSON.parse(localStorage.getItem('users')) || {};
    let chartInstance = null;
    let gravityManager = null;

    const tips = [
        "Drink 500ml of water as soon as you wake up.",
        "Take the stairs instead of the elevator today.",
        "Aim for at least 7 hours of quality sleep.",
        "Limit refined sugar for higher energy levels.",
        "Add a source of protein to every meal."
    ];

    // ---- ELEMENTS ----
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const authForm = document.getElementById('auth-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const nameGroup = document.getElementById('name-group');
    const authBtn = document.getElementById('auth-btn');
    const authName = document.getElementById('auth-name');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name-display');

    const themeToggle = document.getElementById('theme-toggle');
    const unitBtns = document.querySelectorAll('.toggle-btn');
    const bmiForm = document.getElementById('bmi-form');
    const formResetBtn = document.getElementById('form-reset-btn');
    const resetHistoryBtn = document.getElementById('reset-history');

    const metricHeight = document.querySelector('.metric-height');
    const imperialHeight = document.querySelector('.imperial-height');
    const weightInput = document.getElementById('weight');
    const weightUnit = document.getElementById('weight-unit');
    const heightCm = document.getElementById('height-cm');
    const heightFt = document.getElementById('height-ft');
    const heightIn = document.getElementById('height-in');

    const loadingView = document.getElementById('ai-loading');
    const resultsView = document.getElementById('results-view');

    const aiCalories = document.getElementById('ai-calories');
    const aiResponseText = document.getElementById('ai-response-text');

    const voiceBtn = document.getElementById('voice-btn');
    const chatbotTrigger = document.getElementById('chatbot-trigger');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChat = document.getElementById('send-chat');



    // ---- INIT THEME ----
    if (localStorage.getItem('ai_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    // ---- AUTHENTICATION ----
    let isSignup = false;
    tabSignup.addEventListener('click', () => {
        isSignup = true;
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        nameGroup.style.display = 'flex';
        authName.required = true;
        authBtn.textContent = 'Create Account';
    });

    tabLogin.addEventListener('click', () => {
        isSignup = false;
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        nameGroup.style.display = 'none';
        authName.required = false;
        authBtn.textContent = 'Access Dashboard';
    });

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = authEmail.value.trim().toLowerCase();
        const name = authName.value.trim();

        if (isSignup) {
            if (!users[email]) {
                users[email] = { name: name || 'User', history: [] };
                localStorage.setItem('users', JSON.stringify(users));
                login(email);
            } else {
                alert('Email already registered!');
            }
        } else {
            if (users[email]) {
                login(email);
            } else {
                alert('App Demo: Auto-registering you since email not found.');
                users[email] = { name: 'Demo User', history: [] };
                localStorage.setItem('users', JSON.stringify(users));
                login(email);
            }
        }
    });

    function login(email) {
        currentUser = { email, data: users[email] };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        fetchQuote(); // Fetch daily quote on login
    }

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        currentUser = null;
        showAuth();
    });

    function showAuth() {
        authView.classList.add('active');
        appView.classList.remove('active');
    }

    function showApp() {
        authView.classList.remove('active');
        appView.classList.add('active');
        userNameDisplay.textContent = currentUser.data.name;
        renderChart();
    }

    if (currentUser) { showApp(); fetchQuote(); } else { showAuth(); }



    // ---- API CONNECTIONS ----

    // 1. Daily Quote API
    async function fetchQuote() {
        try {
            const response = await fetch('https://dummyjson.com/quotes/random');
            const data = await response.json();
            const quoteEl = document.getElementById('daily-quote') || createQuoteElement();
            quoteEl.innerHTML = `<i class="fa-solid fa-quote-left text-gradient"></i> "<em>${data.quote}</em>" <br><small>- ${data.author}</small>`;
        } catch (err) {
            console.error('Quote API failed', err);
        }
    }

    function createQuoteElement() {
        const quoteEl = document.createElement('div');
        quoteEl.id = 'daily-quote';
        quoteEl.className = 'quote-card glass-panel';
        quoteEl.style.padding = '20px';
        quoteEl.style.marginBottom = '24px';
        quoteEl.style.textAlign = 'center';
        document.querySelector('.dashboard-grid').before(quoteEl);
        return quoteEl;
    }

    // 2. Exercise API (wger.de)
    async function fetchExternalExercises(cat) {
        // Map category to a search term for wger (basic example)
        let query = cat.c === 'Obese' || cat.c === 'Overweight' ? 'walking' : 'squat';
        try {
            aiExercise.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching routines...';
            const res = await fetch(`https://wger.de/api/v2/exercise/search/?term=${query}&language=2`);
            const data = await res.json();
            if (data.suggestions && data.suggestions.length > 0) {
                const ex = data.suggestions[0].data;
                aiExercise.innerHTML = `<strong>Suggested:</strong> ${ex.name}<br><small>(${cat.e})</small>`;
            } else {
                aiExercise.textContent = cat.e; // fallback
            }
        } catch (e) {
            aiExercise.textContent = cat.e; // fallback
        }
    }

    // 3. Diet/Meal API (TheMealDB)
    async function fetchExternalMeal(cat) {
        // Map cat to ingredients (basic example)
        let query = cat.c === 'Underweight' ? 'Beef' : (cat.c === 'Obese' ? 'Vegan' : 'Chicken');
        try {
            aiDiet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching meals...';
            const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${query}`);
            const data = await res.json();
            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[Math.floor(Math.random() * Math.min(5, data.meals.length))];
                aiDiet.innerHTML = `<strong>Meal Idea:</strong> ${meal.strMeal}<br><small>(${cat.d})</small>`;
            } else {
                aiDiet.textContent = cat.d; // fallback
            }
        } catch (e) {
            aiDiet.textContent = cat.d; // fallback
        }
    }

    // 4. OpenRouter LLM Advice
    async function fetchOpenRouterAdvice(bmi, cat, cals, age, gender, h, w) {
        const apiKey = localStorage.getItem('openrouter_api_key');
        if (!apiKey) {
            aiResponseText.innerHTML = '<p class="placeholder-text">AI features are locked. Please open the Chatbot Assistant and paste your OpenRouter API Key to unlock.</p>';
            return;
        }

        aiResponseText.innerHTML = '<div class="typing-cursor">Generating your custom health plan...</div>';
        aiResponseText.classList.add('shimmer');

        const hDisp = unit === 'metric' ? `${(h * 100).toFixed(1)}cm` : `${(h / 0.0254).toFixed(1)}in`;
        const wDisp = unit === 'metric' ? `${w.toFixed(1)}kg` : `${(w / 0.453592).toFixed(1)}lb`;

        try {
            const referer = window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional health and fitness startup advisor. Provide personalized, concise, and motivating health plans."
                        },
                        {
                            "role": "user",
                            "content": `Analyze my health: Age ${age}, Gender ${gender}, Height ${hDisp}, Weight ${wDisp}. My BMI is ${bmi} (${cat.c}). My daily calorie goal is ${cals} kcal. Provide a 2-paragraph specific diet and exercise plan for my status. Format with HTML <p> tags.`
                        }
                    ],
                    "stream": true
                })
            });

            console.log("Health Plan API Status:", response.status);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `API Failed (${response.status})`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";
            let buffer = "";
            aiResponseText.innerHTML = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
                    if (cleanLine.includes("[DONE]")) break;

                    try {
                        const json = JSON.parse(cleanLine.replace(/^data: /, ""));
                        const content = json.choices[0]?.delta?.content;
                        if (content) {
                            fullText += content;
                            aiResponseText.innerHTML = fullText + '<span class="typing-cursor"></span>';
                        }
                    } catch (e) { /* partial chunk */ }
                }
            }

            aiResponseText.innerHTML = fullText; // Remove cursor
            aiResponseText.classList.remove('shimmer');

        } catch (err) {
            console.error("OpenRouter Error:", err);
            aiResponseText.classList.remove('shimmer');
            aiResponseText.innerHTML = `<p class="error-text">AI Error: ${err.message}. Please check your API key in settings or try again. Fallback: ${cat.d} ${cat.e}</p>`;
        }
    }

    // 5. Voice Recognition (Speech API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('active')) {
                recognition.stop();
            } else {
                recognition.start();
                voiceBtn.classList.add('active');
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            voiceBtn.classList.remove('active');
            console.log("Voice Input:", transcript);

            // Parsing weight
            const weightMatch = transcript.match(/weight (is|at|of)?\s*(\d+(\.\d+)?)/);
            if (weightMatch) weightInput.value = weightMatch[2];

            // Parsing height
            const heightMatch = transcript.match(/height (is|at|of)?\s*(\d+(\.\d+)?)/);
            if (heightMatch) {
                if (unit === 'metric') heightCm.value = heightMatch[2];
                else heightFt.value = heightMatch[2];
            }

            if (weightMatch || heightMatch) {
                const toast = document.createElement('div');
                toast.className = 'glass-panel';
                toast.style = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); padding:10px 20px; z-index:2000; font-weight:bold; color:var(--primary);';
                toast.textContent = "Voice input processed!";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        };

        recognition.onerror = () => voiceBtn.classList.remove('active');
        recognition.onend = () => voiceBtn.classList.remove('active');
    } else {
        voiceBtn.style.display = 'none';
    }

    // 6. Chatbot Assistant Logic
    chatbotTrigger.addEventListener('click', () => {
        chatbotWindow.classList.toggle('hidden');
        if (!chatbotWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    closeChat.addEventListener('click', () => chatbotWindow.classList.add('hidden'));

    // Initialize Chat Greeting
    if (!localStorage.getItem('openrouter_api_key')) {
        chatMessages.innerHTML = `
            <div class="message ai">
                <p>Hello! To unlock VitalAI features, please paste your OpenRouter API key below. It will be saved securely within your browser.</p>
            </div>
        `;
    }

    async function handleChat() {
        const msg = chatInput.value.trim();
        if (!msg) return;

        appendMessage('user', msg);
        chatInput.value = '';

        // Allow user to overwrite the API key natively through chat
        if (msg.startsWith('sk-or-') || msg.length > 20 && msg.includes('sk-')) {
            localStorage.setItem('openrouter_api_key', msg);
            chatMessages.innerHTML = '';
            appendMessage('ai', 'API Key saved successfully! All AI features are now unlocked. How can I help you?');
            return;
        }

        const apiKey = localStorage.getItem('openrouter_api_key');
        if (!apiKey) {
            appendMessage('ai', 'That doesn\'t look like a valid OpenRouter API key. Please try again or paste a valid key starting with "sk-or-".');
            return;
        }

        const aiMsgDiv = appendMessage('ai', '<span class="typing-cursor"></span>');

        try {
            const referer = window.location.origin === "null" ? "http://localhost:3000" : window.location.origin;
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": referer,
                    "X-Title": "VitalAI Health",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [
                        { "role": "system", "content": "You are VitalAI assistant. You help users with fitness, diet, and explaining BMI results. Keep responses medium-length and very helpful." },
                        { "role": "user", "content": msg }
                    ],
                    "stream": true
                })
            });

            console.log("Chatbot API Status:", response.status);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Chatbot Failed (${response.status})`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = "";
            let buffer = "";
            aiMsgDiv.innerHTML = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
                    if (cleanLine.includes("[DONE]")) break;

                    try {
                        const json = JSON.parse(cleanLine.replace(/^data: /, ""));
                        const content = json.choices[0]?.delta?.content;
                        if (content) {
                            fullReply += content;
                            aiMsgDiv.innerHTML = fullReply + '<span class="typing-cursor"></span>';
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) { }
                }
            }
            aiMsgDiv.innerHTML = fullReply;
        } catch (err) {
            console.error("Chatbot Error:", err);
            aiMsgDiv.innerHTML = `<span style="color: #ff3b30"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}.<br><br>If this persists, your API key might be invalid or out of credits. Paste a new key starting with 'sk-or-' to replace it.</span>`;
        }
    }

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = `message ${role}`;
        div.innerHTML = text.startsWith('<') ? text : `<p>${text}</p>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    sendChat.addEventListener('click', handleChat);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

    // ---- THEME ----
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('ai_theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        renderChart();
    });

    // ---- UNIT ----
    unitBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        unit = btn.dataset.unit;

        if (unit === 'metric') {
            metricHeight.style.display = 'block';
            imperialHeight.style.display = 'none';
            weightUnit.textContent = 'kg';
            heightCm.required = true;
            heightFt.required = false; heightIn.required = false;
        } else {
            metricHeight.style.display = 'none';
            imperialHeight.style.display = 'block';
            weightUnit.textContent = 'lb';
            heightCm.required = false;
            heightFt.required = true; heightIn.required = true;
        }
    }));
    heightCm.required = true;

    // ---- AI MAPPINGS ----
    const AIMappings = [
        { c: 'Underweight', min: 0, max: 18.5, col: '#3b82f6', d: 'Focus on high-caloric, nutrient-dense foods (nuts, avocados, whole milk, proteins). Eat 5-6 small meals per day to safely increase mass.', e: 'Prioritize resistance training over intense cardio to build muscle mass rather than burning excess calories.' },
        { c: 'Normal', min: 18.5, max: 25, col: '#10b981', d: 'Maintain balance! Ensure a healthy mix of macronutrients: 50% complex carbs, 30% lean protein, 20% healthy fats.', e: 'Mix cardiovascular workouts (3x/week) with strength training (2x/week) to maintain bone density and cardiovascular health.' },
        { c: 'Overweight', min: 25, max: 30, col: '#f59e0b', d: 'Incorporate a moderate caloric deficit (-500 kcal). Boost fiber intake with vegetables and lean proteins to stay full while cutting.', e: 'Aim for 150 minutes of moderate aerobic activity weekly. Activities like brisk walking, cycling, or swimming are great.' },
        { c: 'Obese', min: 30, max: 100, col: '#ef4444', d: 'Focus on whole foods, eliminate sugary drinks, and adopt portion control. A structured low-carb or Mediterranean diet may help stabilize insulin.', e: 'Start with low-impact movements like swimming or water aerobics to reduce joint stress. Aim for consistency over intensity.' }
    ];

    // ---- BMI LOGIC ----
    bmiForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let w = parseFloat(weightInput.value);
        let h = 0;
        if (unit === 'metric') {
            h = parseFloat(heightCm.value) / 100; // to meters
        } else {
            let ft = parseFloat(heightFt.value) || 0;
            let inn = parseFloat(heightIn.value) || 0;
            h = (ft * 12 + inn) * 0.0254; // to meters
            w = w * 0.453592; // to kg
        }

        let age = parseInt(document.getElementById('age').value) || 25;
        let gender = document.querySelector('input[name="gender"]:checked').value;

        if (!h || !w || h <= 0 || w <= 0) return;

        let bmi = Math.round((w / (h * h)) * 10) / 10;
        let bmr = (10 * w) + (6.25 * (h * 100)) - (5 * age);
        bmr += (gender === 'male' ? 5 : -161);
        let cals = Math.round(bmr * 1.375); // standard active
        let cat = AIMappings.find(x => bmi >= x.min && bmi < x.max) || AIMappings[3];

        loadingView.classList.remove('hidden');
        loadingView.classList.add('shimmer');
        resultsView.classList.add('hidden');

        setTimeout(() => {
            loadingView.classList.add('hidden');
            loadingView.classList.remove('shimmer');
            resultsView.classList.remove('hidden');
            playBeep();

            showResults(bmi, cat, cals, age, gender, h, w);
            saveResult(bmi, age, h, w, gender);

            // Trigger AI Advice
            fetchOpenRouterAdvice(bmi, cat, cals, age, gender, h, w);
        }, 1200);
    });

    formResetBtn.addEventListener('click', () => {
        resultsView.classList.add('hidden');
        bmiForm.reset();
    });

    resetHistoryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Clear your entire BMI history?')) {
            users[currentUser.email].history = [];
            localStorage.setItem('users', JSON.stringify(users));
            renderChart();
        }
    });

    function showResults(bmi, cat, cals, age, gender, h, w) {
        animateValue(bmiResultTxt, 0, bmi, 1500, true);

        bmiStatus.textContent = cat.c;
        bmiStatus.style.color = cat.col;
        bmiStatus.style.background = cat.col + '20';

        animateValue(aiCalories, 0, cals, 1000, false, ' kcal');

        // Body Fat Estimation (Deurenberg Formula)
        const bf = (1.20 * bmi) + (0.23 * age) - (gender === 'male' ? 16.2 : 5.4);
        const bfVal = Math.max(5, Math.min(50, bf));
        animateValue(document.getElementById('bodyfat-val'), 0, bfVal, 1500, true, '%');
        document.getElementById('bodyfat-progress').style.width = bfVal + '%';

        // Fitness Score Calculation (0-100)
        let bmiScore = 100 - Math.abs(bmi - 22) * 4;
        let idealBF = gender === 'male' ? 15 : 22;
        let bfScore = 100 - Math.abs(bf - idealBF) * 3;
        const fitnessScore = Math.round(Math.max(0, Math.min(100, (bmiScore * 0.4) + (bfScore * 0.6))));

        animateValue(document.getElementById('score-text'), 0, fitnessScore, 1500, false);
        document.getElementById('score-fill').style.strokeDasharray = `${fitnessScore}, 100`;

        document.getElementById('daily-tip').textContent = tips[Math.floor(Math.random() * tips.length)];

        // Circular Gauge
        let pct = ((bmi - 15) / 25);
        pct = Math.max(0, Math.min(1, pct));
        let offset = 125.6 - (125.6 * pct);

        const svgHTML = `
            <path class="gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" fill="none"/>
            <path class="gauge-fill" id="gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" stroke-dasharray="125.6" stroke-dashoffset="125.6" fill="none" style="stroke: ${cat.col}; filter: drop-shadow(0 0 5px ${cat.col});"/>
        `;
        document.querySelector('.gauge-svg').innerHTML = svgHTML;

        setTimeout(() => {
            if (document.getElementById('gauge-fill'))
                document.getElementById('gauge-fill').style.strokeDashoffset = offset;
        }, 50);

        if (linearMarker) linearMarker.style.left = `${pct * 100}%`;
    }

    function animateValue(obj, start, end, duration, isFloat = false, suffix = '') {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let val = start + progress * (end - start);
            obj.innerHTML = (isFloat ? val.toFixed(1) : Math.floor(val)) + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function saveResult(bmi, age, h, w, gender) {
        if (!currentUser) return;
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let hist = users[currentUser.email].history;

        const bf = (1.20 * bmi) + (0.23 * age) - (gender === 'male' ? 16.2 : 5.4);
        let bmiScore = 100 - Math.abs(bmi - 22) * 4;
        let idealBF = gender === 'male' ? 15 : 22;
        let bfScore = 100 - Math.abs(bf - idealBF) * 3;
        const fitnessScore = Math.round(Math.max(0, Math.min(100, (bmiScore * 0.4) + (bfScore * 0.6))));

        const entry = { date: dateStr, bmi, fitnessScore };

        if (hist.length && hist[hist.length - 1].date === dateStr) {
            hist[hist.length - 1] = entry;
        } else {
            hist.push(entry);
        }

        localStorage.setItem('users', JSON.stringify(users));
        renderChart();
    }

    function renderChart() {
        if (!currentUser || !currentUser.data.history.length) return;
        const ctx = document.getElementById('historyChart').getContext('2d');
        const hist = currentUser.data.history;

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: hist.map(d => d.date),
                datasets: [
                    {
                        label: 'BMI Trend',
                        data: hist.map(d => d.bmi),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Fitness Score',
                        data: hist.map(d => d.fitnessScore || 0),
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: {
                        position: 'left',
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y1: {
                        position: 'right',
                        min: 0, max: 100,
                        display: false
                    }
                }
            }
        });
    }

    // ---- GOOGLE GRAVITY ENGINE ----
    // (Google Gravity UI toggle removed)

    function initGravity() {
        const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse, Events } = Matter;
        const engine = Engine.create();
        const world = engine.world;

        const container = document.body;
        const width = window.innerWidth;
        const height = window.innerHeight;

        const runner = Runner.create();
        Runner.run(runner, engine);

        const ground = Bodies.rectangle(width / 2, height + 50, width, 100, { isStatic: true });
        const wallL = Bodies.rectangle(-50, height / 2, 100, height, { isStatic: true });
        const wallR = Bodies.rectangle(width + 50, height / 2, 100, height, { isStatic: true });
        Composite.add(world, [ground, wallL, wallR]);

        const elements = document.querySelectorAll('.card, .glass-panel, .sidebar, .top-header, .metrics-grid .card');
        const bodies = [];

        document.body.classList.add('gravity-active');

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0) return;

            const body = Bodies.rectangle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                rect.width,
                rect.height,
                { restitution: 0.5, friction: 0.1 }
            );

            body.element = el;
            bodies.push(body);
            Composite.add(world, body);
            el.style.width = rect.width + 'px';
            el.style.height = rect.height + 'px';
        });

        const mouse = Mouse.create(container);
        const mConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        });
        Composite.add(world, mConstraint);

        Events.on(runner, "afterUpdate", () => {
            bodies.forEach(b => {
                const { x, y } = b.position;
                b.element.style.transform = `translate(${x - parseFloat(b.element.style.width) / 2}px, ${y - parseFloat(b.element.style.height) / 2}px) rotate(${b.angle}rad)`;
                b.element.style.left = '0px';
                b.element.style.top = '0px';
            });
        });

        gravityManager = { engine, runner, bodies, world };
    }

    function destroyGravity() {
        if (!gravityManager) return;
        Matter.Runner.stop(gravityManager.runner);
        Matter.Engine.clear(gravityManager.engine);
        document.body.classList.remove('gravity-active');

        gravityManager.bodies.forEach(b => {
            b.element.style.transform = '';
            b.element.style.width = '';
            b.element.style.height = '';
            b.element.style.left = '';
            b.element.style.top = '';
        });

        gravityManager = null;
    }
});
