// Quirky nicknames for users who haven't set a name
const QUIRKY_NICKNAMES = [
  "Captain Productivity",
  "Task Master Supreme",
  "The Organized One",
  "Checkbox Champion",
  "Deadline Destroyer",
  "Todo Titan",
  "Efficiency Expert",
  "Goal Getter",
  "Achievement Hunter",
  "Progress Pioneer",
  "Mission Commander",
  "Victory Seeker",
  "Focus Ninja",
  "Completion Wizard",
  "Time Warrior",
  "Taskforce Alpha",
  "The Accomplisher",
  "Strike King",
  "The Productive Penguin",
  "List Legend",
  "Agenda Ace",
  "Priority Pro",
  "Schedule Samurai",
  "Plan Perfectionist",
  "The Doer",
  "Action Hero",
  "Workflow Wizard",
  "Task Tactician",
  "Milestone Maven",
  "Objective Oracle"
];

// Get time-based greeting
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

// Get user's name or a quirky nickname
export function getUserDisplayName(): string {
  // Check if user has set a name
  const userName = localStorage.getItem("userName");
  if (userName && userName.trim()) {
    return userName.trim();
  }
  
  // Get or generate a quirky nickname
  let nicknameIndex = parseInt(localStorage.getItem("quirkyNicknameIndex") || "-1", 10);
  
  // If no nickname assigned yet, pick a random one
  if (nicknameIndex === -1 || nicknameIndex >= QUIRKY_NICKNAMES.length) {
    nicknameIndex = Math.floor(Math.random() * QUIRKY_NICKNAMES.length);
    localStorage.setItem("quirkyNicknameIndex", String(nicknameIndex));
  }
  
  return QUIRKY_NICKNAMES[nicknameIndex];
}

// Get full greeting message
export function getGreeting(): string {
  const timeGreeting = getTimeBasedGreeting();
  const displayName = getUserDisplayName();
  
  return `${timeGreeting}, ${displayName}!`;
}

// Rotate to a new quirky nickname (for users without custom names)
export function rotateQuirkyNickname(): string {
  const userName = localStorage.getItem("userName");
  if (userName && userName.trim()) {
    return userName.trim(); // Don't rotate if they have a custom name
  }
  
  // Get current index
  let currentIndex = parseInt(localStorage.getItem("quirkyNicknameIndex") || "-1", 10);
  
  // Pick a different random nickname
  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * QUIRKY_NICKNAMES.length);
  } while (newIndex === currentIndex && QUIRKY_NICKNAMES.length > 1);
  
  localStorage.setItem("quirkyNicknameIndex", String(newIndex));
  return QUIRKY_NICKNAMES[newIndex];
}