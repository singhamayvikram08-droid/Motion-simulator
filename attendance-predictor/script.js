// ---- LOADING SCREEN ----
window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    const loaderBar = document.querySelector('.loader-bar');

    // Simulate loading progress
    setTimeout(() => { loaderBar.style.width = '40%'; }, 200);
    setTimeout(() => { loaderBar.style.width = '80%'; }, 500);
    setTimeout(() => { loaderBar.style.width = '100%'; }, 800);

    setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
    }, 1200);
});

// ---- THEME TOGGLE ----
const themeBtn = document.getElementById('theme-toggle');
let isDark = true;

themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('light-mode', !isDark);
    themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    if (attendanceChart) updateChartTheme();
});

// ---- CORE ATTENDANCE LOGIC ----
const inputs = {
    conducted: document.getElementById('conducted'),
    attended: document.getElementById('attended'),
    target: document.getElementById('target-percent')
};

const outputs = {
    currentPercent: document.getElementById('current-percent'),
    progressCircle: document.getElementById('progress-circle'),
    statusBadge: document.getElementById('status-badge'),
    neededVal: document.getElementById('needed-val'),
    bunkVal: document.getElementById('bunk-val')
};

// Colors based on CSS variables
const colors = {
    danger: '#f43f5e',
    success: '#34d399',
    neutral: '#86868b',
    primary: '#8b5cf6'
};

function calculateAttendance() {
    let conducted = parseInt(inputs.conducted.value) || 0;
    let attended = parseInt(inputs.attended.value) || 0;
    let target = parseInt(inputs.target.value) || 75;

    // Validation
    if (conducted === 0) {
        resetOutputs();
        updateChart(0, target, target);
        return;
    }
    if (attended > conducted) {
        outputs.statusBadge.innerText = "Error: Attended > Conducted";
        outputs.statusBadge.className = "badge badge-danger";
        return;
    }

    // Current Percentage
    let currentPct = (attended / conducted) * 100;
    let roundedPct = Math.round(currentPct);

    // Animate Percentage Number
    animateValue(outputs.currentPercent, parseInt(outputs.currentPercent.innerText) || 0, roundedPct, 1000, "%");

    // Update Progress Circle UI
    let deg = (currentPct / 100) * 360;
    let ringColor = currentPct >= target ? colors.success : colors.danger;
    outputs.progressCircle.style.background = `conic-gradient(${ringColor} ${deg}deg, rgba(255,255,255,0.05) 0deg)`;
    outputs.progressCircle.style.boxShadow = `0 0 30px ${ringColor}40`;

    // Status Badge
    if (currentPct >= target) {
        outputs.statusBadge.innerText = "ON TRACK";
        outputs.statusBadge.className = "badge badge-success";
    } else {
        outputs.statusBadge.innerText = "ATTENTION NEEDED";
        outputs.statusBadge.className = "badge badge-danger";
    }

    // Predictions
    // Formula for Needed: (attended + x) / (conducted + x) = target/100
    // Formula for Bunks: attended / (conducted + y) = target/100

    let targetDec = target / 100;

    if (currentPct < target) {
        // Needs to attend X more consecutive classes
        let needed = Math.ceil((targetDec * conducted - attended) / (1 - targetDec));
        animateValue(outputs.neededVal, parseInt(outputs.neededVal.innerText) || 0, needed, 800);
        outputs.bunkVal.innerText = "0";
    } else {
        // Can safely miss Y consecutive classes
        let bunks = Math.floor((attended / targetDec) - conducted);
        animateValue(outputs.bunkVal, parseInt(outputs.bunkVal.innerText) || 0, bunks, 800);
        outputs.neededVal.innerText = "0";
    }

    // Save state
    saveState();

    // Update Chart with historical illusion + current
    updateChart(currentPct, target, currentPct < target ? currentPct + 20 : currentPct - 10);
}

function animateValue(obj, start, end, duration, append = "") {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + append;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function resetOutputs() {
    outputs.currentPercent.innerText = "0%";
    outputs.progressCircle.style.background = `conic-gradient(rgba(255,255,255,0.05) 360deg, transparent 0deg)`;
    outputs.progressCircle.style.boxShadow = `none`;
    outputs.statusBadge.innerText = "AWAITING INPUT";
    outputs.statusBadge.className = "badge badge-normal";
    outputs.neededVal.innerText = "0";
    outputs.bunkVal.innerText = "0";
}

function resetApp() {
    inputs.conducted.value = "";
    inputs.attended.value = "";
    inputs.target.value = "75";
    resetOutputs();
    localStorage.removeItem('vital_attendance');
    updateChart(0, 75, 75);
}

// Event Listeners
['conducted', 'attended', 'target-percent'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateAttendance);
});

