
export type MessageStatus = 'sending' | 'sent' | 'read';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  audioUrl?: string;
  duration?: number;
  edited?: boolean;
  replyTo?: string;
  reactions?: Record<string, number>;
}

export interface User {
  id: string;
  username: string;
  username_handle: string;
  email?: string;
  avatarUrl?: string;
  online: boolean;
  lastSeen: number;
  bio?: string;
  isBot?: boolean;
}

export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  type: 'private' | 'group' | 'bot' | 'saved';
  pinned?: boolean;
  archived?: boolean;
}

export enum AppTab {
  ALL = 'all',
  PRIVATE = 'private',
  GROUPS = 'groups',
  BOTS = 'bots'
}

export type AuthStep = 'welcome' | 'email' | 'code' | 'profile' | 'completed';
