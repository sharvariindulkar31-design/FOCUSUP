
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const $ = (id) => document.getElementById(id);

  // Make sure the page has the elements this script needs.
  const requiredIds = [
    "todayTime", "sessionCount", "petLevel", "durationForm",
    "customMinutes", "timerDisplay", "timerMessage", "startBtn",
    "resetBtn", "petEmoji", "petName", "petMessage", "xpBar",
    "xpText", "happiness", "feedPetBtn", "taskForm", "taskInput",
    "taskList", "emptyTasks", "taskCount"
  ];

  const missing = requiredIds.filter((id) => !$(id));

  if (missing.length) {
    console.error("FOCUSUP is missing HTML elements:", missing.join(", "));
    alert("Some FOCUSUP HTML elements are missing. Please check index.html.");
    return;
  }

  const STORAGE_KEY = "focusup_study_pet_v2";

  function todayString() {
    return new Date().toDateString();
  }

  function defaultData() {
    return {
      date: todayString(),
      todaySeconds: 0,
      sessions: 0,
      totalStudySeconds: 0,
      xp: 0,
      happiness: 100,
      tasks: []
    };
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultData();

      const parsed = JSON.parse(saved);
      const fresh = { ...defaultData(), ...parsed };

      if (!Array.isArray(fresh.tasks)) fresh.tasks = [];

      if (fresh.date !== todayString()) {
        fresh.date = todayString();
        fresh.todaySeconds = 0;
        fresh.sessions = 0;
      }

      return fresh;
    } catch (error) {
      console.error("Could not load saved FOCUSUP data:", error);
      return defaultData();
    }
  }

  let data = loadData();
  let durationSeconds = 25 * 60;
  let remainingSeconds = durationSeconds;
  let running = false;
  let intervalId = null;
  let lastTick = 0;
  let sessionSeconds = 0;

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Could not save FOCUSUP data:", error);
    }
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");
  }

  function petInfo(level) {
    if (level < 2) return { emoji: "🐣", name: "Baby Mochi" };
    if (level < 4) return { emoji: "🐥", name: "Growing Mochi" };
    if (level < 7) return { emoji: "🐱", name: "Cozy Mochi" };
    if (level < 10) return { emoji: "🦊", name: "Adventurer Mochi" };
    return { emoji: "🐉", name: "Legendary Mochi" };
  }

  function render() {
    $("todayTime").textContent =
      Math.floor(data.todaySeconds / 60) + " min";
    $("sessionCount").textContent = data.sessions;

    const level = Math.floor(data.xp / 100) + 1;
    const pet = petInfo(level);
    const xpIntoLevel = Math.floor(data.xp % 100);

    $("petLevel").textContent = level;
    $("petEmoji").textContent = pet.emoji;
    $("petName").textContent = pet.name;
    $("xpBar").style.width = xpIntoLevel + "%";
    $("xpText").textContent = xpIntoLevel + " / 100 XP to next level";
    $("happiness").textContent = Math.round(data.happiness) + "%";

    if (data.happiness >= 70) {
      $("petMessage").textContent = "Mochi is happy to study with you! 💗";
    } else if (data.happiness >= 35) {
      $("petMessage").textContent = "A little study time will cheer Mochi up.";
    } else {
      $("petMessage").textContent = "Mochi misses your study time. Let's begin!";
    }

    $("timerDisplay").textContent = formatTime(remainingSeconds);
    $("startBtn").textContent = running ? "Ⅱ Pause studying" : "▶ Start studying";
    $("customMinutes").value = Math.round(durationSeconds / 60);

    document.querySelectorAll(".preset").forEach((button) => {
      const selected = Number(button.dataset.minutes) * 60 === durationSeconds;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    renderTasks();
  }

  function renderTasks() {
    const list = $("taskList");
    list.replaceChildren();

    data.tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = "task-item" + (task.done ? " done" : "");

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "task-check";
      check.checked = task.done;
      check.setAttribute("aria-label", "Mark task complete");
      check.addEventListener("change", () => {
        task.done = check.checked;
        saveData();
        render();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-task";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => {
        data.tasks = data.tasks.filter((entry) => entry.id !== task.id);
        saveData();
        render();
      });

      item.append(check, text, remove);
      list.appendChild(item);
    });

    const remaining = data.tasks.filter((task) => !task.done).length;
    $("taskCount").textContent = remaining + " left";
    $("emptyTasks").hidden = data.tasks.length > 0;
  }

  function setMessage(message) {
    $("timerMessage").textContent = message;
  }

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function pauseTimer() {
    running = false;
    stopInterval();
    render();
  }

  function completeSession() {
    pauseTimer();
    remainingSeconds = 0;
    data.sessions += 1;
    data.happiness = Math.min(100, data.happiness + 10);
    saveData();
    setMessage("Session complete! Amazing work. Mochi is proud of you! 🎉");
    render();
  }

  function tick() {
    if (!running) return;

    const now = Date.now();
    const elapsed = Math.max(0, (now - lastTick) / 1000);
    lastTick = now;

    const credited = Math.min(elapsed, remainingSeconds);
    remainingSeconds = Math.max(0, remainingSeconds - credited);

    if (credited > 0) {
      data.todaySeconds += credited;
      data.totalStudySeconds += credited;
      data.xp += credited / 60;
      data.happiness = Math.min(100, data.happiness + credited / 120);
      sessionSeconds += credited;
      saveData();
    }

    if (remainingSeconds <= 0) {
      completeSession();
    } else {
      render();
    }
  }

  function startTimer() {
    if (running) {
      pauseTimer();
      setMessage("Timer paused. Take a breath whenever you need.");
      return;
    }

    if (remainingSeconds <= 0) {
      remainingSeconds = durationSeconds;
      sessionSeconds = 0;
    }

    running = true;
    lastTick = Date.now();
    setMessage("You're doing great. One minute at a time 🌷");
    render();
    stopInterval();
    intervalId = setInterval(tick, 250);
  }

  function resetTimer() {
    pauseTimer();
    remainingSeconds = durationSeconds;
    sessionSeconds = 0;
    setMessage("Timer reset. Ready when you are 🌸");
    render();
  }

  function chooseDuration(minutes) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      alert("Choose a duration between 1 and 480 minutes.");
      return;
    }

    pauseTimer();
    durationSeconds = minutes * 60;
    remainingSeconds = durationSeconds;
    sessionSeconds = 0;
    setMessage("New study duration set. You've got this!");
    render();
  }

  // Preset timer buttons
  document.querySelectorAll(".preset").forEach((button) => {
    button.addEventListener("click", () => {
      chooseDuration(Number(button.dataset.minutes));
    });
  });

  // Custom duration form
  $("durationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const minutes = Number($("customMinutes").value);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      alert("Enter a whole number from 1 to 480 minutes.");
      return;
    }

    chooseDuration(minutes);
  });

  // Start and pause
  $("startBtn").addEventListener("click", startTimer);

  // Reset
  $("resetBtn").addEventListener("click", resetTimer);

  // Cheer up the pet
  $("feedPetBtn").addEventListener("click", () => {
    data.happiness = Math.min(100, data.happiness + 15);
    saveData();
    setMessage("You sent Mochi some love! 💗");
    render();
  });

  // Add tasks
  $("taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = $("taskInput").value.trim();

    if (!text) {
      $("taskInput").focus();
      return;
    }

    data.tasks.push({
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      text,
      done: false
    });

    $("taskInput").value = "";
    saveData();
    render();
    $("taskInput").focus();
  });

  // Save credited time if the tab is closed or refreshed.
  document.addEventListener("visibilitychange", () => {
    if (running) {
      lastTick = Date.now();
      setMessage("Timer continues while this tab is open.");
    }
  });

  // Initial display
  saveData();
  render();
});
