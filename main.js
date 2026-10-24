const navigationTabs = document.querySelectorAll(".nav-tab");
const profileArea = document.querySelector(".profile-area");
const profileButton = document.querySelector(".profile-button");
const profileMenu = document.querySelector(".profile-menu");
const homeView = document.querySelector("#home-view");
const checklistView = document.querySelector("#checklist-view");
const statisticsView = document.querySelector("#statistics-view");
const infoView = document.querySelector("#info-view");
const profileView = document.querySelector("#profile-view");
const startChecklistButton = document.querySelector("#start-checklist");
const restPrompt = document.querySelector(".rest-prompt");
const daySummary = document.querySelector("#day-summary");
const daySummaryText = document.querySelector(".day-summary-text");
const changeDayButton = document.querySelector(".change-day");
const routineList = document.querySelector("#routine-list");
const progressValue = document.querySelector("#progress-value");
const progressBar = document.querySelector(".progress-track");
const progressFill = document.querySelector(".progress-fill");
const completeButton = document.querySelector("#complete-checklist");
const statisticsNumber = document.querySelector(".statistics-number");
const profilePhotoButton = document.querySelector("#profile-photo-button");
const profilePhotoInput = document.querySelector("#profile-photo-input");
const profilePhoto = document.querySelector("#profile-photo");
const profilePhotoPlaceholder = document.querySelector("#profile-photo-placeholder");
const profileBio = document.querySelector("#profile-bio");
const editBioButton = document.querySelector("#edit-bio-button");
const bioEditor = document.querySelector("#bio-editor");
const bioInput = document.querySelector("#bio-input");
const bioCancelButton = document.querySelector("#bio-cancel");
const logoutButton = document.querySelector("#logout-button");
const profileStatus = document.querySelector("#profile-status");
const appStatus = document.querySelector("#app-status");

const DAILY_STORAGE_KEY = "checklist.daily.v1";
const STATISTICS_STORAGE_KEY = "checklist.statistics.v1";
const PROFILE_STORAGE_KEY = "checklist.profile.v1";
const routineItems = [
  { id: "wake-up", label: "Wake Up On Time" },
  { id: "get-out-of-bed", label: "Get Out of Bed" },
  { id: "drink-water", label: "Drink Water" },
  { id: "breakfast", label: "Eat Breakfast" },
  { id: "shower", label: "Shower" },
  { id: "school", label: "Go to School" },
  { id: "lunch", label: "Eat Lunch" },
  { id: "pre-workout", label: "Eat Pre-Workout", trainingOnly: true },
  { id: "workout", label: "Workout", trainingOnly: true },
  { id: "walk", label: "Walk" },
  { id: "magnesium", label: "Take Magnesium" },
  { id: "bed", label: "Go to Bed" },
];
const validRoutineIds = new Set(routineItems.map((item) => item.id));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readStoredValue(key, fallback) {
  const serialized = localStorage.getItem(key);
  return serialized === null ? fallback : JSON.parse(serialized);
}

function saveStoredValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save ${key}.`, error);
    const message = "Changes could not be saved on this device.";
    profileStatus.textContent = message;
    appStatus.textContent = message;
    return false;
  }
}

function setProfileMenuOpen(isOpen, restoreFocus = false) {
  profileButton.setAttribute("aria-expanded", String(isOpen));
  profileMenu.setAttribute("aria-hidden", String(!isOpen));
  profileMenu.inert = !isOpen;
  profileMenu.classList.toggle("is-open", isOpen);

  if (restoreFocus) profileButton.focus();
}

function setActiveTab(viewName) {
  navigationTabs.forEach((tab) => {
    const isActive = tab.dataset.view === viewName;
    tab.classList.toggle("is-active", isActive);
    tab.classList.remove("is-changing");

    if (isActive) {
      tab.setAttribute("aria-current", "page");
      requestAnimationFrame(() => tab.classList.add("is-changing"));
    } else {
      tab.removeAttribute("aria-current");
    }
  });
}

function showView(viewName) {
  const views = [
    ["home", homeView],
    ["checklist", checklistView],
    ["statistics", statisticsView],
    ["info", infoView],
    ["profile", profileView],
  ];

  views.forEach(([name, view]) => {
    const isVisible = name === viewName;
    view.classList.toggle("is-hidden", !isVisible);
    view.setAttribute("aria-hidden", String(!isVisible));
    view.inert = !isVisible;
  });

  setActiveTab(viewName);
  setProfileMenuOpen(false);

  if (viewName === "statistics") animateStatistics();
  if (viewName === "profile") profileStatus.textContent = "";
}

function getVisibleItems() {
  return routineItems.filter((item) => !item.trainingOnly || !dailyState.isRestDay);
}

function updateProgress() {
  const visibleItems = getVisibleItems();
  const completedCount = visibleItems.filter((item) => dailyState.completedItems.includes(item.id)).length;
  const totalCount = visibleItems.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  progressValue.textContent = `${completedCount}/${totalCount}`;
  progressBar.setAttribute("aria-valuemax", String(totalCount));
  progressBar.setAttribute("aria-valuenow", String(completedCount));
  progressFill.style.width = `${progress}%`;

  let completionNote = routineList.querySelector(".completion-note");
  if (completedCount === totalCount) {
    if (!completionNote) {
      completionNote = document.createElement("p");
      completionNote.className = "completion-note";
      completionNote.textContent = "All done. You showed up for yourself today.";
      routineList.append(completionNote);
    }
  } else {
    completionNote?.remove();
  }
}

function renderRoutine() {
  const visibleItems = getVisibleItems();

  routineList.innerHTML = visibleItems
    .map(
      (item, index) => `
        <div class="task-row" style="--item-index: ${index}">
          <button class="task-toggle" type="button" role="checkbox" aria-checked="${dailyState.completedItems.includes(item.id)}" data-task-id="${item.id}">
            <span class="task-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="task-label">${item.label}</span>
            <span class="task-check" aria-hidden="true">
              <svg viewBox="0 0 16 16"><path d="m3.5 8 3 3 6-6" /></svg>
            </span>
          </button>
        </div>
      `,
    )
    .join("");

  updateProgress();
}

function renderDayChoice() {
  const hasChosenDay = dailyState.isRestDay !== null;
  restPrompt.classList.toggle("is-hidden", hasChosenDay);
  daySummary.classList.toggle("is-hidden", !hasChosenDay);
  routineList.classList.toggle("is-locked", !hasChosenDay);
  completeButton.classList.toggle("is-hidden", !hasChosenDay);

  if (hasChosenDay) {
    daySummaryText.textContent = dailyState.isRestDay
      ? "Rest day selected · Workout and pre-workout are skipped."
      : "Training day selected · Your full routine is ready.";
    renderRoutine();
  } else {
    routineList.replaceChildren();
    updateProgress();
  }
}

function persistDailyState() {
  dailyState.date = getLocalDateKey();
  saveStoredValue(DAILY_STORAGE_KEY, dailyState);
}

function chooseDay(restDay) {
  dailyState.isRestDay = restDay;
  persistDailyState();
  renderDayChoice();
}

function askAboutDay() {
  dailyState.isRestDay = null;
  persistDailyState();
  renderDayChoice();
}

function resetForNewDay() {
  dailyState = {
    date: getLocalDateKey(),
    isRestDay: null,
    completedItems: [],
  };
  persistDailyState();
  renderDayChoice();
}

function checkForNewDay() {
  if (dailyState.date !== getLocalDateKey()) resetForNewDay();
}

function scheduleMidnightReset() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 50);
  window.setTimeout(() => {
    checkForNewDay();
    scheduleMidnightReset();
  }, nextMidnight.getTime() - now.getTime());
}

function animateStatistics() {
  const target = statistics.totalCompleted;
  const current = Number(statisticsNumber.textContent) || 0;

  if (prefersReducedMotion.matches || current === target) {
    statisticsNumber.textContent = String(target);
    return;
  }

  const startTime = performance.now();
  const duration = 850;
  const updateNumber = (time) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 4;
    statisticsNumber.textContent = String(Math.round(current + (target - current) * eased));
    if (progress < 1) requestAnimationFrame(updateNumber);
  };

  requestAnimationFrame(updateNumber);
}

function updateProfilePhoto(dataUrl) {
  profilePhoto.src = dataUrl;
  profilePhoto.classList.remove("is-hidden");
  profilePhotoPlaceholder.classList.add("is-hidden");
  const avatar = document.createElement("img");
  avatar.src = dataUrl;
  avatar.alt = "";
  profileButton.replaceChildren(avatar);
  profileButton.setAttribute("aria-label", "Open profile menu");
}

function loadProfile() {
  if (profileData.photo) updateProfilePhoto(profileData.photo);
  profileBio.textContent = profileData.bio;
}

async function makeProfilePhoto(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image canvas is unavailable.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

let dailyState;
let statistics;
let profileData;

try {
  dailyState = readStoredValue(DAILY_STORAGE_KEY, {
    date: getLocalDateKey(),
    isRestDay: null,
    completedItems: [],
  });
  if (dailyState.date !== getLocalDateKey()) {
    dailyState = { date: getLocalDateKey(), isRestDay: null, completedItems: [] };
  }
  dailyState.completedItems = Array.isArray(dailyState.completedItems)
    ? dailyState.completedItems.filter((id) => validRoutineIds.has(id))
    : [];
  dailyState.isRestDay = typeof dailyState.isRestDay === "boolean" ? dailyState.isRestDay : null;

  statistics = readStoredValue(STATISTICS_STORAGE_KEY, { totalCompleted: 0 });
  statistics.totalCompleted = Number.isSafeInteger(statistics.totalCompleted) && statistics.totalCompleted >= 0
    ? statistics.totalCompleted
    : 0;

  profileData = readStoredValue(PROFILE_STORAGE_KEY, { bio: "Dedicated", photo: "" });
  profileData.bio = typeof profileData.bio === "string" ? profileData.bio.slice(0, 120) : "Dedicated";
  profileData.photo = typeof profileData.photo === "string" ? profileData.photo : "";
} catch (error) {
  console.error("Unable to load saved checklist data.", error);
  dailyState = { date: getLocalDateKey(), isRestDay: null, completedItems: [] };
  statistics = { totalCompleted: 0 };
  profileData = { bio: "Dedicated", photo: "" };
  profileStatus.textContent = "Saved data could not be read. New changes may not persist.";
  appStatus.textContent = profileStatus.textContent;
}

navigationTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.view) showView(tab.dataset.view);
  });

  tab.addEventListener("animationend", (event) => {
    if (event.animationName === "nav-select") tab.classList.remove("is-changing");
  });
});

startChecklistButton.addEventListener("click", () => showView("checklist"));

routineList.addEventListener("click", (event) => {
  const taskButton = event.target.closest(".task-toggle");
  if (!taskButton) return;

  const taskId = taskButton.dataset.taskId;
  dailyState.completedItems = dailyState.completedItems.includes(taskId)
    ? dailyState.completedItems.filter((id) => id !== taskId)
    : [...dailyState.completedItems, taskId];
  taskButton.setAttribute("aria-checked", String(dailyState.completedItems.includes(taskId)));
  persistDailyState();
  updateProgress();
});

document.querySelectorAll("[data-rest-day]").forEach((button) => {
  button.addEventListener("click", () => chooseDay(button.dataset.restDay === "true"));
});

changeDayButton.addEventListener("click", askAboutDay);

completeButton.addEventListener("click", () => {
  statistics.totalCompleted += 1;
  dailyState.completedItems = [];
  saveStoredValue(STATISTICS_STORAGE_KEY, statistics);
  persistDailyState();
  renderRoutine();
  completeButton.classList.remove("is-completing");
  requestAnimationFrame(() => completeButton.classList.add("is-completing"));
  completeButton.querySelector("span").textContent = "Completed — start fresh";
  window.setTimeout(() => {
    completeButton.classList.remove("is-completing");
    completeButton.querySelector("span").textContent = "Complete checklist";
  }, 1300);
});

profileButton.addEventListener("click", () => {
  const isOpen = profileButton.getAttribute("aria-expanded") === "true";
  setProfileMenuOpen(!isOpen);
  if (!isOpen) profileMenu.querySelector('[role="menuitem"]').focus();
});

profileMenu.addEventListener("click", (event) => {
  const menuItem = event.target.closest('[role="menuitem"]');
  if (!menuItem) return;

  setProfileMenuOpen(false, true);
  if (menuItem.dataset.profileAction === "open") showView("profile");
  if (menuItem.dataset.profileAction === "info") showView("info");
  if (menuItem.classList.contains("profile-menu-item--logout")) showView("home");
});

document.addEventListener("pointerdown", (event) => {
  if (!profileArea.contains(event.target)) setProfileMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && profileButton.getAttribute("aria-expanded") === "true") {
    setProfileMenuOpen(false, true);
  }
});

profilePhotoButton.addEventListener("click", () => profilePhotoInput.click());

profilePhotoInput.addEventListener("change", async () => {
  const [file] = profilePhotoInput.files;
  if (!file) return;

  try {
    const photo = await makeProfilePhoto(file);
    const previousPhoto = profileData.photo;
    profileData.photo = photo;
    if (saveStoredValue(PROFILE_STORAGE_KEY, profileData)) {
      updateProfilePhoto(photo);
      profileStatus.textContent = "Profile photo saved.";
    } else {
      profileData.photo = previousPhoto;
    }
  } catch (error) {
    console.error("Unable to process the selected profile photo.", error);
    profileStatus.textContent = "That photo could not be loaded. Try another image.";
  } finally {
    profilePhotoInput.value = "";
  }
});

editBioButton.addEventListener("click", () => {
  bioInput.value = profileData.bio;
  bioEditor.classList.remove("is-hidden");
  editBioButton.classList.add("is-hidden");
  bioInput.focus();
});

bioCancelButton.addEventListener("click", () => {
  bioEditor.classList.add("is-hidden");
  editBioButton.classList.remove("is-hidden");
});

bioEditor.addEventListener("submit", (event) => {
  event.preventDefault();
  const previousBio = profileData.bio;
  profileData.bio = bioInput.value.trim() || "Dedicated";

  if (saveStoredValue(PROFILE_STORAGE_KEY, profileData)) {
    profileBio.textContent = profileData.bio;
    profileStatus.textContent = "Bio saved.";
    bioEditor.classList.add("is-hidden");
    editBioButton.classList.remove("is-hidden");
  } else {
    profileData.bio = previousBio;
  }
});

logoutButton.addEventListener("click", () => showView("home"));

document.addEventListener("visibilitychange", checkForNewDay);
window.addEventListener("pageshow", checkForNewDay);

if (dailyState.date !== getLocalDateKey()) resetForNewDay();
else saveStoredValue(DAILY_STORAGE_KEY, dailyState);
renderDayChoice();
loadProfile();
statisticsNumber.textContent = String(statistics.totalCompleted);
scheduleMidnightReset();
