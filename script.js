// FOCUSUP - Study companion

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "focusup_student_v1";

const defaultData = {
  name: "",
  goalHours: 2,
  todaySeconds: 0,
  sessions: 0,
  tasks: [],
  posts: [],
  reminder: false,
  focusMode: false
};

let data = loadData();
let selectedMinutes = 25;
let remainingSeconds = selectedMinutes * 60;
let timerInterval = null;
let running = false;
let lastTick = 0;
let sessionSeconds = 0;
let toastTimeout = null;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultData, ...saved } : { ...defaultData };
  } catch {
    return { ...defaultData };
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    showToast("Could not save data in this browser.");
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// ---------- LOGIN ----------

function showLogin() {
  $("loginPage").classList.remove("hidden");
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  $("pageHeading").textContent = "Welcome to FOCUSUP";
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });
}

function showPage(pageName) {
  if (!data.name) {
    showLogin();
    return;
  }

  $("loginPage").classList.add("hidden");

  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  const target = $(pageName + "Page");
  if (!target) return;

  target.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === pageName
    );
  });

  const headings = {
    home: "Your study dashboard",
    timer: "Study timer",
    tasks: "My study tasks",
    community: "Study community",
    leaderboard: "Leaderboard",
    settings: "Your settings"
  };

  $("pageHeading").textContent = headings[pageName] || "FOCUSUP";

  if (pageName === "home") renderHome();
  if (pageName === "tasks") renderTasks();
  if (pageName === "community") renderCommunity();
  if (pageName === "leaderboard") renderLeaderboard();
}

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("nameInput").value.trim();
  if (!name) return;

  data.name = name;
  saveData();
  updateProfile();
  showPage("home");
  showToast("Welcome to FOCUSUP, " + name + "! 🌱");
});

$("logoutBtn").addEventListener("click", () => {
  if (running) {
    showToast("Pause your timer before logging out.");
    return;
  }

  showLogin();
});

// ---------- NAVIGATION ----------

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.go);
  });
});

// ---------- PROFILE AND DASHBOARD ----------

function updateProfile() {
  const name = data.name || "Student";

  $("profileName").textContent = name;
  $("avatarText")?.remove();

  document.querySelector(".avatar").textContent =
    name.charAt(0).toUpperCase();

  $("welcomeText").textContent = "Hello, " + name + "! 🌷";
  $("goalHours").value = data.goalHours;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return hours + "h " + minutes + "m";
  return minutes + " min";
}

function updateStats() {
  $("todayTime").textContent = formatDuration(data.todaySeconds);

  $("completedCount").textContent = data.tasks.filter(
    task => task.done
  ).length;

  $("sessionCount").textContent = data.sessions;

  const goalSeconds = Number(data.goalHours) * 3600;

  const percentage = goalSeconds > 0
    ? Math.min(100, Math.round(data.todaySeconds / goalSeconds * 100))
    : 0;

  $("goalProgress").style.width = percentage + "%";
  $("goalCaption").textContent =
    percentage + "% of your daily goal completed";

  $("goalHours").value = data.goalHours;
}

function renderHome() {
  updateStats();

  const tasks = data.tasks.slice(0, 4);
  const container = $("homeTasks");

  if (tasks.length === 0) {
    container.innerHTML =
      '<p class="muted small">No tasks yet. Add one to get started 🌱</p>';
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-item ${task.done ? "done" : ""}">
      <input type="checkbox"
        data-task-check="${task.id}"
        ${task.done ? "checked" : ""}
        aria-label="Mark task complete">
      <span class="task-text">${escapeHTML(task.text)}</span>
    </div>
  `).join("");

  container.querySelectorAll("[data-task-check]").forEach(input => {
    input.addEventListener("change", () => {
      toggleTask(input.dataset.taskCheck);
    });
  });
}

$("saveGoal").addEventListener("click", () => {
  const goal = Number($("goalHours").value);

  if (!Number.isFinite(goal) || goal < 0.5 || goal > 16) {
    showToast("Choose a daily goal from 0.5 to 16 hours.");
    return;
  }

  data.goalHours = goal;
  saveData();
  updateStats();
  showToast("Your daily goal has been saved! 🎯");
});

// ---------- TASKS ----------

$("taskForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("taskInput");
  const text = input.value.trim();

  if (!text) return;

  data.tasks.unshift({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    text,
    done: false
  });

  input.value = "";
  saveData();
  renderTasks();
  showToast("Task added. You've got this!");
});

function renderTasks() {
  const container = $("taskList");
  const empty = $("emptyTasks");

  empty.classList.toggle("hidden", data.tasks.length > 0);

  container.innerHTML = data.tasks.map(task => `
    <div class="task-item ${task.done ? "done" : ""}">
      <input type="checkbox"
        data-task-check="${task.id}"
        ${task.done ? "checked" : ""}
        aria-label="Mark task complete">

      <span class="task-text">${escapeHTML(task.text)}</span>

      <button class="delete-btn"
        data-task-delete="${task.id}"
        aria-label="Delete task">×</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-task-check]").forEach(input => {
    input.addEventListener("change", () => {
      toggleTask(input.dataset.taskCheck);
    });
  });

  container.querySelectorAll("[data-task-delete]").forEach(button => {
    button.addEventListener("click", () => {
      data.tasks = data.tasks.filter(
        task => task.id !== button.dataset.taskDelete
      );

      saveData();
      renderTasks();
      updateStats();
      renderHome();
    });
  });

  updateStats();
}

