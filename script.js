
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const KEY = "focusup_dreamy_v1";
  const DAY = () => new Date().toLocaleDateString("en-CA");

  const initial = () => ({
    date: DAY(),
    todaySeconds: 0,
    totalXP: 0,
    sessions: 0,
    happiness: 80,
    dailyGoal: 120,
    streak: 0,
    lastStudyDate: "",
    studiedDates: [],
    tasks: [],
    goals: [
      { id: "g1", name: "Study for 2 hours", done: false },
      { id: "g2", name: "Finish one important task", done: false },
      { id: "g3", name: "Take a proper break", done: false }
    ],
    posts: [
      { id: "p1", name: "LunaDreams", avatar: "🌙", text: "Finished my study session! Every little step counts. ✨", likes: 3, liked: false, mine: false },
      { id: "p2", name: "StudyBunny", avatar: "🐰", text: "Reminder: you don't have to be perfect. Just keep going. 💗", likes: 5, liked: false, mine: false }
    ]
  });

  function load() {
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) return initial();
      const d = { ...initial(), ...JSON.parse(saved) };
      if (!Array.isArray(d.tasks)) d.tasks = [];
      if (!Array.isArray(d.goals)) d.goals = initial().goals;
      if (!Array.isArray(d.posts)) d.posts = initial().posts;
      if (!Array.isArray(d.studiedDates)) d.studiedDates = [];
      if (d.date !== DAY()) {
        d.date = DAY();
        d.todaySeconds = 0;
        d.sessions = 0;
        d.goals = d.goals.map(g =>
          g.id === "g1" ? { ...g, done: false } : g
        );
      }
      return d;
    } catch (e) {
      console.warn("FOCUSUP data could not be loaded.", e);
      return initial();
    }
  }

  let data = load();
  let duration = 25 * 60;
  let remaining = duration;
  let running = false;
  let interval = null;
  let lastTick = 0;
  let sessionCredited = 0;
  let selectedPeriod = "today";
  let toastTimer = null;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn("Could not save progress.", e); }
  }

  function notify(message) {
    const box = $("toast");
    if (!box) return;
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 2500);
  }

  function level() { return Math.floor(data.totalXP / 100) + 1; }
  function xpWithinLevel() { return Math.floor(data.totalXP % 100); }
  function fmt(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
      String(seconds % 60).padStart(2, "0");
  }
  function studyMinutes() { return Math.floor(data.todaySeconds / 60); }

  function updateStreak() {
    const today = DAY();
    if (!data.studiedDates.includes(today)) data.studiedDates.push(today);
    if (data.lastStudyDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString("en-CA");
    data.streak = data.lastStudyDate === yesterdayKey ? data.streak + 1 : 1;
    data.lastStudyDate = today;
  }

  function drawWeek() {
    const box = $("weekDots");
    box.replaceChildren();
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const key = date.toLocaleDateString("en-CA");
      const dot = document.createElement("span");
      dot.className = "week-dot" + (data.studiedDates.includes(key) ? " filled" : "");
      dot.textContent = data.studiedDates.includes(key) ? "♥" : "·";
      dot.title = key;
      box.appendChild(dot);
    }
  }

  function renderStats() {
    $("todayStudy").textContent = studyMinutes() + " min";
    $("streakValue").textContent = data.streak + (data.streak === 1 ? " day" : " days");
    $("sideStreak").textContent = data.streak + (data.streak === 1 ? " day" : " days");
    $("goalValue").textContent = data.goals.filter(g => g.done).length + " / " + data.goals.length;
    $("levelValue").textContent = "Level " + level();
    $("headerLevel").textContent = "Level " + level() + " explorer";
    $("xpSummary").textContent = Math.floor(data.totalXP) + " XP earned";
    $("progressTime").textContent = studyMinutes() + " / " + data.dailyGoal + " min";
    $("progressTasks").textContent = data.tasks.filter(t => t.done).length + " completed";
    $("progressStreak").textContent = data.streak + (data.streak === 1 ? " day" : " days");
    $("goalPercent").textContent = Math.min(100, Math.floor(studyMinutes() / data.dailyGoal * 100)) + "%";
    const pct = Math.min(100, studyMinutes() / data.dailyGoal * 100);
    $("goalRing").style.background = `conic-gradient(#b99be5 ${pct}%, #e6d9f5 ${pct}%)`;
    $("dailyGoalInput").value = data.dailyGoal;
    drawWeek();
  }

  function renderPet() {
    const lvl = level();
    const xp = xpWithinLevel();
    const pets = [
      ["🐣", "Baby Mochi"],
      ["🐥", "Little Mochi"],
      ["🐱", "Cozy Mochi"],
      ["🦊", "Dreamy Mochi"],
      ["🐼", "Sleepy Mochi"],
      ["🐉", "Legendary Mochi"]
    ];
    const pet = pets[Math.min(pets.length - 1, Math.floor((lvl - 1) / 2))];
    $("petCharacter").textContent = pet[0];
    $("petName").textContent = pet[1];
    $("petLevel").textContent = "LV. " + lvl;
    $("xpText").textContent = xp + " / 100 XP";
    $("xpBar").style.width = xp + "%";
    $("happinessValue").textContent = Math.round(data.happiness) + "%";
    $("happinessBar").style.width = data.happiness + "%";
    $("petMessage").textContent = data.happiness >= 75
      ? "Mochi is glowing with happiness! ✨"
      : data.happiness >= 40
        ? "Mochi would love a little attention. 💗"
        : "Mochi misses you. Let's cheer up together!";

    const nextLevel = Math.ceil(data.totalXP / 100) * 100 || 100;
    const reward = lvl < 3 ? "A cute sticker · Level 3"
      : lvl < 5 ? "A cozy pet accessory · Level 5"
      : "A new dreamy pet badge · Next level";
    $("nextReward").textContent = reward;
  }

  function renderTasks() {
    const list = $("taskList");
    list.replaceChildren();
    data.tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "task-check";
      check.checked = task.done;
      check.setAttribute("aria-label", "Complete task");
      check.addEventListener("change", () => {
        task.done = check.checked;
        if (task.done) {
          data.totalXP += 5;
          data.happiness = Math.min(100, data.happiness + 2);
          notify("Task completed! +5 XP 🌷");
        }
        save(); renderAll();
      });
      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;
      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-task";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete task");
      del.addEventListener("click", () => {
        data.tasks = data.tasks.filter(t => t.id !== task.id);
        save(); renderAll(); notify("Task removed.");
      });
      li.append(check, text, del);
      list.appendChild(li);
    });
    $("taskCount").textContent = data.tasks.filter(t => !t.done).length + " left";
    $("emptyTasks").hidden = data.tasks.length > 0;
  }

  function renderGoals() {
    const list = $("goalList");
    list.replaceChildren();
    data.goals.forEach(goal => {
      const item = document.createElement("div");
      item.className = "goal-item" + (goal.done ? " completed" : "");
      const top = document.createElement("div");
      top.className = "goal-top";
      const label = document.createElement("label");
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = goal.done;
      const name = document.createElement("span");
      name.className = "goal-name";
      name.textContent = goal.name;
      label.append(check, name);
      const del = document.createElement("button");
      del.className = "delete-task";
      del.type = "button";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete goal");
      del.addEventListener("click", () => {
        data.goals = data.goals.filter(g => g.id !== goal.id);
        save(); renderAll(); notify("Goal removed.");
      });
      check.addEventListener("change", () => {
        goal.done = check.checked;
        if (goal.done) {
          data.totalXP += 10;
          data.happiness = Math.min(100, data.happiness + 5);
          notify("Goal achieved! +10 XP ✨");
        }
        save(); renderAll();
      });
      top.append(label, del);
      const meter = document.createElement("div");
      meter.className = "goal-meter";
      const bar = document.createElement("span");
      bar.style.width = goal.done ? "100%" : "0%";
      meter.appendChild(bar);
      item.append(top, meter);
      list.appendChild(item);
    });
  }

  const demoScores = {
    today: [["LunaDreams","🌙",165],["StudyBunny","🐰",140],["PixelLearner","🦋",110],["BookWorm","📚",90]],
    week: [["StudyBunny","🐰",890],["LunaDreams","🌙",760],["BookWorm","📚",650],["PixelLearner","🦋",530]],
    month: [["BookWorm","📚",3200],["PixelLearner","🦋",2860],["LunaDreams","🌙",2540],["StudyBunny","🐰",2310]]
  };

  function renderLeaderboard() {
    const entries = demoScores[selectedPeriod].map(x => ({name:x[0], avatar:x[1], minutes:x[2], you:false}));
    entries.push({name:"You", avatar:"🌸", minutes:selectedPeriod === "today" ? studyMinutes() : Math.floor(data.totalXP / 2), you:true});
    entries.sort((a,b) => b.minutes - a.minutes);
    const list = $("leaderList");
    list.replaceChildren();
    entries.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "leader-row" + (entry.you ? " you" : "");
      const rank = document.createElement("span");
      rank.className = "rank " + (i === 0 ? "first" : i === 1 ? "second" : i === 2 ? "third" : "");
      rank.textContent = ["♛","2","3"][i] || String(i+1);
      const avatar = document.createElement("span");
      avatar.className = "leader-avatar";
      avatar.textContent = entry.avatar;
      const person = document.createElement("span");
      person.className = "leader-person";
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const caption = document.createElement("small");
      caption.textContent = entry.you ? "Your progress" : "Study friend";
      person.append(name, caption);
      const time = document.createElement("span");
      time.className = "leader-time";
      time.textContent = Math.floor(entry.minutes / 60) + "h " + String(entry.minutes % 60).padStart(2,"0") + "m";
      li.append(rank, avatar, person, time);
      list.appendChild(li);
    });
  }

  function renderFeed() {
    const list = $("feedList");
    list.replaceChildren();
    data.posts.slice().reverse().forEach(post => {
      const card = document.createElement("article");
      card.className = "feed-post";
      const head = document.createElement("div");
      head.className = "feed-header";
      const avatar = document.createElement("span");
      avatar.className = "feed-avatar";
      avatar.textContent = post.avatar || "🌸";
      const info = document.createElement("div");
      const author = document.createElement("span");
      author.className = "feed-author";
      author.textContent = post.name;
      const time = document.createElement("small");
      time.className = "feed-time";
      time.textContent = post.mine ? "Your post" : "Study friend";
      info.append(author, time);
      head.append(avatar, info);

      const body = document.createElement("p");
      body.className = "feed-text";
      body.textContent = post.text;

      const actions = document.createElement("div");
      actions.className = "feed-actions";
      const like = document.createElement("button");
      like.type = "button";
      like.className = post.liked ? "liked" : "";
      like.textContent = "♥ " + post.likes;
      like.addEventListener("click", () => {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        save(); renderFeed();
      });
      actions.appendChild(like);

      if (post.mine) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "remove-post";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
          data.posts = data.posts.filter(p => p.id !== post.id);
          save(); renderFeed(); notify("Post deleted.");
        });
        actions.appendChild(del);
      }
      card.append(head, body, actions);
      list.appendChild(card);
    });
  }

  function renderTimer() {
    $("timerDisplay").textContent = fmt(remaining);
    $("startBtn").textContent = running ? "Ⅱ Pause" : "▶ Start";
    $("customMinutes").value = Math.round(duration / 60);
    const pct = duration ? (1 - remaining / duration) * 100 : 0;
    const degrees = pct * 3.6;
    $("timerRing").style.background =
      `conic-gradient(#d3b7f0 ${degrees}deg, #f0c7e1 ${degrees}deg, #e8dbff 240deg, #d3b7f0 360deg)`;
    document.querySelectorAll(".duration-btn").forEach(btn => {
      const active = Number(btn.dataset.minutes) * 60 === duration;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    $("timerMode").textContent = running ? "You're in your focus era" : "Ready to focus";
  }

  function renderAll() {
    renderStats();
    renderPet();
    renderTasks();
    renderGoals();
    renderTimer();
    renderLeaderboard();
    renderFeed();
  }

  function stopInterval() {
    if (interval) clearInterval(interval);
    interval = null;
  }

  function pauseTimer(message = "Timer paused. Take a little breath.") {
    running = false;
    stopInterval();
    renderTimer();
    $("timerStatus").textContent = message;
  }

  function tick() {
    if (!running) return;
    const now = Date.now();
    const elapsed = Math.max(0, (now - lastTick) / 1000);
    lastTick = now;
    const credited = Math.min(elapsed, remaining);
    remaining = Math.max(0, remaining - credited);

    if (credited > 0) {
      data.todaySeconds += credited;
      data.totalXP += credited / 60;
      data.happiness = Math.min(100, data.happiness + credited / 120);
      sessionCredited += credited;
      updateStreak();
      save();
      renderStats();
      renderPet();
      renderLeaderboard();
    }

    renderTimer();
    if (remaining <= 0) {
      pauseTimer("You did it! Your focus session is complete. 🌸");
      data.sessions += 1;
      data.totalXP += 10;
      data.happiness = Math.min(100, data.happiness + 8);
      save();
      renderAll();
      notify("Session complete! +10 bonus XP 🎉");
      $("timerStatus").textContent = "Session complete! Mochi is so proud of you. 🎉";
    }
  }

  function setDuration(minutes) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 480) {
      notify("Choose between 1 and 480 whole minutes.");
      return;
    }
    pauseTimer("New session ready whenever you are.");
    duration = minutes * 60;
    remaining = duration;
    sessionCredited = 0;
    renderTimer();
  }

  $("startBtn").addEventListener("click", () => {
    if (running) {
      pauseTimer();
      return;
    }
    if (remaining <= 0) remaining = duration;
    running = true;
    lastTick = Date.now();
    $("timerStatus").textContent = "One thing at a time. You've got this! ✨";
    renderTimer();
    stopInterval();
    interval = setInterval(tick, 250);
  });

  $("resetBtn").addEventListener("click", () => {
    pauseTimer("Fresh start. Your next little win begins now.");
    remaining = duration;
    sessionCredited = 0;
    renderTimer();
  });

  document.querySelectorAll(".duration-btn").forEach(btn => {
    btn.addEventListener("click", () => setDuration(Number(btn.dataset.minutes)));
  });

  $("durationForm").addEventListener("submit", e => {
    e.preventDefault();
    setDuration(Number($("customMinutes").value));
  });

  $("taskForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("taskInput");
    const text = input.value.trim();
    if (!text) return;
    data.tasks.push({ id: Date.now().toString() + Math.random().toString(16).slice(2), text, done:false });
    input.value = "";
    save(); renderAll(); notify("Your little goal has been added 🌷");
    input.focus();
  });

  $("goalForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("goalInput");
    const name = input.value.trim();
    if (!name) return;
    data.goals.push({ id: Date.now().toString(), name, done:false });
    input.value = "";
    save(); renderAll(); notify("New goal added. One step at a time!");
  });

  $("dailyGoalForm").addEventListener("submit", e => {
    e.preventDefault();
    const value = Number($("dailyGoalInput").value);
    if (!Number.isInteger(value) || value < 1 || value > 1440) {
      notify("Enter a daily goal from 1 to 1440 minutes.");
      return;
    }
    data.dailyGoal = value;
    save(); renderAll(); notify("Daily study goal updated 🎯");
  });

  $("cheerBtn").addEventListener("click", () => {
    data.happiness = Math.min(100, data.happiness + 15);
    save(); renderPet(); notify("Mochi feels loved! 💗");
  });

  $("petButton").addEventListener("click", () => {
    data.happiness = Math.min(100, data.happiness + 3);
    $("petCharacter").animate(
      [{transform:"scale(1)"},{transform:"scale(1.2) rotate(-7deg)"},{transform:"scale(1)"}],
      {duration:400}
    );
    save(); renderPet(); notify("Mochi sends you a little love ♥");
  });

  $("postForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = $("postInput");
    const text = input.value.trim();
    if (!text) return;
    data.posts.push({
      id: Date.now().toString(),
      name: "You",
      avatar: "🌸",
      text,
      likes: 0,
      liked: false,
      mine: true
    });
    input.value = "";
    save(); renderFeed(); notify("Your post has been added locally ♡");
  });

  document.querySelectorAll(".leader-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedPeriod = btn.dataset.period;
      document.querySelectorAll(".leader-tab").forEach(b =>
        b.classList.toggle("active", b === btn)
      );
      renderLeaderboard();
    });
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));
      link.classList.add("active");
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (running) lastTick = Date.now();
  });

  window.addEventListener("beforeunload", () => {
    if (running) {
      const elapsed = Math.max(0, (Date.now() - lastTick) / 1000);
      const credited = Math.min(elapsed, remaining);
      remaining = Math.max(0, remaining - credited);
      data.todaySeconds += credited;
      data.totalXP += credited / 60;
      data.happiness = Math.min(100, data.happiness + credited / 120);
      if (credited > 0) updateStreak();
      save();
    }
  });

  // Initial render
  save();
  renderAll();
});
