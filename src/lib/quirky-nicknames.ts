// Safe, fun nicknames for users who haven't set a custom name
const QUIRKY_NICKNAMES = [
  "Task Master",
  "Productivity Wizard",
  "Goal Getter",
  "Champion",
  "Superstar",
  "Achiever",
  "Go-Getter",
  "Rockstar",
  "Dynamo",
  "Trailblazer",
  "Innovator",
  "Visionary",
  "Pioneer",
  "Legend",
  "Hero",
  "Maverick",
  "Ace",
  "Ninja",
  "Pro",
  "Expert",
  "Guru",
  "Boss",
  "Chief",
  "Captain",
  "Commander",
  "Leader",
  "Strategist",
  "Tactician",
  "Planner",
  "Organizer",
  "Doer",
  "Maker",
  "Creator",
  "Builder",
  "Designer",
  "Architect",
  "Engineer",
  "Developer",
  "Coder",
  "Hacker",
  "Genius",
  "Scholar",
  "Student",
  "Learner",
  "Teacher",
  "Mentor",
  "Guide",
  "Helper",
  "Friend",
  "Buddy",
];

export function getQuirkyNickname(lastIndex?: number): { nickname: string; index: number } {
  // If we've used all nicknames, reset
  const usedCount = lastIndex !== undefined ? lastIndex + 1 : 0;
  
  if (usedCount >= QUIRKY_NICKNAMES.length) {
    // Reset to beginning
    return { nickname: QUIRKY_NICKNAMES[0], index: 0 };
  }
  
  // Get next unused nickname
  const index = usedCount;
  return { nickname: QUIRKY_NICKNAMES[index], index };
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}