function toggleTask(id) {
  const task = data.tasks.find(task => task.id === id);
  if (!task) return;

  task.done = !task.done;
  saveData();

  renderTasks();
  renderHome();

  showToast(task.done ? "Task completed! Well done 🌷" : "Task reopened.");
}

// ---------- STUDY TIMER ----------

const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 96;

function updateTimerDisplay() {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  $("timerValue").textContent =
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");

  const total = selectedMinutes * 60;
  const fraction = total > 0 ? remainingSeconds / total : 0;

  $("ringProgress").style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
  $("ringProgress").style.strokeDashoffset =
    CIRCLE_CIRCUMFERENCE * (1 - fraction);

  $("timerStatus").textContent = running
    ? "Stay focused 🌱"
    : remainingSeconds === 0
      ? "Session completed!"
      : remainingSeconds === total
        ? "Ready to focus"
        : "Timer paused";

  $("startTimer").textContent = running ? "Ⅱ Pause" : "▶ Start";

  document.querySelectorAll(".duration-btn").forEach(button => {
    button.classList.toggle(
      "active",
      Number(button.dataset.minutes) === selectedMinutes
    );
  });
}

function chooseDuration(minutes) {
  if (running) {
    showToast("Pause your current timer before changing duration.");
    return;
  }

  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720) {
    showToast("Choose a duration from 1 to 720 minutes.");
    return;
  }

  selectedMinutes = Math.floor(minutes);
  remainingSeconds = selectedMinutes * 60;
  sessionSeconds = 0;

  $("timerTitle").textContent = selectedMinutes >= 60
    ? "Your " + (selectedMinutes / 60) + "-hour session"
    : selectedMinutes + "-minute study session";

  updateTimerDisplay();
}

document.querySelectorAll(".duration-btn").forEach(button => {
  button.addEventListener("click", () => {
    chooseDuration(Number(button.dataset.minutes));
  });
});

$("customTimeForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const minutes = Number($("customMinutes").value);

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    showToast("Enter a whole number from 1 to 720 minutes.");
    return;
  }

  chooseDuration(minutes);
  $("customMinutes").value = "";
});

$("startTimer").addEventListener("click", () => {
  if (running) {
    running = false;
    clearInterval(timerInterval);
    timerInterval = null;
    updateTimerDisplay();
    return;
  }

  if (remainingSeconds <= 0) {
    showToast("Choose a new duration to start another session.");
    return;
  }

  running = true;
  lastTick = Date.now();
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - lastTick) / 1000);

    if (elapsed < 1) return;

    lastTick += elapsed * 1000;

    // Count only seconds spent while the timer is running.
    const creditedSeconds = Math.min(elapsed, remainingSeconds);

    data.todaySeconds += creditedSeconds;
    sessionSeconds += creditedSeconds;
    remainingSeconds -= creditedSeconds;

    saveData();
    updateTimerDisplay();
    updateStats();

    if (remainingSeconds <= 0) {
      finishSession();
    }
  }, 250);
});

$("resetTimer").addEventListener("click", () => {
  running = false;
  clearInterval(timerInterval);
  timerInterval = null;

  // Reset the timer without deleting previously earned study time.
  remainingSeconds = selectedMinutes * 60;
  sessionSeconds = 0;

  updateTimerDisplay();
  showToast("Timer reset.");
});

function finishSession() {
  running = false;
  clearInterval(timerInterval);
  timerInterval = null;

  remainingSeconds = 0;

  if (sessionSeconds > 0) {
    data.sessions += 1;
  }

  sessionSeconds = 0;

  saveData();
  updateStats();
  updateTimerDisplay();

  showToast("Amazing! Your study session is complete 🎉");

  // Ask the browser to play a short sound if possible.
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value = 660;
    gain.gain.value = 0.08;
    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
      0.001, audio.currentTime + 0.5
    );

    oscillator.stop(audio.currentTime + 0.5);
    oscillator.onended = () => audio.close();
  } catch {
    // The visual notification still works if sound is unavailable.
  }
}

// ---------- COMMUNITY ----------

const samplePosts = [
  {
    id: "sample1",
    name: "Ananya",
    message: "Just completed my first study session! Feeling productive today 🌻",
    likes: 12,
    comments: 3,
    liked: false,
    sample: true
  },
  {
    id: "sample2",
    name: "Riya",
    message: "Anyone revising Maths today? Let's keep each other motivated 💚",
    likes: 8,
    comments: 2,
    liked: false,
    sample: true
  },
  {
    id: "sample3",
    name: "Neha",
    message: "Small progress is still progress. Keep going, everyone! ✨",
    likes: 15,
    comments: 4,
    liked: false,
    sample: true
  }
];