// ---- VOICE INPUT (WEB SPEECH API) ----
const voiceBtn = document.getElementById('voice-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener('click', () => {
        voiceBtn.classList.add('pulse-glow');
        recognition.start();
    });

    recognition.onresult = (event) => {
        voiceBtn.classList.remove('pulse-glow');
        const speechResult = event.results[0][0].transcript.toLowerCase();
        console.log("Speech Result: ", speechResult);

        // Extract numbers from the speech string
        const numbers = speechResult.match(/\d+/g);

        if (numbers && numbers.length >= 2) {
            // Assume first number is total conducted, second is attended
            let num1 = parseInt(numbers[0]);
            let num2 = parseInt(numbers[1]);

            // Logic check: conducted is usually larger or equal to attended
            if (num1 >= num2) {
                inputs.conducted.value = num1;
                inputs.attended.value = num2;
            } else {
                // If user says "Attended 30 out of 40", the order is swapped
                inputs.conducted.value = num2;
                inputs.attended.value = num1;
            }

            // Re-calculate
            calculateAttendance();

            // Optional: Pop a temporary success message via the chatbot logic
            if (window.chatWindow) {
                chatWindow.classList.add('active');
                appendMessage('user', `<i class="fa-solid fa-microphone"></i> "${speechResult}"`);
                appendMessage('ai', "I heard you perfectly! Your dashboard has been updated based on your voice input.");
            }
        } else {
            alert("Couldn't catch both numbers. Please say something like: 'Total classes 40 and attended 30'.");
        }
    };

    recognition.onspeechend = () => {
        voiceBtn.classList.remove('pulse-glow');
        recognition.stop();
    };

    recognition.onerror = (event) => {
        voiceBtn.classList.remove('pulse-glow');
        console.error('Speech recognition error: ' + event.error);
    };
} else {
    // Hide or disable the button if not supported on this browser
    voiceBtn.style.display = 'none';
}

// Local Storage
function saveState() {
    localStorage.setItem('vital_attendance', JSON.stringify({
        c: inputs.conducted.value,
        a: inputs.attended.value,
        t: inputs.target.value
    }));
}

function loadState() {
    let saved = localStorage.getItem('vital_attendance');
    if (saved) {
        saved = JSON.parse(saved);
        inputs.conducted.value = saved.c;
        inputs.attended.value = saved.a;
        inputs.target.value = saved.t;
        calculateAttendance();
    }
}

// Ensure resetApp correctly unmounts everything and resets Chart
window.resetApp = function () {
    inputs.conducted.value = "";
    inputs.attended.value = "";
    inputs.target.value = "75";
    resetOutputs();
    localStorage.removeItem('vital_attendance');
    updateChart(0, 75, 75);

    // Animate a brief visual sweep
    document.querySelector('.dashboard-grid').style.opacity = '0.5';
    setTimeout(() => { document.querySelector('.dashboard-grid').style.opacity = '1'; }, 300);
}

// ---- CHART.JS ANALYTICS ----
let attendanceChart;

function initChart() {
    const ctx = document.getElementById('attendanceChart').getContext('2d');

    attendanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Current'],
            datasets: [
                {
                    label: 'My Attendance %',
                    data: [100, 100, 100, 100, 100],
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: colors.primary
                },
                {
                    label: 'Target %',
                    data: [75, 75, 75, 75, 75],
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' }
                }
            }
        }
    });
}

function updateChartTheme() {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const targetLineColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

    attendanceChart.options.scales.x.ticks.color = textColor;
    attendanceChart.options.scales.y.grid.color = gridColor;
    attendanceChart.options.scales.y.ticks.color = textColor;
    attendanceChart.data.datasets[1].borderColor = targetLineColor;
    attendanceChart.update();
}

function updateChart(current, target, simulatedPast) {
    if (!attendanceChart) return;

    let history = [
        Math.min(100, simulatedPast + 5),
        Math.min(100, simulatedPast),
        Math.min(100, Math.max(0, current + (simulatedPast - current) / 2)),
        current
    ];

    attendanceChart.data.datasets[0].data = [100, ...history];
    attendanceChart.data.datasets[1].data = Array(5).fill(target);

    // Change line color based on status
    let statusColor = current >= target ? colors.primary : colors.danger;
    attendanceChart.data.datasets[0].borderColor = statusColor;
    attendanceChart.data.datasets[0].pointBackgroundColor = statusColor;

    attendanceChart.update();
}

