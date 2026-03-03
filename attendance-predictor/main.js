const conductedInput = document.getElementById('conducted');
const attendedInput = document.getElementById('attended');
const percentageValue = document.getElementById('percentageValue');
const statusBadge = document.getElementById('statusBadge');
const statusHeading = document.getElementById('statusHeading');
const neededValue = document.getElementById('neededValue');
const bunkValue = document.getElementById('bunkValue');
const circle = document.getElementById('circle');

function calculate() {
    const conducted = parseInt(conductedInput.value) || 0;
    const attended = parseInt(attendedInput.value) || 0;

    if (conducted === 0) {
        resetUI();
        return;
    }

    if (attended > conducted) {
        statusHeading.innerText = "Error: Attended > Conducted";
        statusHeading.style.color = "var(--danger)";
        return;
    }

    const percentage = (attended / conducted) * 100;
    percentageValue.innerText = Math.round(percentage) + "%";

    updateStatusUI(percentage);

    if (percentage < 75) {
        // Classes to reach 75%
        // (attended + x) / (conducted + x) = 0.75
        // attended + x = 0.75conducted + 0.75x
        // 0.25x = 0.75conducted - attended
        // x = 3*conducted - 4*attended
        const needed = Math.ceil(3 * conducted - 4 * attended);
        neededValue.innerText = needed;
        bunkValue.innerText = "0";
        statusHeading.innerText = `You need ${needed} more classes!`;
        statusHeading.style.color = "var(--danger)";
    } else {
        // Safe bunks
        // attended / (conducted + y) = 0.75
        // attended = 0.75conducted + 0.75y
        // 0.75y = attended - 0.75conducted
        // y = (attended / 0.75) - conducted
        const safeBunks = Math.floor((4 * attended / 3) - conducted);
        neededValue.innerText = "0";
        bunkValue.innerText = safeBunks;
        statusHeading.innerText = safeBunks > 0 ? `You can bunk ${safeBunks} classes!` : "Don't bunk any classes!";
        statusHeading.style.color = "var(--success)";
    }
}

function updateStatusUI(percentage) {
    if (percentage >= 75) {
        statusBadge.innerText = "ABOVE 75%";
        statusBadge.className = "status-badge status-success";
        circle.style.borderColor = "var(--success)";
    } else {
        statusBadge.innerText = "BELOW 75%";
        statusBadge.className = "status-badge status-danger";
        circle.style.borderColor = "var(--danger)";
    }
}

function resetUI() {
    percentageValue.innerText = "0%";
    neededValue.innerText = "0";
    bunkValue.innerText = "0";
    statusBadge.innerText = "BELOW 75%";
    statusBadge.className = "status-badge status-danger";
    statusHeading.innerText = "Welcome to Predictor";
    statusHeading.style.color = "var(--text-main)";
    circle.style.borderColor = "var(--glass-border)";
}

conductedInput.addEventListener('input', calculate);
attendedInput.addEventListener('input', calculate);