$("postForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("postInput");
  const message = input.value.trim();

  if (!message) return;

  data.posts.unshift({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    name: data.name,
    message,
    likes: 0,
    comments: 0,
    liked: false,
    sample: false
  });

  input.value = "";
  saveData();
  renderCommunity();
  showToast("Your update has been posted!");
});

function renderCommunity() {
  const posts = [...data.posts, ...samplePosts];

  $("communityFeed").innerHTML = posts.map(post => `
    <article class="post-card">
      <div class="post-top">
        <div class="post-avatar">${escapeHTML(post.name.charAt(0).toUpperCase())}</div>
        <div>
          <div class="post-author">${escapeHTML(post.name)}</div>
          <div class="post-time">${post.sample ? "Community example" : "Your local post"}</div>
        </div>
      </div>

      <p class="post-message">${escapeHTML(post.message)}</p>

      <div class="post-actions">
        <button class="like-btn ${post.liked ? "liked" : ""}"
          data-like="${post.id}">
          ${post.liked ? "♥" : "♡"} ${post.likes}
        </button>
        <button class="comment-btn" data-comment="${post.id}">
          ♧ ${post.comments} comments
        </button>
      </div>
    </article>
  `).join("");

  $("communityFeed").querySelectorAll("[data-like]").forEach(button => {
    button.addEventListener("click", () => {
      const post = data.posts.find(
        item => item.id === button.dataset.like
      );

      if (!post) {
        showToast("Sample posts are for demonstration.");
        return;
      }

      post.liked = !post.liked;
      post.likes += post.liked ? 1 : -1;

      saveData();
      renderCommunity();
    });
  });

  $("communityFeed").querySelectorAll("[data-comment]").forEach(button => {
    button.addEventListener("click", () => {
      showToast("Comments need a comment form and a backend.");
    });
  });
}

// ---------- LEADERBOARD ----------

function renderLeaderboard() {
  const entries = [
    { name: "Ananya", seconds: 3 * 3600 + 1800 },
    { name: "Riya", seconds: 2 * 3600 + 1200 },
    { name: "Neha", seconds: 2 * 3600 },
    { name: "Aarav", seconds: 3600 + 1800 },
    { name: data.name, seconds: data.todaySeconds, mine: true }
  ];

  // Sort the example students and the current user's study time.
  entries.sort((a, b) => b.seconds - a.seconds);

  $("leaderboard").innerHTML = entries.map((entry, index) => `
    <div class="rank-item">
      <span class="rank-number">${index + 1}</span>
      <span class="post-avatar">${entry.mine ? "🌱" : "🎓"}</span>
      <span class="rank-name">
        ${escapeHTML(entry.name)}${entry.mine ? " (You)" : ""}
      </span>
      <span class="rank-time">${formatDuration(entry.seconds)}</span>
    </div>
  `).join("");

  const myRank = entries.findIndex(entry => entry.mine) + 1;
  $("yourRank").textContent =
    "Your current position in this sample leaderboard: #" + myRank;
}

// ---------- SETTINGS ----------

$("reminderToggle").addEventListener("change", (event) => {
  data.reminder = event.target.checked;
  saveData();

  showToast(data.reminder
    ? "Reminder preference saved."
    : "Reminders turned off.");

  if (data.reminder) {
    showToast("This preference is saved, but automatic reminders need extra setup.");
  }
});

$("focusToggle").addEventListener("change", (event) => {
  data.focusMode = event.target.checked;
  document.body.classList.toggle("focus-mode", data.focusMode);
  saveData();

  showToast(data.focusMode
    ? "Focus mode enabled for this website."
    : "Focus mode disabled.");
});

$("resetStats").addEventListener("click", () => {
  if (!confirm("Reset today's study time and completed sessions?")) return;

  data.todaySeconds = 0;
  data.sessions = 0;

  saveData();
  updateStats();
  renderLeaderboard();

  showToast("Study statistics reset.");
});

$("clearData").addEventListener("click", () => {
  if (!confirm("Clear all FOCUSUP data saved in this browser?")) return;

  if (running) {
    running = false;
    clearInterval(timerInterval);
    timerInterval = null;
  }

  localStorage.removeItem(STORAGE_KEY);
  data = { ...defaultData };

  selectedMinutes = 25;
  remainingSeconds = 25 * 60;
  sessionSeconds = 0;

  $("reminderToggle").checked = false;
  $("focusToggle").checked = false;
  document.body.classList.remove("focus-mode");

  updateProfile();
  updateStats();
  updateTimerDisplay();
  renderTasks();
  renderHome();
  showLogin();

  showToast("Local data cleared.");
});

// ---------- INITIAL SETUP ----------

function initialise() {
  updateProfile();

  $("reminderToggle").checked = Boolean(data.reminder);
  $("focusToggle").checked = Boolean(data.focusMode);

  document.body.classList.toggle("focus-mode", Boolean(data.focusMode));

  updateStats();
  updateTimerDisplay();
  renderTasks();
  renderHome();
  renderCommunity();
  renderLeaderboard();

  if (data.name) {
    showPage("home");
  } else {
    showLogin();
  }
}

initialise();