initChart();
loadState();

// ---- AI CHATBOT (OPENROUTER) ----
const chatTrigger = document.getElementById('chat-trigger');
const chatWindow = document.getElementById('chat-window');
const closeChat = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendChat = document.getElementById('send-chat');
const chatMessages = document.getElementById('chat-messages');

function toggleChat(e) {
    if (chatWindow.classList.contains('active')) {
        chatWindow.classList.remove('active');
    } else {
        chatWindow.classList.add('active');
    }
}

chatTrigger.addEventListener('click', toggleChat);

closeChat.addEventListener('click', (e) => {
    chatWindow.classList.remove('active');
});

function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

// Initial Greeting
if (!localStorage.getItem('openrouter_key_attendance')) {
    appendMessage('ai', 'Hi! I am the Attendocast AI Advisor.<br><br>Please paste your OpenRouter API Key (sk-or-...) below to unlock my advanced analytics.');
} else {
    appendMessage('ai', 'Hi there! Looking to bunk a class? Drop me a question and I\'ll run the numbers.');
}

async function handleChat() {
    const msg = chatInput.value.trim();
    if (!msg) return;

    appendMessage('user', msg);
    chatInput.value = '';

    // Override / Save API Key at any time
    if (msg.startsWith('sk-or-') || (msg.length > 20 && msg.startsWith('sk-'))) {
        localStorage.setItem('openrouter_key_attendance', msg);
        chatMessages.innerHTML = '';
        appendMessage('ai', 'New API Key saved securely via LocalStorage! 🚀 I am fully operational. What\'s your attendance question?');
        return;
    }

    const existingKey = localStorage.getItem('openrouter_key_attendance');
    if (!existingKey) {
        appendMessage('ai', 'That doesn\'t look like a valid OpenRouter API key. Please paste a valid key starting with `sk-or-`.');
        return;
    }

    const aiMsgDiv = appendMessage('ai', '<span class="typing-cursor"></span>');

    try {
        const c = inputs.conducted.value || 0;
        const a = inputs.attended.value || 0;
        const t = inputs.target.value || 75;
        const pct = outputs.currentPercent.innerText;

        const systemPrompt = `You are Attendocast AI, an expert student advisor. The user has ${a}/${c} classes attended (${pct}). Target is ${t}%. They can miss ${outputs.bunkVal.innerText} classes safely, or need ${outputs.neededVal.innerText} classes to catch up. Give concise, highly logical advice about their attendance.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${existingKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Attendocast AI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": msg }
                ],
                "stream": true
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";
        let reasoningHtml = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const clean = line.trim();
                if (!clean || !clean.startsWith("data: ")) continue;
                if (clean.includes("[DONE]")) break;

                try {
                    const json = JSON.parse(clean.replace(/^data: /, ""));
                    const content = json.choices[0]?.delta?.content;
                    if (content) {
                        fullReply += content;
                    }

                    const rTokens = json.usage?.reasoningTokens || json.usage?.reasoning_tokens;
                    if (rTokens) {
                        reasoningHtml = `<span style="font-size: 11px; color: var(--text-sec); border-top: 1px solid var(--border); display: block; padding-top: 8px; margin-top: 8px;"><i class="fa-solid fa-microchip"></i> Reasoning tokens: ${rTokens}</span>`;
                    }

                    if (content || rTokens) {
                        aiMsgDiv.innerHTML = fullReply + reasoningHtml + '<span class="typing-cursor"></span>';
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                } catch (e) { }
            }
        }
        aiMsgDiv.innerHTML = fullReply + reasoningHtml; // Clean remove cursor

    } catch (err) {
        console.error("Chat Error:", err);
        aiMsgDiv.innerHTML = `<span style="color:#ff3b30"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}. Your API key might be invalid or out of credits. Paste a new one to replace it.</span>`;
    }
}

sendChat.addEventListener('click', handleChat);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
});

// ---- GOOGLE GRAVITY (MATTER.JS) ----
// function initGravity() {
//     const { Engine, Render, Runner, Bodies, Composite, MouseConstraint, Mouse } = Matter;

//     const engine = Engine.create();

//     // Create an invisible renderer attached to the body but behind everything
//     const render = Render.create({
//         element: document.body,
//         engine: engine,
//         options: {
//             width: window.innerWidth,
//             height: window.innerHeight,
//             background: 'transparent',
//             wireframes: false
//         }
//     });

//     // Set the canvas to absolute bottom so it doesn't block UI clicks
//     render.canvas.style.position = 'absolute';
//     render.canvas.style.top = '0';
//     render.canvas.style.left = '0';
//     render.canvas.style.zIndex = '0';
//     render.canvas.style.pointerEvents = 'none'; // CRITICAL: Stop canvas from stealing clicks


//     // Create invisible ground
//     const ground = Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, { isStatic: true });
//     Composite.add(engine.world, [ground]);

//     // Select cards
//     const elements = document.querySelectorAll('.physics-card');
//     const bodiesMap = new Map();

//     elements.forEach(el => {
//         const rect = el.getBoundingClientRect();
//         // Give cards absolute positioning
//         el.style.position = 'absolute';
//         el.style.margin = '0';
//         el.style.width = rect.width + 'px';
//         el.style.height = rect.height + 'px';

//         // Initial drop position
//         el.style.left = rect.left + 'px';
//         el.style.top = rect.top + 'px';

//         const body = Bodies.rectangle(
//             rect.left + rect.width / 2,
//             rect.top + rect.height / 2,
//             rect.width,
//             rect.height,
//             {
//                 restitution: 0.5,
//                 friction: 0.1,
//                 density: 0.04
//             }
//         );

//         Composite.add(engine.world, [body]);
//         bodiesMap.set(body, el);
//     });

//     // Make interactive with mouse
//     const mouse = Mouse.create(document.body);
//     const mouseConstraint = MouseConstraint.create(engine, {
//         mouse: mouse,
//         constraint: {
//             stiffness: 0.2,
//             render: { visible: false }
//         }
//     });

//     // Prevent the mouse constraint from stealing clicks on ANY chat UI elements
//     const originalMousedown = mouse.mousedown;
//     const originalMouseup = mouse.mouseup;

//     mouse.mousedown = function (event) {
//         if (event.target.closest('.chat-trigger') || event.target.closest('.chat-window') || event.target.closest('#chat-trigger') || event.target.closest('#chat-window')) {
//             return; // completely bail out of physics logic on chat UI
//         }
//         originalMousedown.call(mouse, event);
//     };

//     mouse.mouseup = function (event) {
//         if (event.target.closest('.chat-trigger') || event.target.closest('.chat-window') || event.target.closest('#chat-trigger') || event.target.closest('#chat-window')) {
//             return;
//         }
//         if (originalMouseup) originalMouseup.call(mouse, event);
//     };

//     Composite.add(engine.world, mouseConstraint);

//     // Allow the mouse constraint to work even if canvas is pointerEvents: none
//     // by attaching it to the document body instead of the canvas
//     mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
//     mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

//     // Sync DOM to Engine Bodies
//     Matter.Events.on(engine, 'afterUpdate', () => {
//         bodiesMap.forEach((el, body) => {
//             el.style.left = (body.position.x - el.offsetWidth / 2) + 'px';
//             el.style.top = (body.position.y - el.offsetHeight / 2) + 'px';
//             el.style.transform = `rotate(${body.angle}rad)`;
//         });
//     });

//     Render.run(render);
//     Runner.run(Runner.create(), engine);
// }

// Physics disabled per user request
// }

// =========================================
//   PHASE 5: AUTHENTICATION (LOCAL STORAGE)
// =========================================
const loginOverlay = document.getElementById('login-overlay');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginNameInput = document.getElementById('login-name');
const sidebarName = document.getElementById('sidebar-name');
const sidebarInitials = document.getElementById('sidebar-initials');

function checkAuthState() {
    const user = localStorage.getItem('attendocast_user');
    if (user) {
        // Logged In -> Hide Overlay, Set User Name
        loginOverlay.classList.add('hidden');
        sidebarName.innerText = user;
        sidebarInitials.innerText = user.substring(0, 2).toUpperCase();
    } else {
        // Logged Out -> Show Overlay
        loginOverlay.classList.remove('hidden');
    }
}

// Initial Check on Load
checkAuthState();

loginBtn.addEventListener('click', () => {
    const name = loginNameInput.value.trim();
    if (name) {
        localStorage.setItem('attendocast_user', name);
        checkAuthState();
    } else {
        // Flash red input border on error
        loginNameInput.style.borderColor = 'var(--danger)';
        setTimeout(() => { loginNameInput.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }, 1000);
    }
});

// Allow hitting Enter to login
loginNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('attendocast_user');

    // Smooth reset of inputs behind the scenes
    loginNameInput.value = '';

    // Show overlay again
    checkAuthState();
});
