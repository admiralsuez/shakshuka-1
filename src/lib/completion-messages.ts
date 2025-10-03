"use client";

export type CompletionMessage = {
  msgId: string;
  version: number;
  text: string;
  category: "encouragement" | "humor" | "achievement" | "motivational" | "quirky";
};

const TOTAL_MESSAGES = 200;
const MESSAGES_KEY_PREFIX = "shakshuka_msg_";

// Generate a specific message by index (0-199)
function generateMessageByIndex(index: number): CompletionMessage {
  const categories = ["encouragement", "humor", "achievement", "motivational", "quirky"] as const;
  const categoryIndex = Math.floor(index / 40);
  const messageInCategory = (index % 40) + 1;
  const category = categories[categoryIndex];
  
  // Message map - only generates the requested message
  const messages: Record<number, CompletionMessage> = {
    // Encouragement (0-39)
    0: { msgId: "enc-001", version: 1, text: "You crushed it today! All tasks completed! 🎉", category: "encouragement" },
    1: { msgId: "enc-002", version: 1, text: "Fantastic work! You're on fire! 🔥", category: "encouragement" },
    2: { msgId: "enc-003", version: 1, text: "Amazing! Every single task done! ⭐", category: "encouragement" },
    3: { msgId: "enc-004", version: 1, text: "You're unstoppable! Great job! 💪", category: "encouragement" },
    4: { msgId: "enc-005", version: 1, text: "Incredible! You cleared your list! 🌟", category: "encouragement" },
    5: { msgId: "enc-006", version: 1, text: "Outstanding performance today! 👏", category: "encouragement" },
    6: { msgId: "enc-007", version: 1, text: "You're a productivity machine! 🚀", category: "encouragement" },
    7: { msgId: "enc-008", version: 1, text: "Perfectly executed! Well done! ✨", category: "encouragement" },
    8: { msgId: "enc-009", version: 1, text: "You made it look easy! Brilliant! 🎯", category: "encouragement" },
    9: { msgId: "enc-010", version: 1, text: "All done! You're absolutely crushing it! 💎", category: "encouragement" },
    10: { msgId: "enc-011", version: 1, text: "Task master! You've conquered them all! 👑", category: "encouragement" },
    11: { msgId: "enc-012", version: 1, text: "Boom! Another day, another victory! 💥", category: "encouragement" },
    12: { msgId: "enc-013", version: 1, text: "You're a rockstar! Every task completed! 🎸", category: "encouragement" },
    13: { msgId: "enc-014", version: 1, text: "Superb! You've mastered your day! 🏆", category: "encouragement" },
    14: { msgId: "enc-015", version: 1, text: "Flawless execution! You're amazing! ✅", category: "encouragement" },
    15: { msgId: "enc-016", version: 1, text: "You're killing it! All tasks done! 🎊", category: "encouragement" },
    16: { msgId: "enc-017", version: 1, text: "Phenomenal! You cleared the board! 🎲", category: "encouragement" },
    17: { msgId: "enc-018", version: 1, text: "You did it! Every single one! 🌈", category: "encouragement" },
    18: { msgId: "enc-019", version: 1, text: "Spectacular! You're on a roll! 🎰", category: "encouragement" },
    19: { msgId: "enc-020", version: 1, text: "Champion! You've won today! 🥇", category: "encouragement" },
    20: { msgId: "enc-021", version: 1, text: "Bravo! Task list demolished! 👍", category: "encouragement" },
    21: { msgId: "enc-022", version: 1, text: "You're a legend! All done! 🦸", category: "encouragement" },
    22: { msgId: "enc-023", version: 1, text: "Magnificent! You nailed every task! 🔨", category: "encouragement" },
    23: { msgId: "enc-024", version: 1, text: "Power move! Everything completed! ⚡", category: "encouragement" },
    24: { msgId: "enc-025", version: 1, text: "You're the best! All tasks struck! 🌺", category: "encouragement" },
    25: { msgId: "enc-026", version: 1, text: "Winning! You've cleared your plate! 🍽️", category: "encouragement" },
    26: { msgId: "enc-027", version: 1, text: "Ace! You've aced today! 🃏", category: "encouragement" },
    27: { msgId: "enc-028", version: 1, text: "Perfect score! All done! 💯", category: "encouragement" },
    28: { msgId: "enc-029", version: 1, text: "You're a wizard! Tasks vanished! 🧙", category: "encouragement" },
    29: { msgId: "enc-030", version: 1, text: "Stellar! You've conquered the list! ⭐", category: "encouragement" },
    30: { msgId: "enc-031", version: 1, text: "Victory! You've won the day! 🎖️", category: "encouragement" },
    31: { msgId: "enc-032", version: 1, text: "Awesome sauce! All tasks done! 🎨", category: "encouragement" },
    32: { msgId: "enc-033", version: 1, text: "You're on point! Everything complete! 📍", category: "encouragement" },
    33: { msgId: "enc-034", version: 1, text: "Masterful! You've mastered today! 🎭", category: "encouragement" },
    34: { msgId: "enc-035", version: 1, text: "Epic! You've slayed the tasks! ⚔️", category: "encouragement" },
    35: { msgId: "enc-036", version: 1, text: "Brilliant! Every task conquered! 💡", category: "encouragement" },
    36: { msgId: "enc-037", version: 1, text: "You're flying! All done! 🦅", category: "encouragement" },
    37: { msgId: "enc-038", version: 1, text: "Dynamite! You've exploded that list! 🧨", category: "encouragement" },
    38: { msgId: "enc-039", version: 1, text: "Supreme! You're supreme today! 👔", category: "encouragement" },
    39: { msgId: "enc-040", version: 1, text: "Stellar performance! All complete! 🌠", category: "encouragement" },
    
    // Humor (40-79)
    40: { msgId: "hum-001", version: 1, text: "You're so productive, even your coffee is impressed! ☕", category: "humor" },
    41: { msgId: "hum-002", version: 1, text: "Task ninja! Silent, deadly, efficient! 🥷", category: "humor" },
    42: { msgId: "hum-003", version: 1, text: "Your to-do list just called to surrender! 🏳️", category: "humor" },
    43: { msgId: "hum-004", version: 1, text: "You've achieved inbox zero's cooler cousin: task zero! 📭", category: "humor" },
    44: { msgId: "hum-005", version: 1, text: "Plot twist: you actually finished everything! 🎬", category: "humor" },
    45: { msgId: "hum-006", version: 1, text: "Your productivity level: OVER 9000! 📈", category: "humor" },
    46: { msgId: "hum-007", version: 1, text: "Tasks.exe has stopped responding... because you finished them all! 💻", category: "humor" },
    47: { msgId: "hum-008", version: 1, text: "Achievement unlocked: Actual Adult! 🏅", category: "humor" },
    48: { msgId: "hum-009", version: 1, text: "Your procrastination took a day off! 🦥", category: "humor" },
    49: { msgId: "hum-010", version: 1, text: "Tasks tried to hide, but you found them all! 🔍", category: "humor" },
    50: { msgId: "hum-011", version: 1, text: "You've out-tasked the task-master! 🎓", category: "humor" },
    51: { msgId: "hum-012", version: 1, text: "Multitasking? More like multi-finished! 🎪", category: "humor" },
    52: { msgId: "hum-013", version: 1, text: "Your to-do list is now a to-done list! 📝", category: "humor" },
    53: { msgId: "hum-014", version: 1, text: "You've beaten the final boss: your task list! 🎮", category: "humor" },
    54: { msgId: "hum-015", version: 1, text: "Breaking news: Local hero conquers all tasks! 📰", category: "humor" },
    55: { msgId: "hum-016", version: 1, text: "Your productivity is making other apps jealous! 📱", category: "humor" },
    56: { msgId: "hum-017", version: 1, text: "Task list: 0, You: 1000! 🎯", category: "humor" },
    57: { msgId: "hum-018", version: 1, text: "You're so efficient, you could teach time management to clocks! ⏰", category: "humor" },
    58: { msgId: "hum-019", version: 1, text: "Congratulations! You've reached the end of the internet... I mean, your tasks! 🌐", category: "humor" },
    59: { msgId: "hum-020", version: 1, text: "Your tasks stood no chance! Legendary! 🗡️", category: "humor" },
    60: { msgId: "hum-021", version: 1, text: "You've Marie Kondo'd your task list! ✨", category: "humor" },
    61: { msgId: "hum-022", version: 1, text: "Task completion rate: 100%. Legendary mode activated! 🎖️", category: "humor" },
    62: { msgId: "hum-023", version: 1, text: "Your focus is sharper than a samurai sword! ⚔️", category: "humor" },
    63: { msgId: "hum-024", version: 1, text: "You've achieved what mortals only dream of! 🏛️", category: "humor" },
    64: { msgId: "hum-025", version: 1, text: "Your task list just filed for retirement! 👴", category: "humor" },
    65: { msgId: "hum-026", version: 1, text: "You've unlocked the secret ending: Everything Done! 🎭", category: "humor" },
    66: { msgId: "hum-027", version: 1, text: "Your productivity is off the charts! Literally! 📊", category: "humor" },
    67: { msgId: "hum-028", version: 1, text: "Task list tried to run, but you were faster! 🏃", category: "humor" },
    68: { msgId: "hum-029", version: 1, text: "You've speedrun your day! New world record! 🏁", category: "humor" },
    69: { msgId: "hum-030", version: 1, text: "Your efficiency is making Excel spreadsheets cry! 📈", category: "humor" },
    70: { msgId: "hum-031", version: 1, text: "You've completed more tasks than a bee on espresso! 🐝", category: "humor" },
    71: { msgId: "hum-032", version: 1, text: "Your to-do list just updated its status to 'mission accomplished'! 🎖️", category: "humor" },
    72: { msgId: "hum-033", version: 1, text: "You're so good at this, tasks are completing themselves out of respect! 🙇", category: "humor" },
    73: { msgId: "hum-034", version: 1, text: "Your productivity level is causing server overload! 🖥️", category: "humor" },
    74: { msgId: "hum-035", version: 1, text: "You've achieved peak performance! Mountains are jealous! ⛰️", category: "humor" },
    75: { msgId: "hum-036", version: 1, text: "Your task list just sent a distress signal... too late! 📡", category: "humor" },
    76: { msgId: "hum-037", version: 1, text: "You're more organized than a librarian's dream! 📚", category: "humor" },
    77: { msgId: "hum-038", version: 1, text: "Your efficiency deserves its own emoji! 🤩", category: "humor" },
    78: { msgId: "hum-039", version: 1, text: "You've completed tasks faster than a cheetah on roller skates! 🐆", category: "humor" },
    79: { msgId: "hum-040", version: 1, text: "Your productivity is the stuff of legends! Bards will sing of this! 🎵", category: "humor" },
    
    // Achievement (80-119)
    80: { msgId: "ach-001", version: 1, text: "100% completion! You're a true achiever! 🏆", category: "achievement" },
    81: { msgId: "ach-002", version: 1, text: "Perfect day! All objectives met! 🎯", category: "achievement" },
    82: { msgId: "ach-003", version: 1, text: "Milestone reached! Every task complete! 🚩", category: "achievement" },
    83: { msgId: "ach-004", version: 1, text: "Achievement unlocked: Task Master! 🎖️", category: "achievement" },
    84: { msgId: "ach-005", version: 1, text: "Gold star performance! ⭐", category: "achievement" },
    85: { msgId: "ach-006", version: 1, text: "Level up! You've completed everything! 🆙", category: "achievement" },
    86: { msgId: "ach-007", version: 1, text: "Trophy earned: Perfect Completion! 🏅", category: "achievement" },
    87: { msgId: "ach-008", version: 1, text: "Badge of honor: All Tasks Done! 🎗️", category: "achievement" },
    88: { msgId: "ach-009", version: 1, text: "Personal best! Everything finished! 🥇", category: "achievement" },
    89: { msgId: "ach-010", version: 1, text: "Record broken! All done! 📊", category: "achievement" },
    90: { msgId: "ach-011", version: 1, text: "Crown earned: Task Champion! 👑", category: "achievement" },
    91: { msgId: "ach-012", version: 1, text: "Platinum status achieved! 💎", category: "achievement" },
    92: { msgId: "ach-013", version: 1, text: "Five stars! Perfect execution! ⭐⭐⭐⭐⭐", category: "achievement" },
    93: { msgId: "ach-014", version: 1, text: "Hall of fame entry: All Complete! 🏛️", category: "achievement" },
    94: { msgId: "ach-015", version: 1, text: "Medal of excellence awarded! 🎖️", category: "achievement" },
    95: { msgId: "ach-016", version: 1, text: "Summit reached! Top of the mountain! ⛰️", category: "achievement" },
    96: { msgId: "ach-017", version: 1, text: "Victory lap! You've won! 🏁", category: "achievement" },
    97: { msgId: "ach-018", version: 1, text: "Podium finish! First place! 🥇", category: "achievement" },
    98: { msgId: "ach-019", version: 1, text: "Grand slam! All tasks done! ⚾", category: "achievement" },
    99: { msgId: "ach-020", version: 1, text: "Perfect score! 100/100! 💯", category: "achievement" },
    100: { msgId: "ach-021", version: 1, text: "Title defended: Still the Champion! 🏆", category: "achievement" },
    101: { msgId: "ach-022", version: 1, text: "Streak continues! All done again! 🔥", category: "achievement" },
    102: { msgId: "ach-023", version: 1, text: "Diamond tier reached! 💎", category: "achievement" },
    103: { msgId: "ach-024", version: 1, text: "Legendary status! All complete! 🌟", category: "achievement" },
    104: { msgId: "ach-025", version: 1, text: "Pinnacle achievement! 🗻", category: "achievement" },
    105: { msgId: "ach-026", version: 1, text: "Ultimate completion! 🎊", category: "achievement" },
    106: { msgId: "ach-027", version: 1, text: "Championship won! 🏆", category: "achievement" },
    107: { msgId: "ach-028", version: 1, text: "Perfect game! No misses! 🎲", category: "achievement" },
    108: { msgId: "ach-029", version: 1, text: "High score! New personal record! 📈", category: "achievement" },
    109: { msgId: "ach-030", version: 1, text: "MVP! Most Valuable Performer! 🌟", category: "achievement" },
    110: { msgId: "ach-031", version: 1, text: "Elite status achieved! 🎯", category: "achievement" },
    111: { msgId: "ach-032", version: 1, text: "Master level unlocked! 🔓", category: "achievement" },
    112: { msgId: "ach-033", version: 1, text: "Supreme achievement! 👔", category: "achievement" },
    113: { msgId: "ach-034", version: 1, text: "Completion certified! ✅", category: "achievement" },
    114: { msgId: "ach-035", version: 1, text: "Excellence achieved! 🌟", category: "achievement" },
    115: { msgId: "ach-036", version: 1, text: "Victory royale! 👑", category: "achievement" },
    116: { msgId: "ach-037", version: 1, text: "Perfection attained! ✨", category: "achievement" },
    117: { msgId: "ach-038", version: 1, text: "Mastery demonstrated! 🎓", category: "achievement" },
    118: { msgId: "ach-039", version: 1, text: "Ultimate win! 🏅", category: "achievement" },
    119: { msgId: "ach-040", version: 1, text: "Grand achievement unlocked! 🎁", category: "achievement" },
    
    // Motivational (120-159)
    120: { msgId: "mot-001", version: 1, text: "Today's success is tomorrow's foundation! 🏗️", category: "motivational" },
    121: { msgId: "mot-002", version: 1, text: "You're building greatness, one task at a time! 🧱", category: "motivational" },
    122: { msgId: "mot-003", version: 1, text: "Consistency is key, and you have it! 🔑", category: "motivational" },
    123: { msgId: "mot-004", version: 1, text: "Your dedication is inspiring! Keep going! 🌅", category: "motivational" },
    124: { msgId: "mot-005", version: 1, text: "Excellence is a habit, and you're proving it! 💪", category: "motivational" },
    125: { msgId: "mot-006", version: 1, text: "Small wins lead to big victories! You're winning! 🎯", category: "motivational" },
    126: { msgId: "mot-007", version: 1, text: "Your commitment shines through! ✨", category: "motivational" },
    127: { msgId: "mot-008", version: 1, text: "Progress over perfection, and you're progressing! 📈", category: "motivational" },
    128: { msgId: "mot-009", version: 1, text: "You're writing your success story! 📖", category: "motivational" },
    129: { msgId: "mot-010", version: 1, text: "Discipline equals freedom, and you're free! 🦅", category: "motivational" },
    130: { msgId: "mot-011", version: 1, text: "Your future self thanks you! 🙏", category: "motivational" },
    131: { msgId: "mot-012", version: 1, text: "Every task completed is growth! 🌱", category: "motivational" },
    132: { msgId: "mot-013", version: 1, text: "You're investing in yourself! 💰", category: "motivational" },
    133: { msgId: "mot-014", version: 1, text: "Champions are made daily. You're one! 🏆", category: "motivational" },
    134: { msgId: "mot-015", version: 1, text: "Your persistence pays off! 💎", category: "motivational" },
    135: { msgId: "mot-016", version: 1, text: "Building momentum, building success! 🚀", category: "motivational" },
    136: { msgId: "mot-017", version: 1, text: "You're creating the life you want! 🎨", category: "motivational" },
    137: { msgId: "mot-018", version: 1, text: "Greatness is earned, and you're earning it! 👑", category: "motivational" },
    138: { msgId: "mot-019", version: 1, text: "Your work ethic is remarkable! ⚡", category: "motivational" },
    139: { msgId: "mot-020", version: 1, text: "You're proof that effort wins! 🥇", category: "motivational" },
    140: { msgId: "mot-021", version: 1, text: "Making it happen! Your way! 🛤️", category: "motivational" },
    141: { msgId: "mot-022", version: 1, text: "Success is a series of small wins. You're collecting them! 🎁", category: "motivational" },
    142: { msgId: "mot-023", version: 1, text: "Your determination is unmatched! 🔥", category: "motivational" },
    143: { msgId: "mot-024", version: 1, text: "Leading by example! Yourself! 🎖️", category: "motivational" },
    144: { msgId: "mot-025", version: 1, text: "You're raising your own bar! 📊", category: "motivational" },
    145: { msgId: "mot-026", version: 1, text: "Building better habits, building a better you! 🌟", category: "motivational" },
    146: { msgId: "mot-027", version: 1, text: "Your consistency creates compound results! 💪", category: "motivational" },
    147: { msgId: "mot-028", version: 1, text: "You're becoming unstoppable! 🚄", category: "motivational" },
    148: { msgId: "mot-029", version: 1, text: "Progress visible! Keep moving forward! 🏃", category: "motivational" },
    149: { msgId: "mot-030", version: 1, text: "You're mastering the art of execution! 🎭", category: "motivational" },
    150: { msgId: "mot-031", version: 1, text: "Your dedication speaks volumes! 📢", category: "motivational" },
    151: { msgId: "mot-032", version: 1, text: "Building your empire, task by task! 🏰", category: "motivational" },
    152: { msgId: "mot-033", version: 1, text: "You're cultivating excellence! 🌾", category: "motivational" },
    153: { msgId: "mot-034", version: 1, text: "Your focus is your superpower! ⚡", category: "motivational" },
    154: { msgId: "mot-035", version: 1, text: "Showing up daily = winning! You're here! 📅", category: "motivational" },
    155: { msgId: "mot-036", version: 1, text: "Your reliability is your strength! 💪", category: "motivational" },
    156: { msgId: "mot-037", version: 1, text: "You're engineering your success! 🔧", category: "motivational" },
    157: { msgId: "mot-038", version: 1, text: "Making the impossible routine! 🌈", category: "motivational" },
    158: { msgId: "mot-039", version: 1, text: "Your path, your pace, your success! 🛤️", category: "motivational" },
    159: { msgId: "mot-040", version: 1, text: "You're building momentum that can't be stopped! 🌊", category: "motivational" },
    
    // Quirky (160-199)
    160: { msgId: "qui-001", version: 1, text: "Shakshuka approves! All eggs in all baskets! 🍳", category: "quirky" },
    161: { msgId: "qui-002", version: 1, text: "Task fairy visited! Everything magically done! 🧚", category: "quirky" },
    162: { msgId: "qui-003", version: 1, text: "Your to-do list is having an existential crisis! 🤔", category: "quirky" },
    163: { msgId: "qui-004", version: 1, text: "The productivity gods smile upon you! 🗿", category: "quirky" },
    164: { msgId: "qui-005", version: 1, text: "Unicorn level: achieved! 🦄", category: "quirky" },
    165: { msgId: "qui-006", version: 1, text: "You've out-tasked the task-taskers! 🎩", category: "quirky" },
    166: { msgId: "qui-007", version: 1, text: "Breaking: Tasks declare you their new overlord! 👾", category: "quirky" },
    167: { msgId: "qui-008", version: 1, text: "Your productivity is making pandas jealous! 🐼", category: "quirky" },
    168: { msgId: "qui-009", version: 1, text: "Tasks completed faster than you can say 'procrastination'! 🎤", category: "quirky" },
    169: { msgId: "qui-010", version: 1, text: "You've summoned the completion dragon! 🐉", category: "quirky" },
    170: { msgId: "qui-011", version: 1, text: "Productivity wizard! Tasks vanished! *poof* 🪄", category: "quirky" },
    171: { msgId: "qui-012", version: 1, text: "Your task list just rage-quit! 😤", category: "quirky" },
    172: { msgId: "qui-013", version: 1, text: "Achievement unlocked: Actually Adulting! 🎓", category: "quirky" },
    173: { msgId: "qui-014", version: 1, text: "You've reached legendary status in task realm! 🗡️", category: "quirky" },
    174: { msgId: "qui-015", version: 1, text: "Tasks tried to form a union, but you were quicker! 🏭", category: "quirky" },
    175: { msgId: "qui-016", version: 1, text: "Your focus is sharper than a samurai's katana! ⚔️", category: "quirky" },
    176: { msgId: "qui-017", version: 1, text: "You've convinced tasks they wanted to be completed! 🎭", category: "quirky" },
    177: { msgId: "qui-018", version: 1, text: "Time to add 'Task Destroyer' to your resume! 📝", category: "quirky" },
    178: { msgId: "qui-019", version: 1, text: "Your productivity aura is glowing! 🌟", category: "quirky" },
    179: { msgId: "qui-020", version: 1, text: "You've achieved inbox zero's cooler sibling! 📬", category: "quirky" },
    180: { msgId: "qui-021", version: 1, text: "Task completion rate: MAXIMUM OVERDRIVE! 🚗", category: "quirky" },
    181: { msgId: "qui-022", version: 1, text: "You're more organized than a Swiss watchmaker! ⌚", category: "quirky" },
    182: { msgId: "qui-023", version: 1, text: "Your task list is filing for early retirement! 👴", category: "quirky" },
    183: { msgId: "qui-024", version: 1, text: "You've unlocked the secret boss: Productivity Master! 🎮", category: "quirky" },
    184: { msgId: "qui-025", version: 1, text: "Tasks are writing you thank-you notes! 💌", category: "quirky" },
    185: { msgId: "qui-026", version: 1, text: "You've achieved what philosophers call 'peak task'! 🏔️", category: "quirky" },
    186: { msgId: "qui-027", version: 1, text: "Your efficiency is making robots self-conscious! 🤖", category: "quirky" },
    187: { msgId: "qui-028", version: 1, text: "Task list tried to escape to Mexico! Too slow! 🌮", category: "quirky" },
    188: { msgId: "qui-029", version: 1, text: "You've completed more tasks than a caffeinated beaver! 🦫", category: "quirky" },
    189: { msgId: "qui-030", version: 1, text: "Your to-do list is updating its LinkedIn status to 'Conquered'! 💼", category: "quirky" },
    190: { msgId: "qui-031", version: 1, text: "You're so efficient, you could organize chaos itself! 🌀", category: "quirky" },
    191: { msgId: "qui-032", version: 1, text: "Task ninjas tried to ambush you. You won! 🥷", category: "quirky" },
    192: { msgId: "qui-033", version: 1, text: "You've convinced your tasks they're already done! 🎪", category: "quirky" },
    193: { msgId: "qui-034", version: 1, text: "Your productivity deserves its own postal stamp! 📮", category: "quirky" },
    194: { msgId: "qui-035", version: 1, text: "Tasks are writing ballads about your legend! 🎵", category: "quirky" },
    195: { msgId: "qui-036", version: 1, text: "You've speedrun reality itself! 🏎️", category: "quirky" },
    196: { msgId: "qui-037", version: 1, text: "Your task list just sent an SOS! Too late! 🆘", category: "quirky" },
    197: { msgId: "qui-038", version: 1, text: "You're more dependable than gravity! 🌍", category: "quirky" },
    198: { msgId: "qui-039", version: 1, text: "Your efficiency is causing temporal anomalies! ⏰", category: "quirky" },
    199: { msgId: "qui-040", version: 1, text: "You've achieved what scientists call 'absolute taskiness'! 🔬", category: "quirky" },
  };
  
  return messages[index] || messages[0];
}

