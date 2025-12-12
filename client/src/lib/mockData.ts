export type Category = "Funny" | "Serious" | "Wordplay" | "Storytelling" | "Battle" | "Freestyle";

export interface User {
  id: string;
  username: string;
  avatar: string;
  verified?: boolean;
}

export interface Bar {
  id: string;
  content: string;
  explanation?: string; // For entendres
  author: User;
  category: Category;
  likes: number;
  comments: number;
  timestamp: string;
  tags: string[];
}

export const CURRENT_USER: User = {
  id: "u1",
  username: "SpitFire_99",
  avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&h=400&fit=crop",
  verified: true
};

export const MOCK_BARS: Bar[] = [
  {
    id: "1",
    content: "I move in silence like the 'g' in lasagna, \nreal Gs move in silence like lasagna.",
    explanation: "Classic line referencing the silent 'g' in the word lasagna and how real gangsters (Gs) operate quietly.",
    author: {
      id: "u2",
      username: "WeezyFan",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop"
    },
    category: "Wordplay",
    likes: 1240,
    comments: 45,
    timestamp: "2h ago",
    tags: ["classic", "lilwayne", "simile"]
  },
  {
    id: "2",
    content: "My flow is sick, I need a doctor... actually bring a priest, cause I'm killing this beat.",
    author: {
      id: "u3",
      username: "LyricGenius",
      avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop"
    },
    category: "Battle",
    likes: 89,
    comments: 12,
    timestamp: "4h ago",
    tags: ["aggressive", "punchline"]
  },
  {
    id: "3",
    content: "Empty pockets but my mind is full of gold, \nStories untold in the city so cold.",
    author: {
      id: "u4",
      username: "StreetPoet",
      avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop"
    },
    category: "Serious",
    likes: 456,
    comments: 34,
    timestamp: "1d ago",
    tags: ["life", "struggle", "poetry"]
  },
  {
    id: "4",
    content: "They say money talks, but mine just says 'Goodbye'",
    author: {
      id: "u5",
      username: "BrokeRapper",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"
    },
    category: "Funny",
    likes: 2300,
    comments: 120,
    timestamp: "1d ago",
    tags: ["relatable", "humor"]
  },
  {
    id: "5",
    content: "I'm the king of the castle, you're the dirty rascal. \nWait, that's a nursery rhyme... still hard though.",
    author: {
      id: "u2",
      username: "WeezyFan",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop"
    },
    category: "Funny",
    likes: 45,
    comments: 2,
    timestamp: "2d ago",
    tags: ["fail", "joke"]
  }
];

export const CATEGORIES: Category[] = ["Funny", "Serious", "Wordplay", "Storytelling", "Battle", "Freestyle"];
