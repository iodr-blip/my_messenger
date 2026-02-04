
export type AuthStep = 'welcome' | 'choice' | 'login' | 'register_creds' | 'register_username' | 'register_profile';

export enum AppTab {
  ALL = 'all',
  PRIVATE = 'private',
  GROUPS = 'groups',
  BOTS = 'bots'
}

export interface User {
  id: string;
  username: string;
  surname?: string;
  username_handle: string;
  phoneNumber?: string;
  email: string;
  bio: string;
  avatarUrl: string;
  online: boolean;
  lastSeen: number;
  verified?: boolean;
  createdAt?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isAi?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  edited?: boolean;
  audioUrl?: string;
  fileUrl?: string;
  videoUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyPreview?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: Record<string, string[]>; // emoji -> userIds
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'bot' | 'saved';
  name?: string;
  avatarUrl?: string;
  description?: string;
  ownerId?: string;
  inviteLink?: string;
  participants: User[];
  participantsUids?: string[];
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
    senderName?: string;
  };
  unreadCount?: number; // For the local user
  unreadCounts?: Record<string, number>; // Global unread map {userId: count}
  pinned?: boolean;
  archived?: boolean;
  pinnedMessageId?: string | null;
  historyVisible?: boolean;
}

export interface CallSession {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended' | 'declined';
  type: 'audio' | 'video';
  offer?: any;
  answer?: any;
  createdAt: number;
}
