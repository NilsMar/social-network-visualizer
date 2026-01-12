// Initial sample data for the social network
// Groups: me, family, work, friends, acquaintances

export const initialNodes = [
  // You at the center
  { id: 'me', name: 'Me', group: 'me', details: 'The center of my social universe' },
  
  // Family
  { id: 'mom', name: 'Mom', group: 'family', details: 'Always supportive, calls every Sunday' },
  { id: 'dad', name: 'Dad', group: 'family', details: 'Wise advice, loves hiking' },
  { id: 'sister', name: 'Sarah', group: 'family', details: 'Younger sister, lives in Berlin' },
  { id: 'brother', name: 'Max', group: 'family', details: 'Older brother, software engineer' },
  
  // Work
  { id: 'boss', name: 'Thomas', group: 'work', details: 'Team lead, very organized' },
  { id: 'colleague1', name: 'Anna', group: 'work', details: 'Desk neighbor, coffee buddy' },
  { id: 'colleague2', name: 'Michael', group: 'work', details: 'Backend developer, chess enthusiast' },
  { id: 'colleague3', name: 'Lisa', group: 'work', details: 'Designer, great at presentations' },
  
  // Friends
  { id: 'bestfriend', name: 'Chris', group: 'friends', details: 'Best friend since university, knows everything' },
  { id: 'friend1', name: 'Julia', group: 'friends', details: 'Met at yoga class, very positive energy' },
  { id: 'friend2', name: 'David', group: 'friends', details: 'Gaming buddy, works in finance' },
  { id: 'friend3', name: 'Emma', group: 'friends', details: 'Book club friend, recommends great reads' },
  
  // Acquaintances
  { id: 'neighbor', name: 'Mr. Schmidt', group: 'acquaintances', details: 'Friendly neighbor, waters plants when away' },
  { id: 'gym', name: 'Fitness Tom', group: 'acquaintances', details: 'See at the gym, good workout tips' },
];

export const initialLinks = [
  // Family connections (strong ties)
  { source: 'me', target: 'mom', strength: 9 },
  { source: 'me', target: 'dad', strength: 8 },
  { source: 'me', target: 'sister', strength: 8 },
  { source: 'me', target: 'brother', strength: 7 },
  { source: 'mom', target: 'dad', strength: 10 },
  { source: 'sister', target: 'brother', strength: 6 },
  { source: 'mom', target: 'sister', strength: 8 },
  { source: 'mom', target: 'brother', strength: 8 },
  { source: 'dad', target: 'sister', strength: 7 },
  { source: 'dad', target: 'brother', strength: 7 },
  
  // Work connections (moderate ties)
  { source: 'me', target: 'boss', strength: 5 },
  { source: 'me', target: 'colleague1', strength: 6 },
  { source: 'me', target: 'colleague2', strength: 5 },
  { source: 'me', target: 'colleague3', strength: 4 },
  { source: 'boss', target: 'colleague1', strength: 4 },
  { source: 'boss', target: 'colleague2', strength: 4 },
  { source: 'boss', target: 'colleague3', strength: 4 },
  { source: 'colleague1', target: 'colleague2', strength: 5 },
  { source: 'colleague1', target: 'colleague3', strength: 6 },
  
  // Friend connections (strong ties)
  { source: 'me', target: 'bestfriend', strength: 10 },
  { source: 'me', target: 'friend1', strength: 6 },
  { source: 'me', target: 'friend2', strength: 7 },
  { source: 'me', target: 'friend3', strength: 5 },
  { source: 'bestfriend', target: 'friend2', strength: 4 },
  { source: 'friend1', target: 'friend3', strength: 3 },
  
  // Acquaintance connections (weak ties)
  { source: 'me', target: 'neighbor', strength: 2 },
  { source: 'me', target: 'gym', strength: 2 },
  
  // Cross-group connections (these create bridge nodes)
  { source: 'brother', target: 'colleague2', strength: 3 }, // Brother knows a colleague
  { source: 'bestfriend', target: 'sister', strength: 4 }, // Best friend met sister
];

// Muted, sophisticated color palette - default groups
export const defaultGroupColors = {
  me: '#e07a3a',        // Muted warm orange
  family: '#c9577a',    // Dusty rose
  work: '#3a9ba5',      // Muted teal
  friends: '#7c6bb8',   // Muted violet
  acquaintances: '#7a8694', // Cool slate
};

export const defaultGroupLabels = {
  me: 'Me',
  family: 'Family',
  work: 'Work',
  friends: 'Friends',
  acquaintances: 'Acquaintances',
};

// Available colors for new categories
export const availableColors = [
  '#e07a3a', // Warm orange
  '#c9577a', // Dusty rose
  '#3a9ba5', // Muted teal
  '#7c6bb8', // Muted violet
  '#7a8694', // Cool slate
  '#5a9a6b', // Forest green
  '#d4a656', // Goldenrod
  '#8b5a8b', // Plum
  '#5a8b8b', // Dark cyan
  '#cd6839', // Terracotta
  '#708090', // Slate gray
  '#9370db', // Medium purple
];

// For backwards compatibility, export groupColors and groupLabels as defaults
// These will be overridden by user's custom groups stored in the database
export const groupColors = { ...defaultGroupColors };
export const groupLabels = { ...defaultGroupLabels };