// Get a random unused message - only loads ONE message at a time
export function getRandomCompletionMessage(usedMessageIds: string[]): CompletionMessage {
  if (typeof window === "undefined") return generateMessageByIndex(0);
  
  // Create array of unused indices
  const usedIndices = new Set(
    usedMessageIds.map(id => {
      const match = id.match(/-(\d+)$/);
      if (!match) return -1;
      const num = parseInt(match[1]);
      // Map msgId to index based on category prefix
      if (id.startsWith("enc-")) return num - 1;
      if (id.startsWith("hum-")) return 39 + num;
      if (id.startsWith("ach-")) return 79 + num;
      if (id.startsWith("mot-")) return 119 + num;
      if (id.startsWith("qui-")) return 159 + num;
      return -1;
    }).filter(i => i >= 0)
  );
  
  const unusedIndices = Array.from({ length: TOTAL_MESSAGES }, (_, i) => i)
    .filter(i => !usedIndices.has(i));
  
  // If all used, reset and pick any
  if (unusedIndices.length === 0) {
    const randomIndex = Math.floor(Math.random() * TOTAL_MESSAGES);
    return generateMessageByIndex(randomIndex);
  }
  
  // Pick random unused index and generate ONLY that message
  const randomIndex = unusedIndices[Math.floor(Math.random() * unusedIndices.length)];
  return generateMessageByIndex(randomIndex);
}