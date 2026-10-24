
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "focusup_study_pet_v1";

const defaultData = {
  petXP: 0,
  petHappiness: 100,
  todaySeconds: 0,
  todayDate: new Date().toDateString(),
  sessions: 0,
  tasks: []
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...defaultData, ...(saved || {}) };
  } catch {
    return { ...defaultData };
  }
}

let data = loadData();

if (data.todayDate !== new Date().toDateString()) {
  data.todayDate = new Date().toDateString();
  data.todaySeconds = 0;
  data.sessions = 0;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let durationSeconds = 25 * 60;
let remainingSeconds = durationSeconds;
let running = false;
let timerInterval = null;
let lastTick = 0;
let sessionSeconds = 0;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, "0") + ":" +
         String(secs).padStart(2, "0");
}

function updateTimerDisplay() {
  $("timerDisplay").textContent = formatTime(remainingSeconds);
  $("startTimer").textContent = running ? "Pause session" : "Start studying";
  $("timerStatus").textContent = running
    ? "You're doing great 🌷"
    : remainingSeconds === 0
      ? "Session completed!"
      : "Ready when you are";
}

function updateStats() {
  $("todayTime").textContent =
    Math.floor(data.todaySeconds / 60) + " min";
  $("sessionCount").textContent = data.sessions;
  $("totalXP").textContent = Math.floor(data.petXP) + " XP";
}

function updateStudyPet() {
  const xp = Math.floor(Number(data.petXP) || 0);
  const happiness = Math.max(0, Math.min(100,
    Math.floor(Number(data.petHappiness ?? 100))));

  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;

  let emoji = "🐣";
  let stage = "Baby Pet";
  let mood = "Ready to study with you!";

  if (level >= 10) {
    emoji = "🐉";
    stage = "Legendary Pet";
    mood = "You're an amazing study team!";
  } else if (level >= 5) {
    emoji = "🦊";
    stage = "Adventurer Pet";
    mood = "Look how much we've grown!";
  } else if (level >= 3) {
    emoji = "🐱";
    stage = "Growing Pet";
    mood = "I'm getting stronger with you!";
  } else if (level >= 2) {
    emoji = "🐥";
    stage = "Growing Baby";
    mood = "Yay! We're making progress!";
  }

  if (happiness < 30) {
    mood = "Let's take a little break.";
  } else if (happiness < 60) {
    mood = "A short rest might feel nice.";
  }

  $("petEmoji").textContent = emoji;
  $("petName").textContent = "Mochi";
  $("petMood").textContent = mood;
  $("petStage").textContent = stage;
  $("petLevel").textContent = level;
  $("petXP").textContent = xp;
  $("petNextXP").textContent = 100 - xpIntoLevel;
  $("petXPBar").style.width = xpIntoLevel + "%";
  $("petHappiness").textContent = happiness + "%";

  const totalMinutes = Math.floor(
    (Number(data.totalStudySeconds) || 0) / 60
  );
  $("petStudyTime").textContent = totalMinutes + " min";
}

function renderTasks() {
  const list = $("taskList");
  list.innerHTML = "";

  data.tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Mark task complete");
    checkbox.addEventListener("change", () => {
      data.tasks[index].done = checkbox.checked;
      saveData();
      renderTasks();
    });

    const text = document.createElement("span");
    text.textContent = task.text;

    const remove = document.createElement("button");
    remove.className = "delete-task";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      data.tasks.splice(index, 1);
      saveData();
      renderTasks();
    });

    li.append(checkbox, text, remove);
    list.appendChild(li);
  });

  $("taskEmpty").hidden = data.tasks.length > 0;
}

function refreshUI() {
  updateTimerDisplay();
  updateStats();
  updateStudyPet();
  renderTasks();
}

function stopTimer() {
  running = false;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function finishSession() {
  stopTimer();

  if (sessionSeconds > 0) {
    data.sessions += 1;
    // A completed session restores a little happiness.
    data.petHappiness = Math.min(100, data.petHappiness + 10);
    saveData();
  }

  sessionSeconds = 0;
  remainingSeconds = 0;
  saveData();
  refreshUI();
  $("timerStatus").textContent = "Well done! Take a little break 💗";
}

function tick() {
  const now = Date.now();
  const elapsed = Math.floor((now - lastTick) / 1000);
  if (elapsed < 1) return;

  lastTick += elapsed * 1000;

  const creditedSeconds = Math.min(elapsed, remainingSeconds);
  remainingSeconds -= creditedSeconds;
  sessionSeconds += creditedSeconds;

  data.todaySeconds += creditedSeconds;
  data.totalStudySeconds = (data.totalStudySeconds || 0) + creditedSeconds;
  data.petXP += creditedSeconds / 60;
  data.petHappiness = Math.min(
    100, data.petHappiness + creditedSeconds / 120
  );

  saveData();
  refreshUI();

  if (remainingSeconds <= 0) finishSession();
}

$("startTimer").addEventListener("click", () => {
  if (running) {
    stopTimer();
    saveData();
    refreshUI();
    return;
  }

  if (remainingSeconds <= 0) {
    alert("Choose a new study duration first.");
    return;
  }

  running = true;
  lastTick = Date.now();
  timerInterval = setInterval(tick, 250);
  refreshUI();
});

$("resetTimer").addEventListener("click", () => {
  stopTimer();
  sessionSeconds = 0;
  remainingSeconds = durationSeconds;
  refreshUI();
});

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    stopTimer();
    sessionSeconds = 0;

    document.querySelectorAll(".mode").forEach((item) =>
      item.classList.remove("active")
    );
    button.classList.add("active");

    durationSeconds = Number(button.dataset.minutes) * 60;
    remainingSeconds = durationSeconds;
    refreshUI();
  });
});

$("setDuration").addEventListener("click", () => {
  const minutes = Number($("customMinutes").value);

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
    alert("Enter a whole number from 1 to 480 minutes.");
    return;
  }

  stopTimer();
  sessionSeconds = 0;
  durationSeconds = minutes * 60;
  remainingSeconds = durationSeconds;

  document.querySelectorAll(".mode").forEach((item) =>
    item.classList.remove("active")
  );

  refreshUI();
});

$("taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("taskInput").value.trim();
  if (!text) return;

  data.tasks.push({ text, done: false });
  $("taskInput").value = "";
  saveData();
  renderTasks();
});

refreshUI();
