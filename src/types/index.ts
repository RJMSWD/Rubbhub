export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  likedBy: string[];
  replyTo?: string | null;
  replies: Comment[];
}

export interface MediaContent {
  type: 'image' | 'video';
  items: string[];
}

export interface Entry {
  id: string;
  title: string;
  author: string;
  timestamp: string;
  visibility: 'public' | 'private';
  domain: string;
  major: string;
  wasteType: 'recyclable' | 'unrecyclable';
  wasteSubType?: string;
  cause: string;
  content: string;
  media: MediaContent | null;
  sympathy: number;
  likedBy: string[];
  tags: string[];
  views: number;
  comments: Comment[];
}

export interface NewEntryState {
  title: string;
  domain: string;
  major: string;
  wasteType: 'recyclable' | 'unrecyclable';
  wasteSubType: string;
  cause: string;
  content: string;
  visibility: 'public' | 'private';
  media: MediaContent | null;
  tags: string;
}
