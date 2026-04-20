"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getActiveSupabaseClient, supabaseDG, supabaseStaff } from '../../lib/supabase';
import {
  Search,
  Loader2,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  Paperclip,
  Reply,
  Trash2,
  Phone,
  Video,
  PhoneOff,
  Smile,
  X,
  Mic,
  MicOff,
  VideoOff,
  History,
  Download,
  Star,
  Pin,
  Users,
  Bell,
  BellRing,
  Languages,
  AtSign,
  Archive,
  MoreVertical,
  Camera,
  Plus,
  ChevronLeft,
  Info,
  Image as ImageIcon,
  Link as LinkIcon,
  Copy,
  Pencil,
  CheckSquare,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string | number;
  content: string;
  sender_name: string;
  sender_role?: string;
  channel?: string;
  status?: string;
  message_type?: string;
  attachment_url?: string;
  attachment_name?: string;
  reply_to_id?: string | number;
  reactions?: Record<string, string> | string | null;
  context_type?: string;
  context_id?: string;
  context_label?: string;
  priority?: 'low' | 'high';
  mentions?: string[] | string | null;
  translated_content?: Record<string, string> | string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  edited_at?: string | null;
  pinned?: boolean;
  important?: boolean;
  view_once?: boolean;
  played_once_by?: Record<string, boolean> | string | null;
  created_at: string;
  deleted_at?: string | null;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ConversationItem extends Channel {
  avatarLabel: string;
  avatarSrc: string;
  unread: number;
  isFavorite: boolean;
  isGroup: boolean;
  lastMessage: Message | null;
}

interface ChatUserProfile {
  user_id?: string;
  user_email?: string;
  user_name: string;
  display_name?: string;
  profile_picture_url?: string;
  avatar_url?: string;
  updated_at?: string;
}

interface SendPayload {
  content: string;
  sender_name: string;
  sender_role?: string;
  channel?: string;
  status: string;
  message_type?: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  reply_to_id?: string | null;
  view_once?: boolean;
  context_type?: string;
  context_id?: string | null;
  context_label?: string | null;
  priority?: 'low' | 'high';
  mentions?: string[];
  translated_content?: Record<string, string>;
}

interface BusinessContext {
  id: string;
  type: 'general' | 'athlete' | 'recruitment' | 'document' | 'match' | 'admin';
  label: string;
}

interface ChatPresence {
  id?: string;
  user_name: string;
  channel: string;
  is_online: boolean;
  is_typing?: boolean;
  is_recording?: boolean;
  last_seen: string;
}

interface StoryItem {
  id: string;
  type: 'text' | 'image';
  content?: string;
  url?: string;
  bg_color?: string;
  privacy?: 'all' | 'only' | 'exclude';
  allowed_keys?: string[];
  excluded_keys?: string[];
  views?: StoryViewEntry[];
  reactions?: StoryReactionEntry[];
  comments?: StoryCommentEntry[];
  owner_key?: string;
  created_at: string;
}

interface UserStory {
  owner_key?: string;
  channel_id: string;
  channel_name: string;
  avatar_url: string;
  items: StoryItem[];
  has_unviewed: boolean;
}

interface StoryViewEntry {
  viewer_key: string;
  viewer_name: string;
  viewed_at: string;
}

interface StoryReactionEntry {
  user_key: string;
  user_name: string;
  emoji: string;
  created_at: string;
}

interface StoryCommentEntry {
  id: string;
  user_key: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface PersistedStoryRecord {
  id: string;
  owner_key: string;
  owner_name: string;
  avatar_url: string;
  type: 'text' | 'image';
  content?: string;
  url?: string;
  bg_color?: string;
  privacy: 'all' | 'only' | 'exclude';
  allowed_keys: string[];
  excluded_keys: string[];
  views: StoryViewEntry[];
  reactions: StoryReactionEntry[];
  comments: StoryCommentEntry[];
  created_at: string;
  expires_at: string;
}

interface StoryRow {
  id: string;
  owner_key: string;
  owner_name: string;
  avatar_url?: string | null;
  type: 'text' | 'image';
  content?: string | null;
  url?: string | null;
  bg_color?: string | null;
  privacy?: 'all' | 'only' | 'exclude' | null;
  allowed_keys?: string[] | null;
  excluded_keys?: string[] | null;
  created_at: string;
  expires_at: string;
}

interface StoryViewRow {
  story_id: string;
  viewer_key: string;
  viewer_name: string;
  viewed_at: string;
}

const STORY_BG_COLORS = [
  'linear-gradient(135deg,#1a6b4a,#25d366)',
  'linear-gradient(135deg,#1a4080,#53bdeb)',
  'linear-gradient(135deg,#6b1a6b,#d366c7)',
  'linear-gradient(135deg,#806b1a,#ebc953)',
  'linear-gradient(135deg,#6b1a1a,#eb5353)',
  'linear-gradient(135deg,#1a5f6b,#53ebd5)',
];

const STORY_EXPIRY_MS = 24 * 60 * 60 * 1000;
const STORY_LS_FALLBACK_KEY = 'agta_story_records_fallback_v1';

interface MessageNotification {
  id: string;
  message_id?: string;
  channel?: string;
  recipient: string;
  notification_type: 'mention' | 'priority' | 'reminder';
  title?: string;
  body?: string;
  is_read?: boolean;
  created_at: string;
}

interface MessageActionItem {
  id: string;
  message_id?: string;
  channel?: string;
  action_type: 'task' | 'reminder' | 'calendar';
  title: string;
  notes?: string;
  due_at?: string;
  status?: 'open' | 'done';
  created_by?: string;
  created_at: string;
}

interface OfflineInsertItem {
  id: string;
  table: string;
  row: Record<string, any>;
  attempts: number;
  created_at: string;
}

interface CallHistoryItem {
  id: string | number;
  channel?: string;
  from_user: string;
  to_user?: string;
  call_type: CallType;
  status: 'missed' | 'rejected' | 'completed' | 'cancelled';
  duration_seconds?: number;
  created_at: string;
}

type CallType = 'audio' | 'video';

type CallState = 'idle' | 'calling' | 'incoming' | 'in-call';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const DELETE_FOR_ALL_WINDOW_MS = 15 * 60 * 1000;
const LONG_PRESS_MS = 450;
const READ_BUCKET_CANDIDATES = ['athlete-files', 'agta-files'];
const WRITE_BUCKET_CANDIDATES = ['agta-files', 'athlete-files'];
const SEARCH_DEBOUNCE_MS = 280;
const POLL_INTERVAL_ACTIVE_MS = 8000;
const POLL_INTERVAL_HIDDEN_MS = 20000;
const REALTIME_STALE_MS = 18000;
const CALL_SIGNAL_TTL_MS = 2 * 60 * 1000;

interface MessagesViewProps {
  currentUserName?: string;
  defaultChannel?: string;
  defaultPeerUser?: string;
}

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤫', '🤥', '😏', '😒', '🙄', '😬', '🤐', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤮', '🤧', '🤬', '🤡', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
  '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🖤', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '👊', '👏', '🙌', '👐', '🫲', '🫳', '🤲', '🤝', '🤜', '🤛',
  '⚽', '🔥', '✅', '🎯', '🚀', '💼', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '⭐', '✨', '🌟', '💫', '⚡', '📌', '📍', '❗', '❓', '❕', '❔', '⁉️', '🔔', '🔕', '📢', '📣', '📯', '💬', '💭', '🗨️', '🗯️', '💤', '👁️‍🗨️',
  '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🎷', '🎺', '🎸', '🥁', '🎻', '🎲', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸',
  '🌍', '🌎', '🌏', '🌐', '🗺️', '🗿', '⛰️', '🏔️', '🌋', '⛰️', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋',
  '💍', '💎', '👑', '⚜️', '🎖️', '🏺', '⚱️', '🔮', '📿', '💈', '⚗️', '⚙️', '⚒️', '🛠️', '🔩', '⛓️', '🔫', '💣', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿',
  '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🍟', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫',
  '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥠', '🥮', '🍡', '🥟', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍻', '🥃'
];

const STICKERS = [
  { name: 'GOAL', icon: '⚽' },
  { name: 'APPROVED', icon: '✅' },
  { name: 'URGENT', icon: '🚨' },
  { name: 'TOP', icon: '🔥' },
  { name: 'READY', icon: '🚀' },
  { name: 'GOOD JOB', icon: '👏' },
  { name: 'PERFECT', icon: '💯' },
  { name: 'PARTY', icon: '🎉' },
  { name: 'LOVE', icon: '❤️' },
  { name: 'HEART EYES', icon: '😍' },
  { name: 'THUMBS UP', icon: '👍' },
  { name: 'CLAP', icon: '👏' },
  { name: 'ROCKET', icon: '🚀' },
  { name: 'TROPHY', icon: '🏆' },
  { name: 'STAR', icon: '⭐' },
  { name: 'FIRE', icon: '🔥' },
  { name: 'BOMB', icon: '💣' },
  { name: 'COOL', icon: '😎' },
  { name: 'SAD', icon: '😢' },
  { name: 'LAUGH', icon: '😂' },
  { name: 'WINK', icon: '😉' },
  { name: 'KISS', icon: '😘' },
  { name: 'SMILE', icon: '😊' },
  { name: 'SUNGLASSES', icon: '😎' },
  { name: 'PARTY FACE', icon: '🥳' },
  { name: 'THINKING', icon: '🤔' },
  { name: 'PRAY', icon: '🙏' },
  { name: 'HANDSHAKE', icon: '🤝' },
];

const DEFAULT_CONTEXTS: BusinessContext[] = [
  { id: 'general:ops', type: 'general', label: 'Operations Generales' },
  { id: 'athlete:prospect-001', type: 'athlete', label: 'Athlete: Prospect 001' },
  { id: 'recruitment:window-current', type: 'recruitment', label: 'Recrutement: Fenetre en cours' },
  { id: 'document:medical-pack', type: 'document', label: 'Documents: Pack medical' },
  { id: 'match:next-fixture', type: 'match', label: 'Match: Prochaine rencontre' },
  { id: 'admin:board', type: 'admin', label: 'Admin: Direction Generale' },
];

const TRANSLATION_LANGS = [
  { code: 'fr', label: 'Francais' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' },
  { code: 'ln', label: 'Lingala' },
] as const;

const LINGALA_FALLBACK: Record<string, string> = {
  'bonjour': 'mbote',
  'salut': 'mbote',
  'merci': 'matondi',
  'oui': 'ee',
  'non': 'te',
  'urgent': 'nokinoki',
  'rendez-vous': 'bokutani',
  'message recu': 'nasimbi nsango',
};

const TRANSLATION_PROVIDER = (import.meta.env.VITE_TRANSLATION_PROVIDER || 'mymemory').toLowerCase();
const TRANSLATION_API_URL = import.meta.env.VITE_TRANSLATION_API_URL || '';
const TRANSLATION_API_KEY = import.meta.env.VITE_TRANSLATION_API_KEY || '';
const TRANSLATION_DAILY_QUOTA = Number(import.meta.env.VITE_TRANSLATION_DAILY_QUOTA || 400);
const TRANSLATION_TIMEOUT_MS = Number(import.meta.env.VITE_TRANSLATION_TIMEOUT_MS || 9000);
const TRANSLATION_RETRY_LIMIT = Number(import.meta.env.VITE_TRANSLATION_RETRY_LIMIT || 3);
const BOT_PROVIDER = (import.meta.env.VITE_BOT_PROVIDER || 'local').toLowerCase();
const BOT_PROXY_FUNCTION = import.meta.env.VITE_BOT_PROXY_FUNCTION || 'gemini-proxy';
const BOT_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const BOT_GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const BOT_GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
const BOT_TIMEOUT_MS = Number(import.meta.env.VITE_BOT_TIMEOUT_MS || 12000);
const BOT_TEMPERATURE = Number(import.meta.env.VITE_BOT_TEMPERATURE || 0.4);
const BOT_RETRY_LIMIT = Number(import.meta.env.VITE_BOT_RETRY_LIMIT || 1);
const BOT_MAX_OUTPUT_TOKENS = Number(import.meta.env.VITE_BOT_MAX_OUTPUT_TOKENS || 280);
const DG_EMAIL = 'kbgmathieu@gmail.com';
const STAFF_EMAIL = 'agta.management@gmail.com';

const AVATAR_THEMES: Record<string, { start: string; end: string; accent: string; emblem: string }> = {
  'Direction Générale': { start: '#7f5af0', end: '#2cb67d', accent: '#fffffe', emblem: 'DG' },
  'STAFF SECRETARY': { start: '#1f6feb', end: '#27c93f', accent: '#ffffff', emblem: 'SS' },
  'Cellule Recrutement': { start: '#ff8906', end: '#f25f4c', accent: '#ffffff', emblem: 'CR' },
  'Staff AGTA': { start: '#005c4b', end: '#25d366', accent: '#d7fdd3', emblem: 'AG' },
  'Recruteurs': { start: '#ef4565', end: '#7f5af0', accent: '#ffffff', emblem: 'RC' },
  'AGTA BOT': { start: '#0f172a', end: '#334155', accent: '#7dd3fc', emblem: 'AI' },
};

const escapeSvg = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const createAvatarDataUrl = (label: string, theme?: { start: string; end: string; accent: string; emblem: string }) => {
  const safeTheme = theme || { start: '#1f2937', end: '#4b5563', accent: '#ffffff', emblem: label.slice(0, 2).toUpperCase() };
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
          <stop stop-color="${safeTheme.start}"/>
          <stop offset="1" stop-color="${safeTheme.end}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#g)"/>
      <circle cx="48" cy="48" r="34" fill="rgba(255,255,255,0.08)"/>
      <circle cx="72" cy="24" r="10" fill="${safeTheme.accent}" fill-opacity="0.18"/>
      <path d="M24 60c10-16 38-16 48 0" stroke="${safeTheme.accent}" stroke-width="6" stroke-linecap="round" opacity="0.3"/>
      <text x="48" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${safeTheme.accent}">${escapeSvg(safeTheme.emblem)}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export default function MessagesView({
  currentUserName = 'STAFF SECRETARY',
  defaultChannel = 'Direction Générale',
  defaultPeerUser,
}: MessagesViewProps) {
  const supabase = getActiveSupabaseClient();
  const currentUser = currentUserName;
  const defaultPeer = defaultPeerUser || defaultChannel;

  const normalizeUserKey = useCallback((value?: string | null) => {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }, []);

  const canonicalAvatarLabel = useCallback((rawName?: string | null) => {
    const normalized = normalizeUserKey(rawName);
    if (!normalized) return '';

    if (['direction generale', 'directeur general', 'dg', 'direction générale'].includes(normalized)) {
      return 'Direction Générale';
    }
    if (['staff secretary', 'staff secretaire', 'secretariat agta', 'agta management'].includes(normalized)) {
      return 'STAFF SECRETARY';
    }
    if (['cellule recrutement', 'recrutement'].includes(normalized)) {
      return 'Cellule Recrutement';
    }
    if (['staff agta', 'equipe interne'].includes(normalized)) {
      return 'Staff AGTA';
    }
    if (['recruteurs', 'clubs agents', 'clubs & agents'].includes(normalized)) {
      return 'Recruteurs';
    }
    if (['agta bot', 'bot'].includes(normalized)) {
      return 'AGTA BOT';
    }
    return rawName || '';
  }, [normalizeUserKey]);

  const withAvatarVersion = useCallback((url?: string | null, version?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    try {
      const parsed = new URL(url);
      if (version) parsed.searchParams.set('v', version);
      return parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return version ? `${url}${separator}v=${encodeURIComponent(version)}` : url;
    }
  }, []);

  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [draftsByChannel, setDraftsByChannel] = useState<Record<string, string>>({});
  const [channelSearch, setChannelSearch] = useState('');
  const [conversationFilter, setConversationFilter] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [messageSearchInput, setMessageSearchInput] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [searchSender, setSearchSender] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchDate, setSearchDate] = useState('');
  const [searchOnlyAttachments, setSearchOnlyAttachments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserProfileName, setCurrentUserProfileName] = useState('');
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState('');
  const [chatProfilesByName, setChatProfilesByName] = useState<Record<string, ChatUserProfile>>({});
  const [callClientId, setCallClientId] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState('');
  const [attachmentTargetChannel, setAttachmentTargetChannel] = useState('');
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showChannelsMobile, setShowChannelsMobile] = useState(false);
  const [showInfoPanelMobile, setShowInfoPanelMobile] = useState(false);
  const [showInfoPanelDesktop, setShowInfoPanelDesktop] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Array<string | number>>([]);
  const [audioRates, setAudioRates] = useState<Record<string, number>>({});
  const [viewOncePlayedMap, setViewOncePlayedMap] = useState<Record<string, boolean>>({});
  const [voiceError, setVoiceError] = useState('');
  const [priority, setPriority] = useState<'low' | 'high'>('low');
  const [selectedContextId, setSelectedContextId] = useState<string>(DEFAULT_CONTEXTS[0].id);
  const [customContextLabel, setCustomContextLabel] = useState('');
  const [translationTarget, setTranslationTarget] = useState<'fr' | 'en' | 'es' | 'ln'>('fr');
  const [liveTranslationMap, setLiveTranslationMap] = useState<Record<string, string>>({});
  const [, setNotifications] = useState<MessageNotification[]>([]);
  const [actionsTimeline, setActionsTimeline] = useState<MessageActionItem[]>([]);
  const [presenceByUser, setPresenceByUser] = useState<Record<string, ChatPresence>>({});
  const [botEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('agta_push_enabled') === '1';
  });

  useEffect(() => {
    if (!attachedFile || !attachedFile.type.startsWith('image/')) {
      setAttachedImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(attachedFile);
    setAttachedImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attachedFile]);

  const [actionMenu, setActionMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ open: false, x: 0, y: 0, message: null });

  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [incomingFrom, setIncomingFrom] = useState<string>('');
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [callError, setCallError] = useState('');
  const [showAllCallsModal, setShowAllCallsModal] = useState(false);
  const [allCalls, setAllCalls] = useState<CallHistoryItem[]>([]);
  const [conversationContextMenu, setConversationContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    channel: ConversationItem | null;
  }>({ open: false, x: 0, y: 0, channel: null });
  const [muteSubmenuOpen, setMuteSubmenuOpen] = useState(false);
  const [channelMutedUntil, setChannelMutedUntil] = useState<Record<string, number>>({});
  const [channelArchived, setChannelArchived] = useState<Record<string, boolean>>({});
  const [channelPinned, setChannelPinned] = useState<Record<string, boolean>>({});
  const [channelBlocked, setChannelBlocked] = useState<Record<string, boolean>>({});
  const [showContactProfile, setShowContactProfile] = useState(false);
  const [selectedContactForProfile, setSelectedContactForProfile] = useState<ConversationItem | null>(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Profile status (statut texte permanent)
  const [myProfileStatus, setMyProfileStatus] = useState('Disponible');
  const [editingProfileStatus, setEditingProfileStatus] = useState(false);
  const [newProfileStatusText, setNewProfileStatusText] = useState('Disponible');

  // Stories (statut 24h)
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStory, setActiveStory] = useState<UserStory | null>(null);
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState(0);
  const [storyProgressKey, setStoryProgressKey] = useState(0);
  const [storyRecords, setStoryRecords] = useState<PersistedStoryRecord[]>([]);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyDraftText, setStoryDraftText] = useState('');
  const [storyDraftImage, setStoryDraftImage] = useState('');
  const [storyDraftBg, setStoryDraftBg] = useState(STORY_BG_COLORS[0]);
  const [storyPrivacy, setStoryPrivacy] = useState<'all' | 'only' | 'exclude'>('all');
  const [storyAudienceKeys, setStoryAudienceKeys] = useState<string[]>([]);
  const [showStoryViewers, setShowStoryViewers] = useState(false);
  const [storiesBackendAvailable, setStoriesBackendAvailable] = useState(true);

  // Typing indicator
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [peerIsRecording, setPeerIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const storyCameraInputRef = useRef<HTMLInputElement>(null);
  const storyGalleryInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const peerMapRef = useRef<Record<string, RTCPeerConnection>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const callStartedAtRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPublishedRef = useRef(false);
  const incomingTimeoutRef = useRef<number | null>(null);
  const outgoingTimeoutRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const lastRealtimeAtRef = useRef<number>(Date.now());
  const initialEmailRef = useRef<string>('');
  const currentUserIdRef = useRef<string>('');

  const isDGAccount = useMemo(() => {
    const email = normalizeUserKey(currentUserEmail);
    const propName = normalizeUserKey(currentUserName);
    const profileName = normalizeUserKey(currentUserProfileName);

    if (email === normalizeUserKey(DG_EMAIL)) return true;
    if (email === normalizeUserKey(STAFF_EMAIL)) return false;
    if (['direction generale', 'directeur general', 'dg'].includes(propName)) return true;
    if (['direction generale', 'directeur general', 'dg'].includes(profileName)) return true;
    return currentUser === 'Direction Générale';
  }, [currentUserEmail, currentUserName, currentUserProfileName, currentUser, normalizeUserKey]);

  const channels: Channel[] = isDGAccount
    ? [
        { id: 'Direction Générale', name: 'STAFF SECRETARY', description: 'Secrétariat AGTA', icon: 'S' },
        { id: 'Cellule Recrutement', name: 'Cellule Recrutement', description: 'Kinshasa - Terrain', icon: 'C' },
        { id: 'Staff AGTA', name: 'Staff AGTA', description: 'Équipe interne', icon: 'A' },
        { id: 'Recruteurs', name: 'Recruteurs', description: 'Clubs & Agents', icon: 'R' },
        { id: 'AGTA BOT', name: 'AGTA BOT', description: 'Assistant interne', icon: 'B' },
      ]
    : [
        { id: 'Direction Générale', name: 'Direction Générale', description: 'Canal Sécurisé - DG', icon: 'D' },
        { id: 'Cellule Recrutement', name: 'Cellule Recrutement', description: 'Kinshasa - Terrain', icon: 'C' },
        { id: 'Staff AGTA', name: 'Staff AGTA', description: 'Équipe interne', icon: 'S' },
        { id: 'Recruteurs', name: 'Recruteurs', description: 'Clubs & Agents', icon: 'R' },
        { id: 'AGTA BOT', name: 'AGTA BOT', description: 'Assistant interne', icon: 'B' },
      ];

  const isCurrentUserName = useCallback((name?: string | null) => {
    const candidate = normalizeUserKey(name);
    if (!candidate) return false;
    const emailLocal = normalizeUserKey((currentUserEmail || '').split('@')[0]);
    const baseCurrent = normalizeUserKey(currentUser);
    const profileName = normalizeUserKey(currentUserProfileName);
    return candidate === baseCurrent || candidate === profileName || (emailLocal && candidate === emailLocal);
  }, [normalizeUserKey, currentUser, currentUserProfileName, currentUserEmail]);

  const upsertChatProfileAlias = useCallback((next: Record<string, ChatUserProfile>, alias: string | undefined, profile: ChatUserProfile) => {
    const canonical = canonicalAvatarLabel(alias);
    if (!canonical) return;
    next[canonical] = profile;
  }, [canonicalAvatarLabel]);

  const fetchChatProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_user_profiles')
        .select('user_id, user_email, user_name, display_name, profile_picture_url, avatar_url, updated_at')
        .order('updated_at', { ascending: false });

      if (error || !data) return;

      const next: Record<string, ChatUserProfile> = {};
      (data as ChatUserProfile[]).forEach((profile) => {
        upsertChatProfileAlias(next, profile.user_name, profile);
        upsertChatProfileAlias(next, profile.display_name, profile);
        upsertChatProfileAlias(next, profile.user_email?.split('@')[0], profile);

        if (profile.user_email === DG_EMAIL) {
          upsertChatProfileAlias(next, 'Direction Générale', profile);
        }
        if (profile.user_email === STAFF_EMAIL) {
          upsertChatProfileAlias(next, 'STAFF SECRETARY', profile);
        }
      });

      setChatProfilesByName(next);
    } catch {
      // Ignore if the SQL migration has not been applied yet.
    }
  }, [upsertChatProfileAlias]);

  const resolveAvatarForName = useCallback((name: string, options?: { allowCurrentUserAvatar?: boolean }) => {
    const canonicalName = canonicalAvatarLabel(name);
    const profile = chatProfilesByName[canonicalName];
    const profileAvatarUrl = withAvatarVersion(profile?.profile_picture_url || profile?.avatar_url, profile?.updated_at || undefined);

    if (profileAvatarUrl) {
      return profileAvatarUrl;
    }

    if ((options?.allowCurrentUserAvatar ?? true) && currentUserAvatarUrl && isCurrentUserName(name)) {
      return withAvatarVersion(currentUserAvatarUrl, profile?.updated_at || undefined);
    }

    const theme = AVATAR_THEMES[canonicalName] || {
      start: '#0f3b46',
      end: '#1f6feb',
      accent: '#ffffff',
      emblem: canonicalName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    };
    return createAvatarDataUrl(canonicalName, theme);
  }, [chatProfilesByName, withAvatarVersion, currentUserAvatarUrl, isCurrentUserName, canonicalAvatarLabel]);

  const GROUP_CHANNEL_IDS = ['Cellule Recrutement', 'Staff AGTA', 'Recruteurs'];
  const GROUP_MEMBERS_BY_CHANNEL: Record<string, string[]> = {
    'Cellule Recrutement': ['Direction Générale', 'STAFF SECRETARY', 'Cellule Recrutement'],
    'Staff AGTA': ['Direction Générale', 'STAFF SECRETARY', 'Staff AGTA'],
    'Recruteurs': ['Direction Générale', 'STAFF SECRETARY', 'Recruteurs'],
  };

  const isGroupChannelId = useCallback((channelId?: string) => {
    if (!channelId) return false;
    return GROUP_CHANNEL_IDS.includes(channelId);
  }, []);

  const getPrivatePeerName = useCallback((channelId: string) => {
    if (channelId !== 'Direction Générale') return channelId;
    return isDGAccount ? 'STAFF SECRETARY' : 'Direction Générale';
  }, [isDGAccount]);

  const botPrivateChannelId = useMemo(() => {
    const userKey = normalizeUserKey(currentUserEmail || currentUser || 'local-user');
    return `AGTA BOT::${userKey}`;
  }, [normalizeUserKey, currentUserEmail, currentUser]);

  const toStorageChannelId = useCallback((channelId?: string) => {
    if (!channelId) return 'Direction Générale';
    if (channelId === 'AGTA BOT') return botPrivateChannelId;
    return channelId;
  }, [botPrivateChannelId]);

  const toDisplayChannelId = useCallback((channelId?: string) => {
    if (!channelId) return 'Direction Générale';
    if (channelId.startsWith('AGTA BOT::')) return 'AGTA BOT';
    return channelId;
  }, []);

  const selectedStorageChannelId = useMemo(
    () => toStorageChannelId(selectedChannel),
    [selectedChannel, toStorageChannelId]
  );

  const normalizeMessageForUi = useCallback((message: Message): Message => {
    const rawChannel = message.channel || 'Direction Générale';
    return {
      ...message,
      channel: toDisplayChannelId(rawChannel),
    };
  }, [toDisplayChannelId]);

  const getChannelDisplayName = useCallback((channel: Channel) => {
    if (channel.id === 'Direction Générale') return getPrivatePeerName(channel.id);
    return channel.name;
  }, [getPrivatePeerName]);

  const getChannelAvatarLabel = useCallback((channel: Channel) => {
    if (channel.id === 'Direction Générale') return getPrivatePeerName(channel.id);
    return channel.name;
  }, [getPrivatePeerName]);

  // WhatsApp-like behavior: chat list should not display your personal profile picture as a conversation avatar.
  const resolveConversationAvatar = useCallback((name: string) => {
    if (isCurrentUserName(name)) {
      const canonicalName = canonicalAvatarLabel(name);
      const theme = AVATAR_THEMES[canonicalName] || {
        start: '#0f3b46',
        end: '#1f6feb',
        accent: '#ffffff',
        emblem: canonicalName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      };
      return createAvatarDataUrl(canonicalName, theme);
    }
    return resolveAvatarForName(name, { allowCurrentUserAvatar: false });
  }, [isCurrentUserName, resolveAvatarForName, canonicalAvatarLabel]);

  const normalizeReactions = (input: Message['reactions']): Record<string, string> => {
    if (!input) return {};
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === 'object' && parsed ? parsed : {};
      } catch {
        return {};
      }
    }
    return input;
  };

  const groupedReactions = (message: Message): Record<string, number> => {
    const map = normalizeReactions(message.reactions);
    const counts: Record<string, number> = {};

    Object.values(map).forEach((emoji) => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });

    return counts;
  };

  const normalizePlayedOnce = (input: Message['played_once_by']): Record<string, boolean> => {
    if (!input) return {};
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === 'object' && parsed ? parsed : {};
      } catch {
        return {};
      }
    }
    return input;
  };

  const normalizeMentions = (input: Message['mentions']): string[] => {
    if (!input) return [];
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(input) ? input : [];
  };

  const normalizeTranslations = (input: Message['translated_content']): Record<string, string> => {
    if (!input) return {};
    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        return typeof parsed === 'object' && parsed ? parsed : {};
      } catch {
        return {};
      }
    }
    return input;
  };

  const extractMentions = (text: string) => {
    const matches = text.match(/@[\w.-]+(?:\s[\w.-]+)*/g) || [];
    return matches.map((m) => m.replace(/^@/, '').trim()).filter(Boolean);
  };

  const getSelectedContext = () => {
    if (selectedContextId === 'custom') {
      const custom = customContextLabel.trim();
      return {
        context_type: 'general',
        context_id: custom ? `custom:${custom.toLowerCase().replace(/\s+/g, '-')}` : 'custom:general',
        context_label: custom || 'Contexte personnalise',
      };
    }

    const found = DEFAULT_CONTEXTS.find((ctx) => ctx.id === selectedContextId) || DEFAULT_CONTEXTS[0];
    return {
      context_type: found.type,
      context_id: found.id,
      context_label: found.label,
    };
  };

  const shouldMatchSearchDate = (messageDate: string, selectedDate: string) => {
    if (!selectedDate) return true;
    const d = new Date(messageDate);
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}` === selectedDate;
  };

  const formatLastSeen = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return 'vu a l\'instant';
    if (ms < 3_600_000) return `vu il y a ${Math.floor(ms / 60_000)} min`;
    return `vu a ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const buildBotReply = (prompt: string, ctxLabel: string) => {
    const clean = prompt.replace(/\s+/g, ' ').trim();
    const lower = clean.toLowerCase();

    const choose = (items: string[]) => {
      const seed = Array.from(lower).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) || Date.now();
      return items[seed % items.length];
    };

    if (!clean) {
      return `Je suis AGTA BOT. Dis-moi ce que tu veux faire dans ${ctxLabel}: resumer, prioriser, preparer une tache, un rappel, ou un plan d'action.`;
    }

    if (/^(salut|bonjour|bonsoir|hello|yo)\b/.test(lower)) {
      return choose([
        `Salut, je suis pret. Tu veux qu'on travaille sur quoi dans ${ctxLabel} ?`,
        `Bonjour. Je suis la pour t'aider sur ${ctxLabel}. Donne-moi ton objectif en une phrase.`,
        `Salut. Envoie ta demande et je te propose un plan concret pour ${ctxLabel}.`,
      ]);
    }

    if (lower.includes('comment tu vas') || lower.includes('ca va')) {
      return `Je vais bien et je suis operationnel. Dis-moi ta priorite sur ${ctxLabel} et je te reponds point par point.`;
    }

    if (lower.includes('comment ca') || lower.includes('explique') || lower.includes('pourquoi')) {
      return `Voici le principe: j'analyse ton message, j'identifie l'intention, puis je propose des actions utilisables (tache, rappel, evenement) dans ${ctxLabel}. Si tu veux, donne-moi un cas precis et je te montre.`;
    }

    if (lower.includes('priorite') || lower.includes('urgent')) {
      return `Analyse priorite (${ctxLabel}): je classe en HIGH. Proposition immediate: 1) notifier les personnes concernees 2) creer un rappel a 30 min 3) suivre l'avancement jusqu'a cloture.`;
    }

    if (lower.includes('recrutement')) {
      return `Synthese recrutement (${ctxLabel}): 1) verifier les videos recentes 2) confirmer disponibilite et exigences du club 3) preparer un call de validation staff.`;
    }

    if (lower.includes('document') || lower.includes('dossier')) {
      return `Checklist documents (${ctxLabel}): contrat, piece d'identite, certificat medical, video highlight, validation administrative.`;
    }

    if (lower.includes('tache') || lower.includes('rappel') || lower.includes('event') || lower.includes('evenement')) {
      return `Parfait. Je peux structurer ca maintenant pour ${ctxLabel}: une tache avec responsable, un rappel avec echeance, et un evenement calendrier. Donne-moi juste la date et le responsable.`;
    }

    if (clean.endsWith('?') || lower.startsWith('qui ') || lower.startsWith('quoi ') || lower.startsWith('quand ') || lower.startsWith('ou ') || lower.startsWith('comment ')) {
      return `Bonne question. Pour ${ctxLabel}, voici une reponse rapide: ${clean}. Si tu veux, je peux te donner une version courte (3 lignes) ou detaillee (plan en etapes).`;
    }

    return `Bien recu pour ${ctxLabel}. Je comprends: "${clean}". Veux-tu que je transforme ca en plan d'action, en tache, ou en rappel ?`;
  };

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!pushEnabled || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;

    try {
      const notification = new Notification(title, {
        body,
        tag: `agta-${selectedChannel}`,
      });
      window.setTimeout(() => notification.close(), 8000);
    } catch {
      // Silently ignore browser notification errors.
    }
  }, [pushEnabled, selectedChannel]);

  const requestPushPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      setPushEnabled(true);
      localStorage.setItem('agta_push_enabled', '1');
    }
  }, []);

  const withRetries = async <T,>(factory: () => Promise<T>, retryLimit = TRANSLATION_RETRY_LIMIT) => {
    let lastError: any;
    const attempts = Math.max(1, retryLimit);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await factory();
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status || 0);
        const retryable = status === 429 || status >= 500 || status === 0;
        if (!retryable || attempt === attempts - 1) break;
        const waitMs = 350 * (attempt + 1) * (attempt + 1);
        await new Promise((resolve) => window.setTimeout(resolve, waitMs));
      }
    }
    throw lastError;
  };

  const OFFLINE_QUEUE_KEY = 'agta_offline_insert_queue_v1';

  const readOfflineQueue = (): OfflineInsertItem[] => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeOfflineQueue = (items: OfflineInsertItem[]) => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-500)));
  };

  const enqueueOfflineInsert = (table: string, row: Record<string, any>) => {
    const queue = readOfflineQueue();
    queue.push({
      id: crypto.randomUUID(),
      table,
      row,
      attempts: 0,
      created_at: new Date().toISOString(),
    });
    writeOfflineQueue(queue);
  };

  const flushOfflineInsertQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = readOfflineQueue();
    if (queue.length === 0) return;

    const rest: OfflineInsertItem[] = [];
    for (const item of queue) {
      try {
        const { error } = await supabase.from(item.table).insert([item.row]);
        if (error) throw error;
      } catch {
        const nextAttempts = item.attempts + 1;
        if (nextAttempts < 6) {
          rest.push({ ...item, attempts: nextAttempts });
        }
      }
    }
    writeOfflineQueue(rest);
  }, []);

  const insertWithOfflineRetry = async (table: string, row: Record<string, any>) => {
    if (!navigator.onLine) {
      enqueueOfflineInsert(table, row);
      return { queued: true };
    }

    try {
      const { error } = await supabase.from(table).insert([row]);
      if (error) throw error;
      return { queued: false };
    } catch (error: any) {
      const status = Number(error?.status || 0);
      const retryable = status === 0 || status === 408 || status === 429 || status >= 500;
      if (retryable) {
        enqueueOfflineInsert(table, row);
        return { queued: true };
      }
      throw error;
    }
  };

  const getQuotaState = () => {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'agta_translation_quota';
    const raw = localStorage.getItem(key);
    if (!raw) return { key, today, used: 0 };
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.day !== today) return { key, today, used: 0 };
      return { key, today, used: Number(parsed?.used || 0) };
    } catch {
      return { key, today, used: 0 };
    }
  };

  const consumeQuota = (characters: number) => {
    const state = getQuotaState();
    const nextUsed = state.used + characters;
    localStorage.setItem(state.key, JSON.stringify({ day: state.today, used: nextUsed }));
    return nextUsed <= TRANSLATION_DAILY_QUOTA;
  };

  const fetchJsonWithTimeout = async (url: string, options: RequestInit, timeoutMs = TRANSLATION_TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err: any = new Error(data?.message || `HTTP ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return data;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const generateBotReply = async (prompt: string, ctxLabel: string, channelId: string) => {
    const localFallback = buildBotReply(prompt, ctxLabel);

    if (!prompt.trim()) return localFallback;
    if (BOT_PROVIDER === 'gemini-proxy') {
      try {
        // Resolve the session token from whichever client is authenticated
        const getAccessToken = async (): Promise<string | null> => {
          const { data: dgData } = await supabaseDG.auth.getSession();
          if (dgData?.session?.access_token) return dgData.session.access_token;
          const { data: staffData } = await supabaseStaff.auth.getSession();
          if (staffData?.session?.access_token) return staffData.session.access_token;
          return null;
        };

        const result = await withRetries(async () => {
          const accessToken = await getAccessToken();
          const { data, error } = await supabase.functions.invoke(BOT_PROXY_FUNCTION, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            body: {
              prompt,
              ctxLabel,
              channelId,
              model: BOT_GEMINI_MODEL,
              temperature: Number.isFinite(BOT_TEMPERATURE) ? BOT_TEMPERATURE : 0.4,
              maxOutputTokens: Number.isFinite(BOT_MAX_OUTPUT_TOKENS) ? BOT_MAX_OUTPUT_TOKENS : 280,
            },
          });
          if (error) throw error;
          return data as any;
        }, BOT_RETRY_LIMIT);

        const text = String(result?.text || '').trim();
        return text || localFallback;
      } catch (error) {
        try {
          const response = (error as any)?.context as Response | undefined;
          if (response) {
            const payload = await response.clone().json().catch(() => null);
            const details = JSON.stringify(payload || {}).toLowerCase();
            if (response.status === 429 || details.includes('quota exceeded')) {
              console.warn('AGTA BOT quota Gemini atteint.', payload || response.status);
              return 'Le quota Gemini est atteint pour le moment. Reessaye plus tard ou active un plan facturable (Google AI Studio) pour continuer sans interruption.';
            }
            if (response.status === 401 || response.status === 403) {
              console.warn('AGTA BOT acces refuse (auth/secrets).', payload || response.status);
              return 'Acces IA refuse temporairement (auth/secrets). Verifie la configuration Supabase de la fonction gemini-proxy.';
            }
            if (response.status >= 500) {
              console.warn('AGTA BOT service indisponible.', payload || response.status);
              return 'Le service IA est temporairement indisponible. Reessaye dans quelques instants.';
            }
          }
        } catch {
          // Ignore error parsing and use local fallback
        }
        console.error('AGTA BOT proxy failed, fallback local utilise.', error);
        return localFallback;
      }
    }

    if (BOT_PROVIDER !== 'gemini' || !BOT_GEMINI_API_KEY) return localFallback;

    try {
      const endpoint = `${BOT_GEMINI_API_URL}/models/${BOT_GEMINI_MODEL}:generateContent`;
      const systemPrompt = [
        'Tu es AGTA BOT, assistant operationnel pour un staff sportif.',
        'Objectif: fournir des reponses concretes, actionnables et fiables, sans blabla.',
        'Style: direct, professionnel, francais simple.',
        'Interdit: preambules du type "Bonjour, ici AGTA BOT" ou formulations administratives.',
        'Si l utilisateur demande un nombre de points (ex: 5 points), respecte exactement ce format.',
        'Quand pertinent, proposer une structure claire en puces avec actions, responsables et delais.',
        'Ne pas inventer des faits non presents dans la demande.',
        'Terminer par une mini section "Prochaine action" en 1 ligne si utile.',
      ].join(' ');

      const userPrompt = [
        `Contexte: ${ctxLabel}`,
        `Canal: ${channelId}`,
        `Demande: ${prompt}`,
      ].join('\n');

      const data = await withRetries(async () => fetchJsonWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': BOT_GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\n${userPrompt}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: Number.isFinite(BOT_TEMPERATURE) ? BOT_TEMPERATURE : 0.4,
              maxOutputTokens: Number.isFinite(BOT_MAX_OUTPUT_TOKENS) ? BOT_MAX_OUTPUT_TOKENS : 280,
            },
          }),
        },
        BOT_TIMEOUT_MS
      ), BOT_RETRY_LIMIT);

      const aiText = (data?.candidates || [])
        .flatMap((candidate: any) => candidate?.content?.parts || [])
        .map((part: any) => String(part?.text || '').trim())
        .filter(Boolean)
        .join('\n')
        .trim();

      return aiText || localFallback;
    } catch (error) {
      console.error('AGTA BOT direct Gemini request failed, using local fallback.', error);
      return localFallback;
    }
  };

  const translateText = async (text: string, source: 'fr' | 'en' | 'es', target: 'fr' | 'en' | 'es' | 'ln') => {
    if (!text.trim()) return '';
    if (source === target) return text;

    if (target === 'ln') {
      const words = text.toLowerCase().split(/\s+/).map((w) => LINGALA_FALLBACK[w] || w);
      return words.join(' ');
    }

    if (!consumeQuota(text.length)) {
      return text;
    }

    try {
      const translated = await withRetries(async () => {
        if (TRANSLATION_PROVIDER === 'deepl' && TRANSLATION_API_KEY) {
          const endpoint = TRANSLATION_API_URL || 'https://api-free.deepl.com/v2/translate';
          const params = new URLSearchParams();
          params.set('text', text);
          params.set('source_lang', source.toUpperCase());
          params.set('target_lang', target.toUpperCase());
          const data = await fetchJsonWithTimeout(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `DeepL-Auth-Key ${TRANSLATION_API_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          });
          return data?.translations?.[0]?.text || text;
        }

        if (TRANSLATION_PROVIDER === 'libretranslate') {
          const endpoint = TRANSLATION_API_URL || 'https://libretranslate.de/translate';
          const data = await fetchJsonWithTimeout(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: text,
              source,
              target,
              format: 'text',
              api_key: TRANSLATION_API_KEY || undefined,
            }),
          });
          return data?.translatedText || text;
        }

        const pair = `${source}|${target}`;
        const endpoint = TRANSLATION_API_URL || `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
        const data = await fetchJsonWithTimeout(endpoint, { method: 'GET' });
        return data?.responseData?.translatedText || text;
      });

      void insertWithOfflineRetry('translation_audit', {
        provider: TRANSLATION_PROVIDER,
        source_lang: source,
        target_lang: target,
        chars_count: text.length,
        success: true,
      });

      return translated;
    } catch {
      void insertWithOfflineRetry('translation_audit', {
        provider: TRANSLATION_PROVIDER,
        source_lang: source,
        target_lang: target,
        chars_count: text.length,
        success: false,
      });
      return text;
    }
  };

  const canEditMessage = (message: Message) => {
    if (message.sender_name !== currentUser) return false;
    const created = new Date(message.created_at).getTime();
    return Date.now() - created <= EDIT_WINDOW_MS;
  };

  const canDeleteForAll = (message: Message) => {
    if (message.sender_name !== currentUser) return false;
    const created = new Date(message.created_at).getTime();
    return Date.now() - created <= DELETE_FOR_ALL_WINDOW_MS;
  };

  const toPublicAttachmentUrl = (pathOrUrl?: string): string => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;

    const prefixed = pathOrUrl.match(/^([a-z0-9-]+)\/(.+)$/i);
    if (prefixed && READ_BUCKET_CANDIDATES.includes(prefixed[1])) {
      const bucket = prefixed[1];
      const path = prefixed[2];
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl || '';
    }

    const { data } = supabase.storage.from(READ_BUCKET_CANDIDATES[0]).getPublicUrl(pathOrUrl);
    return data.publicUrl || '';
  };

  const visibleMessages = useMemo(() => {
    const activeContext = getSelectedContext();
    const channelMessages = messages
      .filter((m) => {
        const rawChannel = m.channel || 'Direction Générale';
        if (selectedChannel === 'AGTA BOT') {
          return rawChannel === 'AGTA BOT';
        }
        return !m.channel || rawChannel === selectedChannel;
      })
      .filter((m) => {
        const messageContext = m.context_id || 'general:ops';
        return messageContext === activeContext.context_id;
      })
      .filter((m) => !hiddenMessageIds.includes(m.id))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    const q = messageSearch.trim().toLowerCase();
    return channelMessages.filter((m) => {
      if (searchSender !== 'all' && m.sender_name !== searchSender) return false;
      if (searchType !== 'all' && (m.message_type || 'text') !== searchType) return false;
      if (searchOnlyAttachments && !m.attachment_name) return false;
      if (!shouldMatchSearchDate(m.created_at, searchDate)) return false;
      if (!q) return true;

      const haystack = `${m.content} ${m.sender_name} ${m.attachment_name || ''} ${m.context_label || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [
    messages,
    selectedChannel,
    messageSearch,
    hiddenMessageIds,
    selectedContextId,
    customContextLabel,
    searchSender,
    searchType,
    searchDate,
    searchOnlyAttachments,
  ]);

  const messageById = useMemo(() => {
    const index: Record<string, Message> = {};
    messages.forEach((m) => {
      index[m.id] = m;
    });
    return index;
  }, [messages]);

  const conversationItems = useMemo<ConversationItem[]>(() => {
    return channels
      .map((channel) => {
        const displayName = getChannelDisplayName(channel);
        const avatarLabel = getChannelAvatarLabel(channel);
        const channelMessages = messages
          .filter((message) => (message.channel || 'Direction Générale') === channel.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastMessage = channelMessages[0] || null;
        const unread = unreadByChannel[channel.id] || 0;
        const isFavorite = channelMessages.some((message) => message.pinned || message.important);
        const isGroup = isGroupChannelId(channel.id);

        return {
          ...channel,
          name: displayName,
          avatarLabel,
          lastMessage,
          unread,
          isFavorite,
          isGroup,
          avatarSrc: resolveConversationAvatar(avatarLabel),
        };
      })
      .filter((channel) => {
        // Filter by archive status
        const isArchived = channelArchived[channel.id] || false;
        if (showArchivedOnly && !isArchived) return false;
        if (!showArchivedOnly && isArchived) return false;

        const q = channelSearch.trim().toLowerCase();
        const haystack = `${channel.name} ${channel.description} ${channel.lastMessage?.content || ''}`.toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (conversationFilter === 'unread') return channel.unread > 0;
        if (conversationFilter === 'favorites') return channel.isFavorite;
        if (conversationFilter === 'groups') return channel.isGroup;
        return true;
      })
      .sort((a, b) => {
        // Pinned conversations come first
        const aPinned = channelPinned[a.id] || false;
        const bPinned = channelPinned[b.id] || false;
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;

        const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });
  }, [channels, messages, unreadByChannel, channelSearch, conversationFilter, resolveConversationAvatar, isGroupChannelId, getChannelDisplayName, getChannelAvatarLabel, channelArchived, channelPinned, showArchivedOnly]);

  const archivedConversationsCount = channels.filter((channel) => channelArchived[channel.id]).length;
  const selectedChannelMeta = channels.find((channel) => channel.id === selectedChannel);

  const currentStoryOwnerKey = useMemo(() => {
    const base = normalizeUserKey(currentUserEmail || currentUserProfileName || currentUser || 'staff-secretary');
    return base || 'staff-secretary';
  }, [normalizeUserKey, currentUserEmail, currentUserProfileName, currentUser]);

  const currentStoryOwnerName = currentUserProfileName || currentUser;

  const pruneExpiredStories = useCallback((input: PersistedStoryRecord[]) => {
    const now = Date.now();
    return input.filter((story) => {
      const expiry = new Date(story.expires_at).getTime();
      return !Number.isNaN(expiry) && expiry > now;
    });
  }, []);

  const canCurrentUserSeeStory = useCallback((story: PersistedStoryRecord) => {
    if (story.owner_key === currentStoryOwnerKey) return true;
    if (story.privacy === 'all') return true;
    if (story.privacy === 'only') return story.allowed_keys.includes(currentStoryOwnerKey);
    return !story.excluded_keys.includes(currentStoryOwnerKey);
  }, [currentStoryOwnerKey]);

  const isStoriesTableMissingError = useCallback((error: any) => {
    const status = Number(error?.status || 0);
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();
    if (status === 404) return true;
    if (code === 'PGRST205') return true;
    if (message.includes('relation') && message.includes('stories')) return true;
    if (message.includes('table') && message.includes('stories') && message.includes('not')) return true;
    return false;
  }, []);

  const persistStoriesLocalFallback = useCallback((next: PersistedStoryRecord[]) => {
    setStoryRecords(next);
    try {
      localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(next));
    } catch {
      // Ignore fallback storage errors.
    }
  }, []);

  const loadStoriesFromLocalFallback = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORY_LS_FALLBACK_KEY);
      const parsed = raw ? (JSON.parse(raw) as PersistedStoryRecord[]) : [];
      persistStoriesLocalFallback(pruneExpiredStories(parsed || []));
    } catch {
      setStoryRecords([]);
    }
  }, [persistStoriesLocalFallback, pruneExpiredStories]);

  const mapStoryRowsToRecords = useCallback((rows: StoryRow[], storyViews: StoryViewRow[]) => {
    const viewsByStory = new Map<string, StoryViewEntry[]>();
    storyViews.forEach((view) => {
      const existing = viewsByStory.get(view.story_id) || [];
      existing.push({
        viewer_key: view.viewer_key,
        viewer_name: view.viewer_name,
        viewed_at: view.viewed_at,
      });
      viewsByStory.set(view.story_id, existing);
    });

    return rows.map((story) => ({
      id: story.id,
      owner_key: story.owner_key,
      owner_name: story.owner_name,
      avatar_url: story.avatar_url || '',
      type: story.type,
      content: story.content || undefined,
      url: story.url || undefined,
      bg_color: story.bg_color || undefined,
      privacy: story.privacy || 'all',
      allowed_keys: Array.isArray(story.allowed_keys) ? story.allowed_keys : [],
      excluded_keys: Array.isArray(story.excluded_keys) ? story.excluded_keys : [],
      views: viewsByStory.get(story.id) || [],
      reactions: [],
      comments: [],
      created_at: story.created_at,
      expires_at: story.expires_at,
    }));
  }, []);

  const fetchStories = useCallback(async () => {
    if (!storiesBackendAvailable) {
      loadStoriesFromLocalFallback();
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const { data: rows, error } = await supabase
        .from('stories')
        .select('id, owner_key, owner_name, avatar_url, type, content, url, bg_color, privacy, allowed_keys, excluded_keys, created_at, expires_at')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedRows = (rows || []) as StoryRow[];
      if (typedRows.length === 0) {
        setStoryRecords([]);
        return;
      }

      const storyIds = typedRows.map((row) => row.id);
      const { data: viewRows, error: viewsError } = await supabase
        .from('story_views')
        .select('story_id, viewer_key, viewer_name, viewed_at')
        .in('story_id', storyIds)
        .order('viewed_at', { ascending: true });

      if (viewsError) throw viewsError;

      setStoryRecords(mapStoryRowsToRecords(typedRows, (viewRows || []) as StoryViewRow[]));
      setStoriesBackendAvailable(true);
    } catch (error: any) {
      if (isStoriesTableMissingError(error)) {
        setStoriesBackendAvailable(false);
        loadStoriesFromLocalFallback();
        return;
      }
      setStoryRecords([]);
    }
  }, [supabase, mapStoryRowsToRecords, isStoriesTableMissingError, storiesBackendAvailable, loadStoriesFromLocalFallback]);

  const markStoryViewed = useCallback(async (storyId: string) => {
    const currentStory = storyRecords.find((story) => story.id === storyId);
    if (!currentStory) return;
    if (currentStory.owner_key === currentStoryOwnerKey) return;
    if (!canCurrentUserSeeStory(currentStory)) return;
    if (currentStory.views.some((v) => v.viewer_key === currentStoryOwnerKey)) return;

    const optimisticView: StoryViewEntry = {
      viewer_key: currentStoryOwnerKey,
      viewer_name: currentStoryOwnerName,
      viewed_at: new Date().toISOString(),
    };

    if (!storiesBackendAvailable) {
      setStoryRecords((prev) => {
        const next = prev.map((story) => (
          story.id === storyId
            ? { ...story, views: [...story.views, optimisticView] }
            : story
        ));
        try {
          localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(next));
        } catch {
          // Ignore fallback storage errors.
        }
        return next;
      });
      return;
    }

    setStoryRecords((prev) => prev.map((story) => (
      story.id === storyId
        ? { ...story, views: [...story.views, optimisticView] }
        : story
    )));

    const { error } = await supabase
      .from('story_views')
      .upsert([
        {
          story_id: storyId,
          viewer_key: currentStoryOwnerKey,
          viewer_name: currentStoryOwnerName,
          viewed_at: optimisticView.viewed_at,
        },
      ], { onConflict: 'story_id,viewer_key' });

    if (error) {
      if (isStoriesTableMissingError(error)) {
        setStoriesBackendAvailable(false);
        setStoryRecords((prev) => {
          try {
            localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(prev));
          } catch {
            // Ignore fallback storage errors.
          }
          return prev;
        });
        return;
      }
      void fetchStories();
    }
  }, [storyRecords, currentStoryOwnerKey, currentStoryOwnerName, canCurrentUserSeeStory, supabase, fetchStories, storiesBackendAvailable, isStoriesTableMissingError]);

  useEffect(() => {
    void fetchStories();

    const expiryPoll = window.setInterval(() => {
      if (storiesBackendAvailable) {
        void fetchStories();
        return;
      }
      setStoryRecords((prev) => {
        const cleaned = pruneExpiredStories(prev);
        if (cleaned.length !== prev.length) {
          try {
            localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(cleaned));
          } catch {
            // Ignore fallback storage errors.
          }
        }
        return cleaned;
      });
    }, 60 * 1000);

    return () => {
      window.clearInterval(expiryPoll);
    };
  }, [fetchStories, storiesBackendAvailable, pruneExpiredStories]);

  // Build real 24h stories with privacy rules.
  const contactStories = useMemo<UserStory[]>(() => {
    const visibleStories = pruneExpiredStories(storyRecords).filter(canCurrentUserSeeStory);
    const grouped = new Map<string, PersistedStoryRecord[]>();
    visibleStories.forEach((story) => {
      const key = story.owner_key;
      const list = grouped.get(key) || [];
      list.push(story);
      grouped.set(key, list);
    });

    const results: UserStory[] = [];
    grouped.forEach((list, ownerKey) => {
      const sorted = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const first = sorted[0];
      const viewerSeenAll = sorted.every((s) => s.views.some((v) => v.viewer_key === currentStoryOwnerKey));
      const channelCandidate = conversationItems.find((c) => normalizeUserKey(c.name) === ownerKey || normalizeUserKey(c.id) === ownerKey);
      const channelName = first.owner_key === currentStoryOwnerKey ? 'Mon statut' : (channelCandidate?.name || first.owner_name || 'Story');
      const avatar = channelCandidate?.avatarSrc || first.avatar_url || resolveAvatarForName(first.owner_name || channelName);

      results.push({
        owner_key: ownerKey,
        channel_id: ownerKey,
        channel_name: channelName,
        avatar_url: avatar,
        has_unviewed: !viewerSeenAll,
        items: sorted.map((s) => ({
          id: s.id,
          type: s.type,
          content: s.content,
          url: s.url,
          bg_color: s.bg_color,
          privacy: s.privacy,
          allowed_keys: s.allowed_keys,
          excluded_keys: s.excluded_keys,
          views: s.views,
          owner_key: s.owner_key,
          created_at: s.created_at,
        })),
      });
    });

    return results.sort((a, b) => {
      if (a.owner_key === currentStoryOwnerKey) return -1;
      if (b.owner_key === currentStoryOwnerKey) return 1;
      return a.has_unviewed === b.has_unviewed ? 0 : a.has_unviewed ? -1 : 1;
    });
  }, [storyRecords, pruneExpiredStories, canCurrentUserSeeStory, conversationItems, currentStoryOwnerKey, normalizeUserKey, resolveAvatarForName]);

  useEffect(() => {
    if (!showStoryViewer || !activeStory) return;
    const currentItem = activeStory.items[activeStoryItemIndex];
    if (currentItem?.id) {
      void markStoryViewed(currentItem.id);
    }

    const timer = setTimeout(() => {
      const nextIndex = activeStoryItemIndex + 1;
      if (nextIndex < activeStory.items.length) {
        setActiveStoryItemIndex(nextIndex);
        setStoryProgressKey((k) => k + 1);
      } else {
        setShowStoryViewer(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [showStoryViewer, activeStory, activeStoryItemIndex, markStoryViewed]);

  useEffect(() => {
    setNewProfileStatusText(myProfileStatus);
  }, [myProfileStatus]);

  const storyAudienceOptions = useMemo(() => {
    return conversationItems
      .filter((c) => normalizeUserKey(c.name) !== currentStoryOwnerKey && normalizeUserKey(c.id) !== currentStoryOwnerKey)
      .map((c) => ({ key: normalizeUserKey(c.name) || normalizeUserKey(c.id), label: c.name }));
  }, [conversationItems, normalizeUserKey, currentStoryOwnerKey]);

  const handleStoryFilePick = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setStoryDraftImage(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const resetStoryComposer = useCallback(() => {
    setStoryDraftText('');
    setStoryDraftImage('');
    setStoryDraftBg(STORY_BG_COLORS[0]);
    setStoryPrivacy('all');
    setStoryAudienceKeys([]);
    setShowStoryViewers(false);
  }, []);

  const handlePublishStory = useCallback(async () => {
    const text = storyDraftText.trim();
    const hasImage = Boolean(storyDraftImage);
    if (!text && !hasImage) return;

    const now = new Date();
    const recordBase: Omit<PersistedStoryRecord, 'id' | 'views'> = {
      owner_key: currentStoryOwnerKey,
      owner_name: currentStoryOwnerName,
      avatar_url: currentUserAvatarUrl || resolveAvatarForName(currentStoryOwnerName || currentUser),
      type: hasImage ? 'image' : 'text',
      content: text || undefined,
      url: hasImage ? storyDraftImage : undefined,
      bg_color: hasImage ? undefined : storyDraftBg,
      privacy: storyPrivacy,
      allowed_keys: storyPrivacy === 'only' ? storyAudienceKeys : [],
      excluded_keys: storyPrivacy === 'exclude' ? storyAudienceKeys : [],
      reactions: [],
      comments: [],
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + STORY_EXPIRY_MS).toISOString(),
    };

    if (!storiesBackendAvailable) {
      const localRecord: PersistedStoryRecord = {
        ...recordBase,
        id: crypto.randomUUID(),
        views: [],
        reactions: [],
        comments: [],
      };
      setStoryRecords((prev) => {
        const next = [localRecord, ...prev];
        try {
          localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(next));
        } catch {
          // Ignore fallback storage errors.
        }
        return next;
      });
      resetStoryComposer();
      setShowCreateStoryModal(false);
      return;
    }

    const { error } = await supabase.from('stories').insert([recordBase]);
    if (error) {
      if (isStoriesTableMissingError(error)) {
        setStoriesBackendAvailable(false);
        const localRecord: PersistedStoryRecord = {
          ...recordBase,
          id: crypto.randomUUID(),
          views: [],
        };
        setStoryRecords((prev) => {
          const next = [localRecord, ...prev];
          try {
            localStorage.setItem(STORY_LS_FALLBACK_KEY, JSON.stringify(next));
          } catch {
            // Ignore fallback storage errors.
          }
          return next;
        });
        resetStoryComposer();
        setShowCreateStoryModal(false);
      }
      return;
    }

    void fetchStories();
    resetStoryComposer();
    setShowCreateStoryModal(false);
  }, [storyDraftText, storyDraftImage, currentStoryOwnerKey, currentStoryOwnerName, currentUserAvatarUrl, resolveAvatarForName, currentUser, storyDraftBg, storyPrivacy, storyAudienceKeys, storiesBackendAvailable, supabase, isStoriesTableMissingError, fetchStories, resetStoryComposer]);

  const activeStoryCurrentItem = useMemo(() => {
    if (!activeStory) return null;
    return activeStory.items[activeStoryItemIndex] || null;
  }, [activeStory, activeStoryItemIndex]);

  const activeStoryViewers = useMemo(() => {
    return activeStoryCurrentItem?.views || [];
  }, [activeStoryCurrentItem]);

  const selectedConversationMeta = conversationItems.find((channel) => channel.id === selectedChannel);
  const selectedConversationMessages = useMemo(
    () => messages.filter((message) => (message.channel || 'Direction Générale') === selectedChannel),
    [messages, selectedChannel]
  );
  const selectedSharedFiles = useMemo(
    () => selectedConversationMessages.filter((message) => Boolean(message.attachment_name)).slice(-6).reverse(),
    [selectedConversationMessages]
  );
  const selectedImportantCount = useMemo(
    () => selectedConversationMessages.filter((message) => message.important || message.pinned).length,
    [selectedConversationMessages]
  );
  const selectedConversationName = selectedConversationMeta?.name || selectedChannelMeta?.name || selectedChannel;
  const selectedConversationDescription = selectedConversationMeta?.description || selectedChannelMeta?.description || 'Discussion AGTA securisee';
  const selectedAvatarLabel = selectedConversationMeta?.avatarLabel || selectedConversationName;
  const attachmentTargetOptions = useMemo(
    () => conversationItems.map((channel) => ({ id: channel.id, name: channel.name })),
    [conversationItems]
  );

  const participantOptions = useMemo(() => {
    if (isGroupChannelId(selectedChannel)) {
      const base = GROUP_MEMBERS_BY_CHANNEL[selectedChannel] || ['Direction Générale', 'STAFF SECRETARY'];
      return base.filter((n) => n !== currentUser);
    }
    if (selectedChannel === 'Direction Générale') {
      return [getPrivatePeerName(selectedChannel)];
    }
    return ['Direction Générale', 'STAFF SECRETARY'].filter((n) => n !== currentUser);
  }, [selectedChannel, currentUser, isGroupChannelId, getPrivatePeerName]);

  const getAvatarForName = useCallback((name: string) => resolveAvatarForName(name), [resolveAvatarForName]);
  const selectedAvatarSrc = resolveConversationAvatar(selectedAvatarLabel);
  const isSelectedChannelGroup = isGroupChannelId(selectedChannel);
  const selectedGroupMembers = useMemo(() => {
    if (!isSelectedChannelGroup) return [];
    const fromMessages = Array.from(
      new Set(
        selectedConversationMessages
          .map((m) => m.sender_name)
          .filter(Boolean)
      )
    );
    const base = GROUP_MEMBERS_BY_CHANNEL[selectedChannel] || ['Direction Générale', 'STAFF SECRETARY'];
    const merged = Array.from(new Set([currentUser, ...base, ...fromMessages]));
    return merged.slice(0, 12);
  }, [isSelectedChannelGroup, selectedConversationMessages, currentUser, selectedChannel]);

  const senderOptions = useMemo(() => {
    const names = new Set<string>();
    messages.forEach((m) => {
      if (m.channel === selectedChannel || !m.channel) names.add(m.sender_name);
    });
    return ['all', ...Array.from(names)];
  }, [messages, selectedChannel]);
  const selectedContext = getSelectedContext();
  const activeUsers = Object.values(presenceByUser).filter((p) => p.channel === selectedChannel && p.is_online);
  const peerNameForPresence = useMemo(() => {
    if (!selectedChannel || isSelectedChannelGroup) return '';
    if (selectedChannel === 'AGTA BOT') return 'AGTA BOT';
    return getPrivatePeerName(selectedChannel) || selectedConversationName || selectedChannel;
  }, [selectedChannel, isSelectedChannelGroup, getPrivatePeerName, selectedConversationName]);
  const peerPresence = peerNameForPresence ? presenceByUser[peerNameForPresence] : undefined;
  const conversationPresenceLabel = useMemo(() => {
    if (selectedChannel === 'AGTA BOT') return 'Assistant actif';
    if (isSelectedChannelGroup) {
      return activeUsers.length > 0 ? `${activeUsers.length} en ligne` : 'vu recemment';
    }
    if (peerIsTyping) return 'En train d\'écrire…';
    if (peerIsRecording) return 'En train d\'enregistrer un message vocal…';
    if (peerPresence?.is_online) return 'en ligne';
    if (peerPresence?.last_seen) return formatLastSeen(peerPresence.last_seen);
    return 'vu recemment';
  }, [selectedChannel, isSelectedChannelGroup, activeUsers.length, peerPresence, peerIsTyping, peerIsRecording]);
  const currentUserKey = currentUserEmail || currentUser;
  const callUser = callClientId ? `${currentUser}:${callClientId}` : currentUser;

  const resolveSignalTarget = (target?: string | null) => {
    if (!target) return null;
    return target;
  };

  const displayPeerName = (peer?: string) => {
    if (!peer) return defaultPeer;
    const base = peer.split(':')[0];
    return base || peer;
  };

  const insertCallSignals = async (rows: Array<Record<string, any>>) => {
    const { error } = await supabase.from('call_signals').insert(rows);
    if (error) throw error;
  };

  const closeActionMenu = () => {
    setActionMenu({ open: false, x: 0, y: 0, message: null });
  };

  const openActionMenu = (msg: Message, x: number, y: number) => {
    setActionMenu({ open: true, x, y, message: msg });
  };

  const startLongPress = (msg: Message, touchX: number, touchY: number) => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    longPressTimeoutRef.current = window.setTimeout(() => {
      triggerHaptic();
      openActionMenu(msg, touchX, touchY);
    }, LONG_PRESS_MS);
  };

  const stopLongPress = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const getMicErrorMessage = (error: unknown) => {
    const err = error as { name?: string; message?: string };
    const name = err?.name || '';

    if (!window.isSecureContext) {
      return 'Micro bloque: ouvrez l\'app en https:// ou http://localhost.';
    }

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Permission micro refusee: autorisez le micro dans les parametres du navigateur.';
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Aucun micro detecte sur cet appareil.';
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Micro occupe par une autre application. Fermez Teams/Zoom/Meet puis reessayez.';
    }

    if (name === 'SecurityError') {
      return 'Contexte non securise: utilisez https:// ou localhost.';
    }

    if (name === 'AbortError') {
      return 'Demarrage micro interrompu. Reessayez.';
    }

    return `Impossible de demarrer le micro${err?.message ? `: ${err.message}` : '.'}`;
  };

  const requestMicPermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('getUserMedia non disponible sur ce navigateur.');
      return false;
    }

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testStream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (error) {
      const base = getMicErrorMessage(error);
      setVoiceError(`${base} Cliquez sur l'icone cadenas pres de l'URL, autorisez le microphone, puis rechargez la page.`);
      return false;
    }
  };

  const handleRequestMicAccess = async () => {
    setVoiceError('');
    const granted = await requestMicPermission();
    if (granted) {
      setVoiceError('Acces micro autorise. Cliquez maintenant sur le micro pour enregistrer.');
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email || '';
      const profileName = (data.user?.user_metadata?.full_name as string) || '';
      const avatarUrl = (data.user?.user_metadata?.profile_picture_url as string)
        || (data.user?.user_metadata?.avatar_url as string)
        || '';
      // Verrouiller l'identité de cet onglet dès le chargement
      initialEmailRef.current = email;
      currentUserIdRef.current = data.user?.id || '';
      if (email) setCurrentUserEmail(email);
      setCurrentUserProfileName(profileName);
      setCurrentUserAvatarUrl(avatarUrl);
      void fetchChatProfiles();
    };

    loadUser();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const email = session?.user?.email || '';
      const profileName = (session?.user?.user_metadata?.full_name as string) || '';
      const avatarUrl = (session?.user?.user_metadata?.profile_picture_url as string)
        || (session?.user?.user_metadata?.avatar_url as string)
        || '';
      // Ne mettre à jour que si c'est LE MÊMME utilisateur qui était connecté au chargement
      // Évite la contamination inter-onglets si un autre compte se connecte dans un autre onglet
      if (session?.user?.email && email !== initialEmailRef.current && initialEmailRef.current !== '') return;
      if (email) setCurrentUserEmail(email);
      setCurrentUserProfileName(profileName);
      setCurrentUserAvatarUrl(avatarUrl);
      void fetchChatProfiles();
    });

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarUrl?: string; fullName?: string; userId?: string; userEmail?: string; chatUserName?: string; updatedAt?: string }>;
      // Ignorer l'événement s'il provient d'un autre utilisateur
      if (customEvent.detail?.userId && currentUserIdRef.current && currentUserIdRef.current !== customEvent.detail.userId) return;
      if (customEvent.detail?.avatarUrl !== undefined) {
        setCurrentUserAvatarUrl(customEvent.detail.avatarUrl || '');
      }
      if (customEvent.detail?.fullName !== undefined) {
        setCurrentUserProfileName(customEvent.detail.fullName || '');
      }

      const alias = customEvent.detail?.chatUserName || customEvent.detail?.fullName || currentUser;
      const canonical = canonicalAvatarLabel(alias);
      if (canonical) {
        setChatProfilesByName((prev) => ({
          ...prev,
          [canonical]: {
            ...(prev[canonical] || { user_name: canonical }),
            user_name: canonical,
            user_email: customEvent.detail?.userEmail || prev[canonical]?.user_email,
            display_name: customEvent.detail?.fullName || prev[canonical]?.display_name,
            profile_picture_url: customEvent.detail?.avatarUrl || prev[canonical]?.profile_picture_url,
            avatar_url: customEvent.detail?.avatarUrl || prev[canonical]?.avatar_url,
            updated_at: customEvent.detail?.updatedAt || new Date().toISOString(),
          },
        }));
      }
    };

    window.addEventListener('agta:profile-updated', handleProfileUpdated as EventListener);

    return () => {
      authSubscription.subscription.unsubscribe();
      window.removeEventListener('agta:profile-updated', handleProfileUpdated as EventListener);
    };
  }, [fetchChatProfiles, canonicalAvatarLabel, currentUser]);

  // ESC — ferme le panneau/picker ouvert en premier, sinon désélectionne la conversation (desktop)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showInfoPanelDesktop) { setShowInfoPanelDesktop(false); return; }
      if (showInfoPanelMobile) { setShowInfoPanelMobile(false); return; }
      if (showEmojiPicker) { setShowEmojiPicker(false); return; }
      if (showChannelsMobile) { setShowChannelsMobile(false); return; }
      // Rien d'ouvert → retour à l'écran de sélection (desktop uniquement)
      if (selectedChannel && window.innerWidth >= 768) {
        setSelectedChannel('');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showInfoPanelDesktop, showInfoPanelMobile, showEmojiPicker, showChannelsMobile, selectedChannel]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMessageSearch(messageSearchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [messageSearchInput]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      return;
    }
    setPushPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('agta_push_enabled', pushEnabled ? '1' : '0');
  }, [pushEnabled]);

  useEffect(() => {
    const handleOnline = () => {
      void flushOfflineInsertQueue();
    };

    window.addEventListener('online', handleOnline);
    const timer = window.setInterval(() => {
      void flushOfflineInsertQueue();
    }, 15000);

    void flushOfflineInsertQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.clearInterval(timer);
    };
  }, [flushOfflineInsertQueue]);

  useEffect(() => {
    const storageKey = `agta_call_client_id_${currentUser.replace(/\s+/g, '_').toLowerCase()}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) {
      setCallClientId(existing);
      return;
    }

    const nextId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    sessionStorage.setItem(storageKey, nextId);
    setCallClientId(nextId);
  }, [currentUser]);

  useEffect(() => {
    const handleGlobalPointer = () => {
      if (actionMenu.open) closeActionMenu();
    };

    window.addEventListener('click', handleGlobalPointer);
    window.addEventListener('scroll', handleGlobalPointer, true);

    return () => {
      window.removeEventListener('click', handleGlobalPointer);
      window.removeEventListener('scroll', handleGlobalPointer, true);
      stopLongPress();
    };
  }, [actionMenu.open]);

  const fetchViewOnceReceipts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_audio_receipts')
        .select('message_id')
        .eq('user_key', currentUserKey);

      if (error || !data) return;

      const map: Record<string, boolean> = {};
      data.forEach((r: any) => {
        map[String(r.message_id)] = true;
      });
      setViewOncePlayedMap(map);
    } catch {
      setViewOncePlayedMap({});
    }
  }, [currentUserKey]);

  useEffect(() => {
    const key = `agta_hidden_messages_${selectedChannel}_${currentUser}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      setHiddenMessageIds([]);
      return;
    }

    try {
      setHiddenMessageIds(JSON.parse(raw));
    } catch {
      setHiddenMessageIds([]);
    }
  }, [selectedChannel]);

  const persistHiddenMessages = (next: Array<string | number>) => {
    const key = `agta_hidden_messages_${selectedChannel}_${currentUser}`;
    setHiddenMessageIds(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  const getSupportedAudioConfig = () => {
    const options = [
      { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
      { mimeType: 'audio/webm', ext: 'webm' },
      { mimeType: 'audio/mp4', ext: 'm4a' },
      { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
    ];

    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return { mimeType: '', ext: 'webm' };
    }

    const supported = options.find((opt) => MediaRecorder.isTypeSupported(opt.mimeType));
    return supported || { mimeType: '', ext: 'webm' };
  };

  const cycleAudioRate = (messageId: string | number) => {
    const key = String(messageId);
    const current = audioRates[key] || 1;
    const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1;
    setAudioRates((prev) => ({ ...prev, [key]: next }));
  };

  const playRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) return;

    ringtoneIntervalRef.current = window.setInterval(() => {
      try {
        const AudioContextRef = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextRef) return;

        const context = new AudioContextRef();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.22);

        window.setTimeout(() => {
          context.close();
        }, 260);
      } catch {
        // Silent if browser blocks audio context.
      }
    }, 900);
  }, []);

  const stopRingtone = useCallback(() => {
    if (!ringtoneIntervalRef.current) return;
    window.clearInterval(ringtoneIntervalRef.current);
    ringtoneIntervalRef.current = null;
  }, []);

  const fetchCallHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('channel', selectedStorageChannelId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (!error && data) {
        setCallHistory(data as CallHistoryItem[]);
      }
    } catch {
      // Table may not exist yet.
      setCallHistory([]);
    }
  }, [selectedStorageChannelId]);

  const fetchAllCallHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setAllCalls(data as CallHistoryItem[]);
      }
    } catch {
      // Table may not exist yet.
      setAllCalls([]);
    }
  }, []);

  const handleArchiveConversation = useCallback((channelId: string) => {
    setChannelArchived((prev) => {
      const next = !prev[channelId];
      // If archiving currently selected conversation, deselect it
      if (next) setSelectedChannel((cur) => cur === channelId ? '' : cur);
      return { ...prev, [channelId]: next };
    });
  }, []);

  const handleMuteConversation = useCallback((channelId: string, duration: string | number) => {
    const now = Date.now();
    let muteUntil = now;
    if (duration === '8h') muteUntil += 8 * 60 * 60 * 1000;
    else if (duration === '1w') muteUntil += 7 * 24 * 60 * 60 * 1000;
    else if (duration === 'always') muteUntil = now + 100 * 365 * 24 * 60 * 60 * 1000;
    setChannelMutedUntil((prev) => ({ ...prev, [channelId]: muteUntil }));
  }, []);

  const handlePinConversation = useCallback((channelId: string) => {
    setChannelPinned((prev) => ({ ...prev, [channelId]: !prev[channelId] }));
  }, []);

  const handleBlockContact = useCallback((channelId: string) => {
    setChannelBlocked((prev) => ({ ...prev, [channelId]: !prev[channelId] }));
  }, []);

  const handleDeleteConversation = useCallback((channelId: string) => {
    setConversationContextMenu({ open: false, x: 0, y: 0, channel: null });
    setMuteSubmenuOpen(false);
    setTimeout(() => {
      if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
        setChannelArchived((prev) => { const n = { ...prev }; delete n[channelId]; return n; });
        setChannelPinned((prev) => { const n = { ...prev }; delete n[channelId]; return n; });
        setChannelMutedUntil((prev) => { const n = { ...prev }; delete n[channelId]; return n; });
        setChannelBlocked((prev) => { const n = { ...prev }; delete n[channelId]; return n; });
        setSelectedChannel((cur) => cur === channelId ? '' : cur);
      }
    }, 80);
  }, []);

  const handleLeaveGroup = useCallback((_channelId: string) => {
    setConversationContextMenu({ open: false, x: 0, y: 0, channel: null });
    setMuteSubmenuOpen(false);
    setTimeout(() => {
      if (confirm('Quitter ce groupe ?')) {
        // group leave logic here
      }
    }, 80);
  }, []);

  const handleMarkUnread = useCallback((channelId: string) => {
    setUnreadByChannel((prev) => ({ ...prev, [channelId]: Math.max(prev[channelId] || 0, 1) }));
  }, []);

  const handleShowProfile = useCallback((channel: ConversationItem) => {
    setSelectedContactForProfile(channel);
    setShowContactProfile(true);
    setConversationContextMenu({ open: false, x: 0, y: 0, channel: null });
    setMuteSubmenuOpen(false);
  }, []);

  const fetchPresence = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_presence')
        .select('*')
        .eq('channel', selectedStorageChannelId)
        .order('last_seen', { ascending: false });

      if (error || !data) return;
      const next: Record<string, ChatPresence> = {};
      (data as ChatPresence[]).forEach((row) => {
        next[row.user_name] = row;
      });
      setPresenceByUser(next);
    } catch {
      // Ignore when table is not available yet.
    }
  }, [selectedStorageChannelId]);

  // Detect peer typing from presence data
  useEffect(() => {
    if (!peerNameForPresence) return;
    const peer = presenceByUser[peerNameForPresence];
    if (!peer) return;
    setPeerIsTyping(!!peer.is_typing);
    setPeerIsRecording(!!peer.is_recording);
  }, [presenceByUser, peerNameForPresence]);

  const publishPresence = useCallback(async (online: boolean) => {
    try {
      await supabase.from('chat_presence').upsert([
        {
          user_name: currentUser,
          channel: selectedStorageChannelId,
          is_online: online,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'user_name,channel' });
    } catch {
      // Ignore when table is not available yet.
    }
  }, [currentUser, selectedStorageChannelId]);

  const publishTyping = useCallback(async (typing: boolean) => {
    try {
      await supabase.from('chat_presence').upsert([
        {
          user_name: currentUser,
          channel: selectedStorageChannelId,
          is_online: true,
          is_typing: typing,
          is_recording: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'user_name,channel' });
    } catch {
      // Ignore when table is not available yet.
    }
  }, [currentUser, selectedStorageChannelId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_notifications')
        .select('*')
        .eq('channel', selectedStorageChannelId)
        .eq('recipient', currentUser)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setNotifications(data as MessageNotification[]);
      }
    } catch {
      // Ignore when table is not available yet.
      setNotifications([]);
    }
  }, [currentUser, selectedStorageChannelId]);

  const pushNotification = useCallback(async (
    recipient: string,
    type: MessageNotification['notification_type'],
    title: string,
    body: string,
    messageId?: string | number,
    channelId?: string
  ) => {
    const notificationChannel = toStorageChannelId(channelId || selectedChannel);
    try {
      await insertWithOfflineRetry('message_notifications', {
        message_id: messageId ? String(messageId) : null,
        channel: notificationChannel,
        recipient,
        notification_type: type,
        title,
        body,
        is_read: false,
      });
      fetchNotifications();
    } catch {
      // Ignore when table is not available yet.
    }
  }, [fetchNotifications, selectedChannel, toStorageChannelId]);

  const fetchActionTimeline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('message_actions')
        .select('*')
        .eq('channel', selectedStorageChannelId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setActionsTimeline(data as MessageActionItem[]);
      }
    } catch {
      // Ignore when table is not available yet.
      setActionsTimeline([]);
    }
  }, [selectedStorageChannelId]);

  const createActionFromMessage = useCallback(async (message: Message, actionType: MessageActionItem['action_type']) => {
    const label = actionType === 'task' ? 'Tache' : actionType === 'reminder' ? 'Rappel' : 'Calendrier';
    const title = `${label}: ${message.content.slice(0, 80)}`;
    const safeInsert = async (table: string, row: Record<string, any>) => {
      try {
        await insertWithOfflineRetry(table, row);
      } catch {
        // Best effort cross-module sync.
      }
    };

    try {
      await insertWithOfflineRetry('message_actions', {
        message_id: String(message.id),
        channel: selectedStorageChannelId,
        action_type: actionType,
        title,
        notes: `Source message ${message.sender_name}`,
        due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        status: 'open',
        created_by: currentUser,
      });

      if (actionType === 'task') {
        await safeInsert('work_logs', {
          staff_name: currentUser,
          action: title,
          target_athlete: message.context_label || selectedChannel,
          type: 'Admin',
        });
      }

      if (actionType === 'reminder' || actionType === 'calendar') {
        await safeInsert('operations_log', {
          date: new Date().toLocaleDateString('fr-FR'),
          scout: currentUser,
          task: title,
          status: 'En cours',
        });
      }

      if (actionType === 'calendar') {
        await safeInsert('documents_agta', {
          name: `Rendez-vous_${new Date().toISOString().slice(0, 10)}.txt`,
          type: 'NOTE',
          size: '0.00 MB',
          storage_path: `calendar/${Date.now()}_message_${message.id}.txt`,
        });
      }

      await safeInsert('agta_activity', {
        user_email: currentUserEmail || `${currentUser.toLowerCase().replace(/\s+/g, '.')}@agta.local`,
        activity_type: actionType,
        description: title,
        metadata: {
          source: 'messages',
          message_id: String(message.id),
          channel: selectedStorageChannelId,
          context_id: message.context_id || null,
          context_label: message.context_label || null,
        },
      });

      fetchActionTimeline();
    } catch {
      // Ignore when table is not available yet.
    }
  }, [currentUser, currentUserEmail, fetchActionTimeline, selectedStorageChannelId]);

  const logCallEvent = useCallback(async (
    status: CallHistoryItem['status'],
    type: CallType,
    peer: string,
    durationSeconds?: number
  ) => {
    try {
      await supabase.from('call_history').insert([
        {
          channel: selectedStorageChannelId,
          from_user: callUser,
          to_user: peer,
          call_type: type,
          status,
          duration_seconds: durationSeconds ?? 0,
        },
      ]);
      fetchCallHistory();
    } catch {
      // Ignore if call_history is not installed yet.
    }
  }, [callUser, fetchCallHistory, selectedStorageChannelId]);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, channel, sender_name, status');

      if (error || !data) return;

      const counts: Record<string, number> = {};
      data.forEach((m: any) => {
        const rawChannel = m.channel || 'Direction Générale';
        if (typeof rawChannel === 'string' && rawChannel.startsWith('AGTA BOT::') && rawChannel !== botPrivateChannelId) {
          return;
        }
        const channel = toDisplayChannelId(rawChannel);
        const mine = m.sender_name === currentUser;
        const unread = (m.status || 'sent') !== 'read';

        if (!mine && unread) {
          counts[channel] = (counts[channel] || 0) + 1;
        }
      });

      setUnreadByChannel(counts);
    } catch {
      // Silent fallback when schema is incomplete.
    }
  }, [botPrivateChannelId, currentUser, toDisplayChannelId]);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const allQuery = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (!allQuery.error && allQuery.data) {
        const filtered = (allQuery.data as Message[])
          .filter((m) => {
            const rawChannel = m.channel || 'Direction Générale';
            if (typeof rawChannel === 'string' && rawChannel.startsWith('AGTA BOT::')) {
              return rawChannel === botPrivateChannelId;
            }
            return true;
          })
          .map((m) => normalizeMessageForUi(m));
        setMessages(filtered);
      } else {
        const localMsgs = localStorage.getItem('agta_messages_cache');
        const parsed = localMsgs ? (JSON.parse(localMsgs) as Message[]) : [];
        const normalized = parsed
          .filter((m) => {
            const rawChannel = m.channel || 'Direction Générale';
            if (typeof rawChannel === 'string' && rawChannel.startsWith('AGTA BOT::')) {
              return rawChannel === botPrivateChannelId;
            }
            return true;
          })
          .map((m) => normalizeMessageForUi(m));
        setMessages(normalized);
      }
    } catch (err) {
      console.error('Message fetch error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [botPrivateChannelId, normalizeMessageForUi]);

  const createPeer = useCallback((targetUser: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.relay.metered.ca:80' },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:global.relay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
    });

    pc.onicecandidate = async (event) => {
      if (!event.candidate) return;
      await insertCallSignals([
        {
          channel: selectedChannel,
          from_user: callUser,
          to_user: resolveSignalTarget(targetUser),
          signal_type: 'ice',
          payload: event.candidate.toJSON(),
        },
      ]);
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current
          .play()
          .catch(() => {
            // Browser may block autoplay until user gesture.
          });
      }
    };

    peerRef.current = pc;
    return pc;
  }, [callUser, selectedChannel]);

  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsMicMuted(false);
    setIsCamOff(false);
  };

  const endCall = useCallback(async (sendSignal = true, forcedStatus?: CallHistoryItem['status']) => {
    const activePeers = Object.keys(peerMapRef.current);
    if (sendSignal) {
      if (activePeers.length > 0) {
        await insertCallSignals(
          activePeers.map((peer) => ({
            channel: selectedChannel,
            from_user: callUser,
            to_user: resolveSignalTarget(peer),
            signal_type: 'end',
            payload: {},
          }))
        );
      } else {
        await insertCallSignals([
          {
            channel: selectedChannel,
            from_user: callUser,
            to_user: null,
            signal_type: 'end',
            payload: {},
          },
        ]);
      }
    }

    const startedAt = callStartedAtRef.current;
    const duration = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
    const status: CallHistoryItem['status'] = forcedStatus || (duration > 0 ? 'completed' : 'cancelled');
    await logCallEvent(status, callType, incomingFrom || defaultPeer, duration);

    peerRef.current?.close();
    Object.values(peerMapRef.current).forEach((pc) => pc.close());
    peerMapRef.current = {};
    peerRef.current = null;
    stopRingtone();
    if (incomingTimeoutRef.current) {
      window.clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }
    if (outgoingTimeoutRef.current) {
      window.clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = null;
    }
    callStartedAtRef.current = null;
    stopMedia();
    setCallState('idle');
    setIncomingFrom('');
    setIncomingOffer(null);
  }, [callType, callUser, incomingFrom, logCallEvent, selectedChannel, stopRingtone]);

  const startCall = async (type: CallType, targets?: string[]) => {
    try {
      setCallError('');
      setCallType(type);
      setCallState('calling');

      const peers = targets && targets.length > 0 ? targets : [defaultPeer];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      for (const peerName of peers) {
        const pc = createPeer(peerName);
        peerMapRef.current[peerName] = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await insertCallSignals([
          {
            channel: selectedChannel,
            from_user: callUser,
            to_user: resolveSignalTarget(peerName),
            signal_type: 'offer',
            payload: {
              sdp: offer,
              callType: type,
            },
          },
        ]);
      }

      playRingtone();
      if (outgoingTimeoutRef.current) window.clearTimeout(outgoingTimeoutRef.current);
      outgoingTimeoutRef.current = window.setTimeout(async () => {
        try {
          await insertCallSignals([
            {
              channel: selectedChannel,
              from_user: callUser,
              to_user: null,
              signal_type: 'end',
              payload: { reason: 'no-answer-timeout' },
            },
          ]);
        } catch {
          // Ignore timeout cleanup signal failure.
        }
        await logCallEvent('missed', type, peers.join(', '), 0);
        endCall(false, 'missed');
      }, 30000);
    } catch (error: any) {
      setCallError(error?.message || 'Appel impossible: signalisation indisponible.');
      setCallState('idle');
      stopMedia();
      stopRingtone();
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingOffer) return;

    try {
      setCallError('');
      const type = (incomingOffer as any).callType === 'video' ? 'video' : 'audio';
      setCallType(type);
      setCallState('in-call');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(incomingFrom || defaultPeer);
      peerMapRef.current[incomingFrom || defaultPeer] = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const safeOffer = {
        type: (incomingOffer as any).type,
        sdp: (incomingOffer as any).sdp,
      } as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(new RTCSessionDescription(safeOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await insertCallSignals([
        {
          channel: selectedChannel,
          from_user: callUser,
          to_user: incomingFrom || defaultPeer,
          signal_type: 'answer',
          payload: answer,
        },
      ]);

      stopRingtone();
      if (incomingTimeoutRef.current) {
        window.clearTimeout(incomingTimeoutRef.current);
        incomingTimeoutRef.current = null;
      }
      callStartedAtRef.current = Date.now();
      setIncomingOffer(null);
      setIncomingFrom('');
    } catch (error: any) {
      setCallError(error?.message || 'Impossible d\'accepter l\'appel.');
      endCall(false);
    }
  };

  const rejectIncomingCall = async () => {
    try {
      await insertCallSignals([
        {
          channel: selectedChannel,
          from_user: callUser,
          to_user: incomingFrom || defaultPeer,
          signal_type: 'reject',
          payload: {},
        },
      ]);
    } catch {
      // Ignore reject signaling errors.
    }

    await logCallEvent('rejected', callType, incomingFrom || defaultPeer, 0);
    stopRingtone();
    if (incomingTimeoutRef.current) {
      window.clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }

    setCallState('idle');
    setIncomingFrom('');
    setIncomingOffer(null);
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMicMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMicMuted(next);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCamOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsCamOff(next);
  };
  useEffect(() => {
    fetchMessages();
    fetchUnreadCounts();
    fetchCallHistory();
    fetchViewOnceReceipts();
    fetchPresence();
    fetchChatProfiles();
    fetchNotifications();
    fetchActionTimeline();
    void publishPresence(true);

    const msgChannel = supabase
      .channel(`messages-changes-${selectedStorageChannelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          lastRealtimeAtRef.current = Date.now();
          const rawChannel = (newMsg.channel || 'Direction Générale') as string;
          if (rawChannel.startsWith('AGTA BOT::') && rawChannel !== botPrivateChannelId) {
            return;
          }
          if (!newMsg.channel || rawChannel === selectedStorageChannelId) {
            const uiMsg = normalizeMessageForUi(newMsg);
            setMessages((prev) => (prev.find((m) => m.id === uiMsg.id) ? prev : [...prev, uiMsg]));

            const isMine = newMsg.sender_name === currentUser;
            if (!isMine && !notifiedMessageIdsRef.current.has(String(newMsg.id))) {
              notifiedMessageIdsRef.current.add(String(newMsg.id));
              const prefix = (newMsg.priority || 'low') === 'high' ? '[HIGH] ' : '';
              showBrowserNotification(
                `${prefix}${newMsg.sender_name} - ${selectedChannel}`,
                (newMsg.content || '').slice(0, 120)
              );
            }
          }
        }

        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Message;
          lastRealtimeAtRef.current = Date.now();
          const rawChannel = (updated.channel || 'Direction Générale') as string;
          if (rawChannel.startsWith('AGTA BOT::') && rawChannel !== botPrivateChannelId) {
            return;
          }
          const uiUpdated = normalizeMessageForUi(updated);
          setMessages((prev) => prev.map((m) => (m.id === uiUpdated.id ? uiUpdated : m)));
        }

        fetchUnreadCounts();
        void fetchMessages(true);
      })
      .subscribe();

    const callChannel = supabase
      .channel(`call-signals-${selectedChannel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals' }, async (payload: any) => {
        const signal = payload.new as any;
        const signalCreatedAt = signal?.created_at ? new Date(signal.created_at).getTime() : Date.now();
        if (Number.isFinite(signalCreatedAt) && Date.now() - signalCreatedAt > CALL_SIGNAL_TTL_MS) return;
        if (signal.channel !== selectedChannel) return;
        if (signal.from_user === callUser) return;
        if (signal.to_user && signal.to_user !== callUser && signal.to_user !== currentUser) return;

        if (signal.signal_type === 'offer') {
          setIncomingFrom(signal.from_user);
          const sdp = signal.payload?.sdp || signal.payload;
          if (sdp) {
            (sdp as any).callType = signal.payload?.callType || 'audio';
            setIncomingOffer(sdp);
            setCallState('incoming');
            playRingtone();

            if (incomingTimeoutRef.current) window.clearTimeout(incomingTimeoutRef.current);
            incomingTimeoutRef.current = window.setTimeout(async () => {
              try {
                await insertCallSignals([
                  {
                    channel: selectedChannel,
                    from_user: callUser,
                    to_user: signal.from_user,
                    signal_type: 'reject',
                    payload: { reason: 'timeout' },
                  },
                ]);
              } catch {
                // Ignore timeout signaling errors.
              }
              await logCallEvent('missed', (sdp as any).callType || 'audio', signal.from_user, 0);
              stopRingtone();
              setCallState('idle');
              setIncomingFrom('');
              setIncomingOffer(null);
            }, 30000);
          }
        }

        if (signal.signal_type === 'answer' && peerRef.current) {
          const pc = peerMapRef.current[signal.from_user] || peerRef.current;
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          setCallState('in-call');
          stopRingtone();
          if (outgoingTimeoutRef.current) {
            window.clearTimeout(outgoingTimeoutRef.current);
            outgoingTimeoutRef.current = null;
          }
          callStartedAtRef.current = Date.now();
        }

        if (signal.signal_type === 'ice' && peerRef.current) {
          try {
            const pc = peerMapRef.current[signal.from_user] || peerRef.current;
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch {
            // Ignore invalid ICE candidate
          }
        }

        if (signal.signal_type === 'end' || signal.signal_type === 'reject') {
          stopRingtone();
          endCall(false);
        }
      })
      .subscribe();

    const presenceChannel = supabase
      .channel(`presence-${selectedChannel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_presence' }, () => {
        void fetchPresence();
      })
      .subscribe();

    const profileChannel = supabase
      .channel('chat-user-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_user_profiles' }, () => {
        void fetchChatProfiles();
      })
      .subscribe();

    const notificationChannel = supabase
      .channel(`notifications-${selectedChannel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_notifications' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const notif = payload.new as MessageNotification;
          if (notif.recipient === currentUser && !notif.is_read) {
            showBrowserNotification(notif.title || 'Nouvelle notification', notif.body || 'Action requise');
          }
        }
        void fetchNotifications();
      })
      .subscribe();

    const timelineChannel = supabase
      .channel(`timeline-${selectedChannel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_actions' }, () => {
        void fetchActionTimeline();
      })
      .subscribe();

    const storiesChannel = storiesBackendAvailable
      ? supabase
          .channel(`stories-realtime-${currentStoryOwnerKey}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
            void fetchStories();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'story_views' }, () => {
            void fetchStories();
          })
          .subscribe()
      : null;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(callChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(timelineChannel);
      if (storiesChannel) supabase.removeChannel(storiesChannel);
      stopRingtone();
      if (incomingTimeoutRef.current) window.clearTimeout(incomingTimeoutRef.current);
      if (outgoingTimeoutRef.current) window.clearTimeout(outgoingTimeoutRef.current);
      void publishPresence(false);
    };
  }, [
    callUser,
    fetchMessages,
    fetchUnreadCounts,
    fetchCallHistory,
    fetchViewOnceReceipts,
    selectedChannel,
    selectedStorageChannelId,
    botPrivateChannelId,
    normalizeMessageForUi,
    createPeer,
    endCall,
    logCallEvent,
    playRingtone,
    stopRingtone,
    fetchPresence,
    fetchChatProfiles,
    fetchNotifications,
    fetchActionTimeline,
    fetchStories,
    publishPresence,
    currentUser,
    currentStoryOwnerKey,
    storiesBackendAvailable,
    showBrowserNotification,
  ]);

  useEffect(() => {
    const poll = () => {
      void fetchUnreadCounts();
      void fetchPresence();
      void publishPresence(true);

      const realtimeIsStale = Date.now() - lastRealtimeAtRef.current > REALTIME_STALE_MS;
      if (realtimeIsStale || document.hidden) {
        void fetchMessages(true);
      }

      const now = Date.now();
      const pending = messages
        .filter((m) => m.sender_name === currentUser && (m.priority || 'low') === 'high')
        .filter((m) => now - new Date(m.created_at).getTime() > 20 * 60 * 1000)
        .filter((m) => !messages.some((other) => other.sender_name !== currentUser && new Date(other.created_at).getTime() > new Date(m.created_at).getTime()));

      pending.slice(0, 1).forEach((m) => {
        const key = `agta_reminder_sent_${m.id}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          void pushNotification(currentUser, 'reminder', 'Relance recommandee', `Aucune reponse sur le message prioritaire: ${m.content.slice(0, 80)}`, m.id, m.channel);
        }
      });
    };

    poll();
    const interval = document.hidden ? POLL_INTERVAL_HIDDEN_MS : POLL_INTERVAL_ACTIVE_MS;
    const pollId = window.setInterval(poll, interval);

    const handleVisibility = () => {
      if (!document.hidden) {
        void fetchUnreadCounts();
        void fetchPresence();
        void publishPresence(true);
        if (Date.now() - lastRealtimeAtRef.current > REALTIME_STALE_MS) {
          void fetchMessages(true);
        }
      }
    };

    const handleBeforeUnload = () => {
      void publishPresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fetchMessages, fetchUnreadCounts, fetchPresence, publishPresence, messages, currentUser, pushNotification]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!userScrolledUpRef.current || isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [visibleMessages]);

  // Reset scroll lock when channel changes — always jump to bottom
  useEffect(() => {
    userScrolledUpRef.current = false;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
  }, [selectedChannel]);

  useEffect(() => {
    setNewMessage(draftsByChannel[selectedChannel] || '');
  }, [selectedChannel, draftsByChannel]);

  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem('agta_messages_cache', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const markIncomingAsRead = async () => {
      const incomingUnreadIds = visibleMessages
        .filter((m) => m.sender_name !== currentUser && (m.status || 'sent') !== 'read')
        .map((m) => m.id);
        // Exclure les IDs optimistes (bot-xxx) qui ne sont pas encore en base
        const realIds = incomingUnreadIds
          .filter((id): id is string => typeof id === 'string')
          .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

        if (realIds.length === 0) return;

      await supabase
        .from('messages')
          .update({ status: 'read' })
          .in('id', realIds);
      fetchUnreadCounts();
    };

    markIncomingAsRead();
  }, [visibleMessages, fetchUnreadCounts]);

  const markChannelRead = useCallback(async (channelId: string) => {
    const storageChannel = toStorageChannelId(channelId);
    await supabase
      .from('messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('channel', storageChannel)
      .neq('sender_name', currentUser)
      .neq('status', 'read');
    fetchUnreadCounts();
  }, [toStorageChannelId, currentUser, fetchUnreadCounts]);

  const uploadAttachment = async (file: File): Promise<{ url: string; name: string; type: string }> => {
    const fileName = `messages/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    let uploadedPath = '';
    let uploadedBucket = '';
    let uploadError: any = null;

    for (const bucket of WRITE_BUCKET_CANDIDATES) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      if (!error && data?.path) {
        uploadedPath = data.path;
        uploadedBucket = bucket;
        uploadError = null;
        break;
      }

      uploadError = error;
    }

    if (!uploadedPath || !uploadedBucket) {
      throw uploadError || new Error('Upload failed');
    }

    const { data: publicData } = supabase.storage.from(uploadedBucket).getPublicUrl(uploadedPath);
    const publicUrl = publicData.publicUrl || '';

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    if (file.type.startsWith('audio/')) type = 'audio';

    return { url: publicUrl || `${uploadedBucket}/${uploadedPath}`, name: file.name, type };
  };

  const tryInsertMessage = async (payload: SendPayload): Promise<Message | null> => {
    const fullTry = await supabase.from('messages').insert([payload]).select();
    if (!fullTry.error && fullTry.data && fullTry.data.length > 0) {
      return fullTry.data[0] as Message;
    }

    const minimalPayload: SendPayload = {
      content: payload.content,
      sender_name: payload.sender_name,
      status: payload.status,
      channel: payload.channel,
    };

    const fallbackTry = await supabase.from('messages').insert([minimalPayload]).select();
    if (!fallbackTry.error && fallbackTry.data && fallbackTry.data.length > 0) {
      return fallbackTry.data[0] as Message;
    }

    const fallbackError: any = fullTry.error || fallbackTry.error;
    const status = Number(fallbackError?.status || 0);
    const retryable = !navigator.onLine || status === 0 || status === 408 || status === 429 || status >= 500;
    if (retryable) {
      enqueueOfflineInsert('messages', payload as Record<string, any>);
      return null;
    }

    return null;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    const targetChannel = attachedFile
      ? (attachmentTargetChannel || selectedChannel || attachmentTargetOptions[0]?.id || '')
      : selectedChannel;

    if (!targetChannel) return;
    const storageTargetChannel = toStorageChannelId(targetChannel);

    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const text = newMessage.trim();
    const mentions = extractMentions(text);
    const contextMeta = getSelectedContext();

    let translatedContent: Record<string, string> = {};
    if (text) {
      const langTargets: Array<'fr' | 'en' | 'es' | 'ln'> = ['fr', 'en', 'es', 'ln'];
      await Promise.all(langTargets.map(async (lang) => {
        translatedContent[lang] = await translateText(text, 'fr', lang);
      }));
    }

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let messageType = 'text';

    if (attachedFile) {
      try {
        const uploaded = await uploadAttachment(attachedFile);
        attachmentUrl = uploaded.url;
        attachmentName = uploaded.name;
        messageType = uploaded.type;
      } catch {
        attachmentName = attachedFile.name;
        messageType = 'file';
      }
    }

    const optimistic: Message = {
      id: tempId,
      content: text || `[Fichier] ${attachmentName || attachedFile?.name || 'Piece jointe'}`,
      sender_name: currentUser,
      sender_role: 'staff',
      channel: targetChannel,
      status: 'sent',
      message_type: messageType,
      attachment_url: attachmentUrl || undefined,
      attachment_name: attachmentName || undefined,
      reply_to_id: replyTo?.id || undefined,
      reactions: {},
      context_type: contextMeta.context_type,
      context_id: contextMeta.context_id,
      context_label: contextMeta.context_label,
      priority,
      mentions,
      translated_content: translatedContent,
      created_at: now,
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    typingPublishedRef.current = false;
    publishTyping(false);
    setDraftsByChannel((prev) => ({ ...prev, [targetChannel]: '' }));
    setAttachedFile(null);
    setAttachmentTargetChannel('');
    setReplyTo(null);

    try {
      const payload: SendPayload = {
        content: optimistic.content,
        sender_name: currentUser,
        sender_role: 'staff',
        channel: storageTargetChannel,
        status: 'sent',
        message_type: messageType,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        reply_to_id: optimistic.reply_to_id != null ? String(optimistic.reply_to_id) : null,
        view_once: false,
        context_type: contextMeta.context_type,
        context_id: contextMeta.context_id,
        context_label: contextMeta.context_label,
        priority,
        mentions,
        translated_content: translatedContent,
      };

      const created = await tryInsertMessage(payload);

      if (!created) {
        setPriority('low');
        return;
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? normalizeMessageForUi(created) : m)));

      if (priority === 'high') {
        const recipients = participantOptions.filter((p) => p !== currentUser);
        for (const recipient of recipients) {
          await pushNotification(
            recipient,
            'priority',
            'Message haute priorite',
            `${currentUser}: ${optimistic.content.slice(0, 90)}`,
            created.id,
            targetChannel
          );
        }
      }

      for (const mention of mentions) {
        await pushNotification(
          mention,
          'mention',
          'Vous etes mentionne',
          `${currentUser} vous a mentionne dans ${targetChannel}`,
          created.id,
          targetChannel
        );
      }

      const shouldTriggerBot =
        botEnabled &&
        Boolean(text) &&
        (targetChannel === 'AGTA BOT' || /(^|\s)@bot\b/i.test(text));

      if (shouldTriggerBot) {
        const botPrompt = targetChannel === 'AGTA BOT'
          ? text
          : text.replace(/(^|\s)@bot\b/gi, ' ').trim() || text;
        const botContent = await generateBotReply(
          botPrompt,
          contextMeta.context_label || 'ce contexte',
          targetChannel
        );
        const optimisticBotId = `bot-${crypto.randomUUID()}`;
        const optimisticBot: Message = {
          id: optimisticBotId,
          content: botContent,
          sender_name: 'AGTA BOT',
          sender_role: 'assistant',
          channel: 'AGTA BOT',
          status: 'sent',
          message_type: 'text',
          context_type: contextMeta.context_type,
          context_id: contextMeta.context_id,
          context_label: contextMeta.context_label,
          priority: 'low',
          mentions: [],
          translated_content: { fr: botContent },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticBot]);

        const botMessage: SendPayload = {
          content: botContent,
          sender_name: 'AGTA BOT',
          sender_role: 'assistant',
          channel: botPrivateChannelId,
          status: 'sent',
          message_type: 'text',
          context_type: contextMeta.context_type,
          context_id: contextMeta.context_id,
          context_label: contextMeta.context_label,
          priority: 'low',
          mentions: [],
          translated_content: {
            fr: botContent,
          },
        };
        const createdBot = await tryInsertMessage(botMessage);
        if (createdBot) {
          setMessages((prev) => prev.map((m) => {
            if (m.id !== optimisticBotId) return m;
            const normalized = normalizeMessageForUi(createdBot);
            const optimisticLen = String(m.content || '').length;
            const persistedLen = String(normalized.content || '').length;
            return persistedLen >= optimisticLen ? normalized : { ...normalized, content: m.content };
          }));
          if (targetChannel === 'AGTA BOT') {
            await markChannelRead('AGTA BOT');
          }
        }
      }

      if (targetChannel !== selectedChannel) {
        setSelectedChannel(targetChannel);
        setShowChannelsMobile(false);
      }

      setTimeout(async () => {
        await supabase
          .from('messages')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', created.id);
      }, 700);

      setPriority('low');

    } catch {
      // Local fallback already optimistic in UI.
    }
  };

  const sendSticker = async (sticker: { name: string; icon: string }) => {
    setShowEmojiPicker(false);

    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = `${sticker.icon} ${sticker.name}`;

    const optimistic: Message = {
      id: tempId,
      content,
      sender_name: currentUser,
      sender_role: 'staff',
      channel: selectedChannel,
      status: 'sent',
      message_type: 'sticker',
      created_at: now,
    };

    setMessages((prev) => [...prev, optimistic]);

    const created = await tryInsertMessage({
      content,
      sender_name: currentUser,
      sender_role: 'staff',
      channel: selectedStorageChannelId,
      status: 'sent',
      message_type: 'sticker',
    });

    if (created) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? normalizeMessageForUi(created) : m)));
      setTimeout(async () => {
        await supabase
          .from('messages')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('id', created.id);
      }, 700);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceRecording = async () => {
    if (!isRecordingVoice) {
      try {
        setVoiceError('');

        const hasPermission = await requestMicPermission();
        if (!hasPermission) {
          return;
        }

        if (typeof MediaRecorder === 'undefined') {
          setVoiceError('Audio non supporte sur ce navigateur. Essayez Chrome/Edge recents.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioConfig = getSupportedAudioConfig();
        const recorder = audioConfig.mimeType
          ? new MediaRecorder(stream, { mimeType: audioConfig.mimeType })
          : new MediaRecorder(stream);
        transcriptRef.current = '';

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          const recognition = new SR();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'fr-FR';
          recognition.onresult = (event: any) => {
            let finalText = '';
            for (let i = 0; i < event.results.length; i += 1) {
              if (event.results[i].isFinal) {
                finalText += `${event.results[i][0].transcript} `;
              }
            }
            if (finalText.trim()) {
              transcriptRef.current = `${transcriptRef.current} ${finalText}`.trim();
            }
          };
          recognition.onerror = () => {
            // ignore
          };
          recognitionRef.current = recognition;
          try {
            recognition.start();
          } catch {
            // Keep audio recording active even if transcription service cannot start.
            recognitionRef.current = null;
          }
        }

        voiceChunksRef.current = [];
        recorderStreamRef.current = stream;
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            voiceChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const blobType = audioConfig.mimeType || 'audio/webm';
          const blob = new Blob(voiceChunksRef.current, { type: blobType });
          if (blob.size === 0) {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              content: '[Erreur audio: enregistrement vide]',
              sender_name: currentUser,
              sender_role: 'staff',
              channel: selectedChannel,
              status: 'failed',
              message_type: 'text',
              created_at: new Date().toISOString(),
            }]);
            recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
            recognitionRef.current?.stop?.();
            recognitionRef.current = null;
            recorderStreamRef.current = null;
            recorderRef.current = null;
            voiceChunksRef.current = [];
            transcriptRef.current = '';
            setIsRecordingVoice(false);
            return;
          }
          const file = new File([blob], `voice_${Date.now()}.${audioConfig.ext}`, { type: blobType });

          // Auto-envoi du vocal apres stop enregistrement
          const tempId = crypto.randomUUID();
          const now = new Date().toISOString();
          const voiceName = file.name;
          const transcript = transcriptRef.current.trim();
          const voiceContent = transcript ? `[Message vocal]\nTranscription: ${transcript}` : '[Message vocal]';
          const optimistic: Message = {
            id: tempId,
            content: voiceContent,
            sender_name: currentUser,
            sender_role: 'staff',
            channel: selectedChannel,
            status: 'sent',
            message_type: 'audio',
            attachment_url: '',
            attachment_name: voiceName,
            view_once: false,
            created_at: now,
          };

          setMessages((prev) => [...prev, optimistic]);

          try {
            const uploaded = await uploadAttachment(file);
            const created = await tryInsertMessage({
              content: voiceContent,
              sender_name: currentUser,
              sender_role: 'staff',
              channel: selectedStorageChannelId,
              status: 'sent',
              message_type: 'audio',
              attachment_url: uploaded.url,
              attachment_name: uploaded.name,
              view_once: false,
            });

            if (created) {
              setMessages((prev) => prev.map((m) => (m.id === tempId ? normalizeMessageForUi(created) : m)));
              setTimeout(async () => {
                await supabase
                  .from('messages')
                  .update({ status: 'delivered', delivered_at: new Date().toISOString() })
                  .eq('id', created.id);
              }, 700);
            }
          } catch (err) {
            console.error('Audio message send error:', err);
            // Update optimistic with error state
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, content: '[Erreur envoi audio]', status: 'failed' as any } : m)));
          }

          recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
          recognitionRef.current?.stop?.();
          recognitionRef.current = null;
          recorderStreamRef.current = null;
          recorderRef.current = null;
          voiceChunksRef.current = [];
          transcriptRef.current = '';
          setIsRecordingVoice(false);
        };

        recorder.start(250);
        setIsRecordingVoice(true);
      } catch (error) {
        setVoiceError(getMicErrorMessage(error));
        setIsRecordingVoice(false);
      }
      return;
    }

    try {
      recorderRef.current?.requestData();
    } catch {
      // Ignore if requestData is not supported.
    }
    recorderRef.current?.stop();
    setVoiceError('');
  };

  const handleReaction = async (message: Message, emoji: string) => {
    const current = normalizeReactions(message.reactions);
    const next = { ...current, [currentUser]: emoji };

    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions: next } : m)));

    await supabase.from('messages').update({ reactions: next }).eq('id', message.id);
  };

  const handleDelete = async (message: Message) => {
    if (message.sender_name !== currentUser) return;
    if (!canDeleteForAll(message)) return;

    const softDeleted = {
      ...message,
      content: 'Ce message a ete supprime',
      deleted_at: new Date().toISOString(),
    };

    setMessages((prev) => prev.map((m) => (m.id === message.id ? softDeleted : m)));

    await supabase
      .from('messages')
      .update({ content: 'Ce message a ete supprime', deleted_at: new Date().toISOString() })
      .eq('id', message.id);
  };

  const handleDeleteForMe = (message: Message) => {
    if (hiddenMessageIds.includes(message.id)) return;
    persistHiddenMessages([...hiddenMessageIds, message.id]);
  };

  const downloadAttachment = async (url: string, suggestedName?: string) => {
    const fallback = () => {
      const directLink = document.createElement('a');
      directLink.href = url;
      directLink.download = suggestedName || 'piece-jointe';
      directLink.rel = 'noreferrer';
      document.body.appendChild(directLink);
      directLink.click();
      document.body.removeChild(directLink);
    };

    try {
      const response = await fetch(url);
      if (!response.ok) {
        fallback();
        return;
      }

      const blob = await response.blob();
      const mime = blob.type || 'application/octet-stream';
      const extension = mime.startsWith('image/') ? `.${mime.split('/')[1] || 'jpg'}` : '';
      const fileName = suggestedName || `piece-jointe${extension}`;

      // On desktop, always trigger classic browser download (usually Downloads folder).
      // On mobile, allow share-sheet save flow when available.
      try {
        const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
        if (isMobileDevice && typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
          const file = new File([blob], fileName, { type: mime });
          const canShareFiles = (navigator as any).canShare?.({ files: [file] });
          if (canShareFiles) {
            await (navigator as any).share({ files: [file], title: fileName });
            return;
          }
        }
      } catch {
        // User canceled share sheet or browser blocked it; continue with download fallback.
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      fallback();
    }
  };

  const runMessageAction = async (action: string, message: Message) => {
    triggerHaptic();
    closeActionMenu();

    if (action === 'reply') {
      setReplyTo(message);
      return;
    }
    if (action === 'pin') {
      await togglePinned(message);
      return;
    }
    if (action === 'important') {
      await toggleImportant(message);
      return;
    }
    if (action === 'react-up') {
      await handleReaction(message, '👍');
      return;
    }
    if (action === 'react-fire') {
      await handleReaction(message, '🔥');
      return;
    }
    if (action === 'react-check') {
      await handleReaction(message, '✅');
      return;
    }
    if (action === 'timeline-task') {
      await createActionFromMessage(message, 'task');
      return;
    }
    if (action === 'timeline-reminder') {
      await createActionFromMessage(message, 'reminder');
      return;
    }
    if (action === 'timeline-calendar') {
      await createActionFromMessage(message, 'calendar');
      return;
    }
    if (action === 'translate') {
      await handleTranslateMessage(message);
      return;
    }
    if (action === 'download') {
      if (!message.attachment_url) return;
      await downloadAttachment(message.attachment_url, message.attachment_name || undefined);
      return;
    }
    if (action === 'delete-me') {
      handleDeleteForMe(message);
      return;
    }
    if (action === 'edit') {
      handleStartEdit(message);
      return;
    }
    if (action === 'delete-all') {
      await handleDelete(message);
    }
  };

  const handleStartEdit = (message: Message) => {
    if (!canEditMessage(message)) return;
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const handleSaveEdit = async (message: Message) => {
    if (!canEditMessage(message)) return;
    const updatedContent = editingText.trim();
    if (!updatedContent) return;

    setMessages((prev) => prev.map((m) => (
      m.id === message.id ? { ...m, content: updatedContent, edited_at: new Date().toISOString() } : m
    )));

    await supabase
      .from('messages')
      .update({ content: updatedContent, edited_at: new Date().toISOString() })
      .eq('id', message.id);

    setEditingMessageId(null);
    setEditingText('');
  };

  const togglePinned = async (message: Message) => {
    const next = !message.pinned;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, pinned: next } : m)));
    await supabase.from('messages').update({ pinned: next }).eq('id', message.id);
  };

  const toggleImportant = async (message: Message) => {
    const next = !message.important;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, important: next } : m)));
    await supabase.from('messages').update({ important: next }).eq('id', message.id);
  };

  const markAudioPlayedOnce = async (message: Message) => {
    if (!message.view_once) return;
    const map = normalizePlayedOnce(message.played_once_by);
    if (map[currentUserKey] || viewOncePlayedMap[String(message.id)]) return;

    const next = { ...map, [currentUserKey]: true };
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, played_once_by: next } : m)));
    await supabase.from('messages').update({ played_once_by: next }).eq('id', message.id);

    await supabase
      .from('message_audio_receipts')
      .upsert([
        {
          message_id: String(message.id),
          user_key: currentUserKey,
          played_at: new Date().toISOString(),
        },
      ], { onConflict: 'message_id,user_key' });

    setViewOncePlayedMap((prev) => ({ ...prev, [String(message.id)]: true }));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "AUJOURD'HUI";
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const renderMessageStatus = (status?: string) => {
    if (!status || status === 'sent') {
      return <Check size={12} className="text-zinc-400" />;
    }
    if (status === 'delivered') {
      return <CheckCheck size={12} className="text-zinc-400" />;
    }
    return <CheckCheck size={12} className="text-[#C7FF00]" />;
  };

  const handleTranslateMessage = async (message: Message) => {
    const existing = normalizeTranslations(message.translated_content);
    if (existing[translationTarget]) {
      setLiveTranslationMap((prev) => ({ ...prev, [String(message.id)]: existing[translationTarget] }));
      return;
    }

    const translated = await translateText(message.content, 'fr', translationTarget);
    setLiveTranslationMap((prev) => ({ ...prev, [String(message.id)]: translated }));

    const merged = { ...existing, [translationTarget]: translated };
    await supabase.from('messages').update({ translated_content: merged }).eq('id', message.id);
  };

  return (
    <div className="relative flex h-[88vh] overflow-hidden rounded-[28px] border border-[#26353d] bg-[#0b141a] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className={`${(showChannelsMobile || !selectedChannel) ? 'flex' : 'hidden'} md:flex w-full md:w-[34%] lg:w-[30%] xl:w-[28%] flex-col border-r border-[#26353d] bg-[#111b21] absolute md:static inset-0 z-30`}>
        <div className="px-5 pt-5 pb-4 border-b border-[#26353d] bg-[#111b21]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentUserAvatarUrl || resolveAvatarForName(currentUserProfileName || currentUser)}
                alt={currentUserProfileName || currentUser}
                className="w-12 h-12 rounded-full object-cover border border-[#314047]"
              />
              <div className="min-w-0">
                <p className="text-[30px] leading-none font-black tracking-tight text-white truncate">Discussions</p>
                <p className="mt-1 text-[11px] text-[#8696a0] truncate">{currentUserProfileName || currentUser}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChannelsMobile(false)}
                className="md:hidden w-10 h-10 rounded-full bg-[#202c33] text-[#d1d7db] flex items-center justify-center"
                title="Fermer"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-[#202c33] text-[#d1d7db] flex items-center justify-center"
                title="Envoyer image / Prendre photo"
              >
                <Camera size={18} />
              </button>
              <button
                onClick={() => {
                  fetchAllCallHistory();
                  setShowAllCallsModal(true);
                }}
                className="w-10 h-10 rounded-full bg-[#202c33] text-[#d1d7db] flex items-center justify-center"
                title="Voir tous les appels"
              >
                <Phone size={18} />
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAttachedFile(file);
                  if (file) {
                    setAttachmentTargetChannel(selectedChannel || conversationItems[0]?.id || '');
                  }
                  e.currentTarget.value = '';
                }}
              />
              <button
                onClick={() => setShowChannelsMobile(true)}
                className="w-10 h-10 rounded-full bg-[#25d366] text-[#0b141a] flex items-center justify-center md:hidden"
                title="Nouvelle discussion"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8696a0]" size={16} />
            <input
              type="text"
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-2xl bg-[#202c33] py-3 pl-12 pr-4 text-sm text-white placeholder:text-[#8696a0] outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'unread', label: `Non lues ${Object.values(unreadByChannel).reduce((sum, count) => sum + count, 0)}` },
              { id: 'favorites', label: 'Favoris' },
              { id: 'groups', label: 'Groupes' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setConversationFilter(filter.id as 'all' | 'unread' | 'favorites' | 'groups')}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${conversationFilter === filter.id ? 'bg-[#103529] text-[#d7fdd3]' : 'bg-[#202c33] text-[#d1d7db]'}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* === STORIES BAR === */}
        <div className="border-b border-[#26353d] bg-[#111b21]">
            <div className="flex items-center gap-3 px-3 py-2 overflow-x-auto [scrollbar-width:none]">
              {/* My status bubble */}
              <button
                onClick={() => setShowCreateStoryModal(true)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#202c33] border border-[#314047] flex items-center justify-center z-10">
                    <History size={10} className="text-[#53bdeb]" />
                  </div>
                  <img
                    src={currentUserAvatarUrl || resolveAvatarForName(currentUserProfileName || currentUser)}
                    alt="Mon statut"
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#314047]"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#25d366] border-2 border-[#111b21] flex items-center justify-center">
                    <Plus size={10} className="text-[#0b141a]" />
                  </div>
                </div>
                <span className="text-[10px] text-[#8696a0] w-14 truncate text-center">Mon statut</span>
              </button>

              <input
                ref={storyCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleStoryFilePick(e.target.files?.[0] || null);
                  e.currentTarget.value = '';
                  setShowCreateStoryModal(true);
                }}
              />
              <input
                ref={storyGalleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleStoryFilePick(e.target.files?.[0] || null);
                  e.currentTarget.value = '';
                  setShowCreateStoryModal(true);
                }}
              />

              {/* Contact stories */}
              {contactStories.map((story) => (
                <button
                  key={story.channel_id}
                  onClick={() => {
                    setActiveStory(story);
                    setActiveStoryItemIndex(0);
                    setStoryProgressKey((k) => k + 1);
                    setShowStoryViewer(true);
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <div className="relative">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#202c33] border border-[#314047] flex items-center justify-center z-10">
                      <History size={10} className="text-[#53bdeb]" />
                    </div>
                    <div className={`rounded-full p-0.5 ${story.has_unviewed ? 'bg-gradient-to-tr from-[#25d366] via-[#53bdeb] to-[#d366c7]' : 'bg-[#4a5568]'}`}>
                    <img src={story.avatar_url} alt={story.channel_name} className="w-13 h-13 rounded-full object-cover border-2 border-[#111b21] w-[52px] h-[52px]" />
                    </div>
                  </div>
                  <span className="text-[10px] text-[#e9edef] w-14 truncate text-center">{story.channel_name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

        <div className="px-3 py-2 border-b border-[#26353d]">
          <button
            onClick={() => {
              setShowArchivedOnly(!showArchivedOnly);
              if (!showArchivedOnly && selectedChannel && channelArchived[selectedChannel]) {
                setSelectedChannel('');
              }
            }}
            disabled={archivedConversationsCount === 0 && !showArchivedOnly}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 transition ${
              archivedConversationsCount > 0 || showArchivedOnly
                ? `${showArchivedOnly ? 'bg-[#103529] text-[#d7fdd3]' : 'hover:bg-[#202c33] text-[#d1d7db]'}`
                : 'opacity-60 cursor-not-allowed text-[#8696a0]'
            }`}
            title={archivedConversationsCount > 0 ? `${archivedConversationsCount} conversation(s) archivée(s)` : 'Aucune conversation archivée'}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                showArchivedOnly ? 'bg-[#25d366] text-[#0b141a]' : 'bg-[#202c33] text-[#8696a0]'
              }`}>
                <Archive size={18} />
              </div>
              <span className="text-lg font-semibold">Archivées</span>
            </div>
            <span className={`text-sm font-bold ${showArchivedOnly ? 'text-[#d7fdd3]' : 'text-[#8696a0]'}`}>
              {archivedConversationsCount}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#111b21]">
          {conversationItems.map((channel) => {
            const isSelected = selectedChannel === channel.id;
            const lastPreview = channel.lastMessage?.message_type === 'audio'
              ? 'Appel vocal / audio'
              : channel.lastMessage?.attachment_name
                ? `📎 ${channel.lastMessage.attachment_name}`
                : channel.lastMessage?.content || channel.description;

            return (
              <button
                key={channel.id}
                onClick={() => {
                  setSelectedChannel(channel.id);
                  setShowChannelsMobile(false);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Smart positioning: keep menu inside viewport
                  const menuW = 220;
                  const menuH = 360;
                  const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
                  const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
                  setMuteSubmenuOpen(false);
                  setConversationContextMenu({
                    open: true,
                    x,
                    y,
                    channel,
                  });
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#1f2c33] transition ${isSelected ? 'bg-[#202c33]' : 'hover:bg-[#182229]'}`}
              >
                {/* Avatar with story ring + online dot */}
                {(() => {
                  const story = contactStories.find((s) => s.channel_id === channel.id);
                  const presEntry = presenceByUser[channel.avatarLabel];
                  const isOnline = presEntry?.is_online || false;
                  const hasStory = !!story;
                  const hasUnviewed = story?.has_unviewed ?? false;
                  return (
                    <div className="relative flex-shrink-0">
                      <div
                        role={hasStory ? 'button' : undefined}
                        tabIndex={hasStory ? 0 : -1}
                        onClick={(e) => {
                          if (hasStory) {
                            e.stopPropagation();
                            setActiveStory(story!);
                            setActiveStoryItemIndex(0);
                            setStoryProgressKey((k) => k + 1);
                            setShowStoryViewer(true);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (!hasStory) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveStory(story!);
                            setActiveStoryItemIndex(0);
                            setStoryProgressKey((k) => k + 1);
                            setShowStoryViewer(true);
                          }
                        }}
                        className={`block rounded-full p-0.5 ${hasStory ? (hasUnviewed ? 'bg-gradient-to-tr from-[#25d366] via-[#53bdeb] to-[#d366c7]' : 'bg-[#4a5568]') : ''}`}
                        style={{ pointerEvents: hasStory ? 'auto' : 'none' }}
                      >
                        <img src={channel.avatarSrc} alt={channel.name} className="w-[48px] h-[48px] rounded-full object-cover border-2 border-[#111b21]" />
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#111b21]" />
                      )}
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className={`truncate text-[17px] font-bold ${isSelected ? 'text-white' : 'text-[#e9edef]'}`}>{channel.name}</p>
                    <span className={`shrink-0 text-xs ${channel.unread > 0 ? 'text-[#25d366]' : 'text-[#8696a0]'}`}>
                      {channel.lastMessage ? formatTime(channel.lastMessage.created_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-[#8696a0]">{lastPreview}</p>
                    {channel.unread > 0 && (
                      <span className="min-w-6 h-6 px-2 rounded-full bg-[#25d366] text-[#0b141a] text-xs font-black flex items-center justify-center">
                        {channel.unread > 99 ? '99+' : channel.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
          {conversationItems.length === 0 && showArchivedOnly && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-3">
                <Archive size={24} className="text-[#8696a0]" />
              </div>
              <p className="text-sm font-semibold text-[#e9edef]">Aucune discussion archivée</p>
              <p className="text-xs text-[#8696a0] mt-1">Les conversations que tu archives apparaîtront ici</p>
            </div>
          )}
          {conversationItems.length === 0 && !showArchivedOnly && channelSearch && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-[#8696a0]">Aucune discussion trouvée</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[#26353d] text-[#8696a0] text-xs flex items-center gap-2">
          <img
            src={currentUserAvatarUrl || resolveAvatarForName(currentUserProfileName || currentUser)}
            alt={currentUserProfileName || currentUser}
            className="w-7 h-7 rounded-full object-cover border border-[#314047]"
          />
          <span className="truncate">{currentUserEmail || 'session locale active'}</span>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col bg-[#0b141a] relative min-w-0"
        onContextMenu={(e) => {
          if (typeof window !== 'undefined' && window.innerWidth < 1280) return;
          const target = e.target as HTMLElement;
          if (target.closest('[data-message-bubble="true"]')) return;
          e.preventDefault();
          setShowInfoPanelDesktop(true);
        }}
      >
        {/* Placeholder WhatsApp-style quand aucune conversation n'est sélectionnée */}
        {!selectedChannel && (
          <div className="absolute inset-0 z-20 hidden md:flex flex-col items-center justify-center bg-[#0b141a] gap-6 select-none">
            <div className="w-24 h-24 rounded-full bg-[#202c33] flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C13 4 4 13 4 24c0 3.7 1 7.1 2.8 10L4 44l10.2-2.8C17 43 20.4 44 24 44c11 0 20-9 20-20S35 4 24 4z" fill="#314047"/>
                <path d="M34 28.5c-.2-.4-.7-.6-1.5-1-.8-.4-4.5-2.2-5.2-2.4-.7-.3-1.2-.4-1.7.4-.5.8-1.9 2.4-2.3 2.9-.4.5-.8.5-1.5.2-.8-.4-3.2-1.2-6.1-3.7-2.3-2-3.8-4.4-4.2-5.1-.5-.8 0-1.2.4-1.6.3-.3.8-.9 1.1-1.3.4-.4.5-.7.8-1.2.3-.5.1-1-.1-1.3-.2-.4-1.7-4.1-2.3-5.6-.6-1.5-1.2-1.3-1.7-1.3h-1.4c-.5 0-1.2.2-1.9.9C9.8 11.5 8 13.2 8 16.7s2.3 6.9 2.6 7.4c.3.5 4.5 6.9 10.9 9.6 1.5.7 2.7 1 3.6 1.3 1.5.5 2.9.4 4 .2 1.2-.2 3.7-1.5 4.2-3 .5-1.4.5-2.6.4-2.9z" fill="#8696a0"/>
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="text-[#e9edef] text-xl font-semibold">Sélectionnez une discussion</p>
              <p className="text-[#8696a0] text-sm max-w-xs">Choisissez une conversation dans la liste pour commencer à discuter</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#26353d] bg-[#202c33]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowChannelsMobile(true)}
              className="md:hidden w-10 h-10 rounded-full bg-[#111b21] text-[#d1d7db] flex items-center justify-center"
              title="Ouvrir les discussions"
            >
              <ChevronLeft size={18} />
            </button>
            <img
              src={selectedAvatarSrc}
              alt={selectedConversationName}
              className="w-11 h-11 rounded-full object-cover border border-[#314047] cursor-pointer"
              title="Voir le profil"
              onClick={() => {
                if (selectedConversationMeta) {
                  setSelectedContactForProfile(selectedConversationMeta);
                  setShowContactProfile(true);
                } else {
                  setShowInfoPanelDesktop(true);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectedConversationMeta) {
                  setSelectedContactForProfile(selectedConversationMeta);
                  setShowContactProfile(true);
                } else {
                  setShowInfoPanelDesktop(true);
                }
              }}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-[#e9edef]">{selectedConversationName}</p>
              <div className="flex items-center gap-1.5 h-4">
                {peerIsTyping ? (
                  <span className="text-xs text-[#25d366] flex items-center gap-1">
                    En train d'écrire
                    <span className="flex gap-0.5 items-end pb-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="block w-1 h-1 rounded-full bg-[#25d366]"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                  </span>
                ) : peerIsRecording ? (
                  <span className="text-xs text-[#25d366] flex items-center gap-1.5">
                    <motion.span
                      className="block w-2 h-2 rounded-full bg-[#25d366]"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    En train d'enregistrer…
                  </span>
                ) : (
                  <p className="truncate text-xs text-[#8696a0]">{conversationPresenceLabel}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#d1d7db]">
            <button onClick={() => startCall('audio')} className="w-10 h-10 rounded-full hover:bg-[#111b21] flex items-center justify-center" title="Appel vocal">
              <Phone size={18} />
            </button>
            <button onClick={() => startCall('video')} className="w-10 h-10 rounded-full hover:bg-[#111b21] flex items-center justify-center" title="Appel video">
              <Video size={18} />
            </button>
            <button onClick={() => setShowInfoPanelMobile(true)} className="xl:hidden w-10 h-10 rounded-full hover:bg-[#111b21] flex items-center justify-center" title="Infos discussion">
              <Info size={18} />
            </button>
            <button
              onClick={() => setShowInfoPanelDesktop((v) => !v)}
              className={`hidden xl:flex w-10 h-10 rounded-full items-center justify-center ${showInfoPanelDesktop ? 'bg-[#111b21]' : 'hover:bg-[#111b21]'}`}
              title="Options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            userScrolledUpRef.current = !isNearBottom;
          }}
          className="flex-1 overflow-y-auto px-3 py-4 md:px-6 space-y-3"
          style={{
            backgroundColor: '#0b141a',
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(rgba(11,20,26,0.96), rgba(11,20,26,0.96))',
            backgroundSize: '26px 26px, 32px 32px, auto',
          }}
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#8696a0]" size={24} />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8696a0]">Chargement...</span>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#202c33] rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={24} className="text-[#8696a0]" />
              </div>
              <p className="text-[#d1d7db] text-lg font-semibold">Aucun message</p>
              <p className="text-[#8696a0] text-sm mt-1">Envoyez le premier message</p>
            </div>
          ) : (
            <AnimatePresence>
              {visibleMessages.map((msg, index) => {
                const isMe = msg.sender_name === currentUser;
                const showDate =
                  index === 0 ||
                  new Date(msg.created_at).toDateString() !== new Date(visibleMessages[index - 1].created_at).toDateString();

                const replySource = msg.reply_to_id ? messageById[msg.reply_to_id] : null;
                const reactionCounts = groupedReactions(msg);
                const attachmentUrl = toPublicAttachmentUrl(msg.attachment_url);
                const playedMap = normalizePlayedOnce(msg.played_once_by);
                const alreadyPlayedOnce = Boolean(msg.view_once && (playedMap[currentUserKey] || viewOncePlayedMap[String(msg.id)]));

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="bg-zinc-100 text-zinc-500 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      data-message-bubble="true"
                      className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openActionMenu(msg, e.clientX, e.clientY);
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        if (!touch) return;
                        startLongPress(msg, touch.clientX, touch.clientY);
                      }}
                      onTouchEnd={stopLongPress}
                      onTouchMove={stopLongPress}
                    >
                      {!isMe && isSelectedChannelGroup && (
                        <img
                          src={getAvatarForName(msg.sender_name)}
                          alt={msg.sender_name}
                          className="w-8 h-8 rounded-full object-cover border border-[#314047] self-end mb-1 hidden md:block"
                        />
                      )}
                      <div className="max-w-[88%] md:max-w-[72%] group">
                        <div className={`px-3 py-2 rounded-2xl shadow-sm ${isMe ? 'bg-[#005c4b] text-white rounded-br-md' : 'bg-[#202c33] text-[#e9edef] rounded-bl-md'}`}>
                          {replySource && (
                            <div className={`mb-2 p-2 rounded-xl border-l-2 text-[10px] ${isMe ? 'bg-black/10 border-[#9be7c4]' : 'bg-black/10 border-[#53bdeb]'}`}>
                              <p className={`font-black ${isMe ? 'text-[#9be7c4]' : 'text-[#53bdeb]'}`}>{replySource.sender_name}</p>
                              <p className={`truncate opacity-80 ${isMe ? 'text-white' : 'text-[#d1d7db]'}`}>{replySource.content}</p>
                            </div>
                          )}

                          {isSelectedChannelGroup && !isMe && (
                          <p className={`text-[10px] font-black mb-1 text-[#53bdeb]`}>{msg.sender_name}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            {isSelectedChannelGroup && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isMe ? 'bg-black/10 text-zinc-100' : 'bg-black/10 text-[#d1d7db]'}`}>
                              {msg.context_label || 'Contexte general'}
                            </span>
                            )}
                            {(msg.priority || 'low') === 'high' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-black">HIGH</span>
                            )}
                            {normalizeMentions(msg.mentions).length > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-black flex items-center gap-1"><AtSign size={10} />{normalizeMentions(msg.mentions).length}</span>
                            )}
                          </div>

                          {msg.pinned && <p className="text-[10px] font-black text-amber-300 mb-1">EPINGLE</p>}
                          {msg.important && <p className="text-[10px] font-black text-red-300 mb-1">IMPORTANT</p>}

                          {editingMessageId === msg.id ? (
                            <div className="space-y-2">
                              <input
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full px-2 py-1 rounded text-xs text-black"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEdit(msg)} className="text-[10px] px-2 py-1 rounded bg-[#C7FF00] text-black font-black">Sauver</button>
                                <button onClick={() => { setEditingMessageId(null); setEditingText(''); }} className="text-[10px] px-2 py-1 rounded bg-zinc-200 text-black font-black">Annuler</button>
                              </div>
                            </div>
                          ) : msg.message_type === 'sticker' ? (
                            <p className="text-3xl leading-tight">{msg.content}</p>
                          ) : (
                            <p className={`text-sm font-medium leading-relaxed ${isMe ? 'text-white' : 'text-[#e9edef]'}`}>{msg.content}</p>
                          )}

                          {(() => {
                            const translated = liveTranslationMap[String(msg.id)] || normalizeTranslations(msg.translated_content)[translationTarget] || '';
                            const sameAsOriginal = translated.trim().toLowerCase() === (msg.content || '').trim().toLowerCase();
                            if (!translated || sameAsOriginal) return null;
                            return (
                              <p className={`text-[11px] mt-2 italic ${isMe ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                {translated}
                              </p>
                            );
                          })()}

                          {msg.edited_at && <p className={`text-[9px] opacity-60 mt-1 italic ${isMe ? 'text-white' : 'text-zinc-500'}`}>modifie</p>}

                          {msg.attachment_name && (
                            <div className={`mt-2 p-2 rounded-2xl text-xs ${isMe ? 'bg-black/10' : 'bg-black/10 border border-[#314047]'}`}>
                              {msg.message_type === 'image' && attachmentUrl ? (
                                <img src={attachmentUrl} alt={msg.attachment_name} className="max-h-44 rounded-lg mb-2" />
                              ) : null}

                              {msg.message_type === 'video' && attachmentUrl ? (
                                <video controls className="max-h-44 rounded-lg mb-2">
                                  <source src={attachmentUrl} />
                                </video>
                              ) : null}

                              {msg.message_type === 'audio' && attachmentUrl && !alreadyPlayedOnce ? (
                                <>
                                  <audio
                                    controls
                                    className="w-full mb-2"
                                    onLoadedMetadata={(e) => {
                                      const el = e.currentTarget;
                                      el.playbackRate = audioRates[String(msg.id)] || 1;
                                    }}
                                    onPlay={() => {
                                      markAudioPlayedOnce(msg);
                                    }}
                                  >
                                    <source src={attachmentUrl} />
                                  </audio>
                                  {!isMe && (
                                    <button
                                      onClick={() => cycleAudioRate(msg.id)}
                                      className="text-[10px] px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800"
                                    >
                                      {audioRates[String(msg.id)] || 1}x
                                    </button>
                                  )}
                                  {msg.view_once && <span className="ml-2 text-[10px] font-black text-amber-500">View once</span>}
                                </>
                              ) : null}

                              {msg.message_type === 'audio' && msg.view_once && alreadyPlayedOnce ? (
                                  <p className={`text-[10px] font-black ${isMe ? 'text-zinc-400' : 'text-zinc-500'}`}>Audio deja ecoute (View once)</p>
                                ) : msg.message_type === 'audio' && !attachmentUrl ? (
                                  <p className={`text-[10px] font-black ${isMe ? 'text-zinc-400' : 'text-zinc-500'}`}>🔄 Chargement audio...</p>
                              ) : null}

                              {attachmentUrl ? (
                                <a href={attachmentUrl} target="_blank" rel="noreferrer" className={`${isMe ? 'text-[#9be7c4]' : 'text-[#53bdeb]'} underline`}>
                                  {msg.attachment_name}
                                </a>
                              ) : (
                                <span>{msg.attachment_name} (upload indisponible)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {Object.keys(reactionCounts).length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <span key={emoji} className="text-[10px] px-2 py-0.5 rounded-full bg-[#202c33] border border-[#314047] text-[#d1d7db]">
                                {emoji} {count}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] font-medium text-[#8696a0]">{formatTime(msg.created_at)}</span>
                          {isMe && <span className="text-[10px]">{renderMessageStatus(msg.status)}</span>}
                          {msg.status === 'delivered' && msg.delivered_at && (
                            <span className="text-[10px] text-[#8696a0]">recu {formatTime(msg.delivered_at)}</span>
                          )}
                          {msg.status === 'read' && msg.read_at && (
                            <span className="text-[10px] text-[#53bdeb]">lu {formatTime(msg.read_at)}</span>
                          )}
                        </div>


                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div className="p-3 border-t border-[#26353d] bg-[#202c33]">
          {replyTo && (
            <div className="mb-2 p-2 rounded-2xl bg-[#111b21] border border-[#314047] flex items-center justify-between">
              <div className="text-xs">
                <p className="font-black text-[#53bdeb]">Reponse a {replyTo.sender_name}</p>
                <p className="text-[#8696a0] truncate max-w-[500px]">{replyTo.content}</p>
              </div>
              <button className="text-[#8696a0] hover:text-white text-xs" onClick={() => setReplyTo(null)}>
                Annuler
              </button>
            </div>
          )}

          {attachedFile && (
            <div className="mb-2 p-2 rounded-2xl bg-[#111b21] border border-[#314047] flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                {attachedImagePreview ? (
                  <img
                    src={attachedImagePreview}
                    alt={attachedFile.name}
                    className="w-14 h-14 rounded-xl object-cover border border-[#314047]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#202c33] border border-[#314047] flex items-center justify-center text-[#8696a0] text-[10px] font-black">
                    FILE
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-[#d1d7db] truncate max-w-[320px]">{attachedFile.name}</p>
                  <p className="text-[10px] text-[#8696a0]">Pret a envoyer</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[#8696a0]">Envoyer a</span>
                    <select
                      value={attachmentTargetChannel || selectedChannel || attachmentTargetOptions[0]?.id || ''}
                      onChange={(e) => setAttachmentTargetChannel(e.target.value)}
                      className="rounded-lg bg-[#202c33] border border-[#314047] px-2 py-1 text-[11px] text-[#d1d7db]"
                    >
                      {attachmentTargetOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button
                className="text-[#8696a0] hover:text-white text-xs"
                onClick={() => {
                  setAttachedFile(null);
                  setAttachmentTargetChannel('');
                }}
              >
                Retirer
              </button>
            </div>
          )}

          {showEmojiPicker && (
            <div className="mb-2 p-2 rounded-2xl bg-[#111b21] border border-[#314047]">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8696a0]">Emojis et stickers</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-[#202c33] border border-[#314047] text-[#d1d7db] hover:bg-[#26353d]"
                >
                  <X size={12} /> Retour
                </button>
              </div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-[#8696a0]">Emojis</div>
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewMessage((prev) => prev + emoji)}
                    className="text-xl p-1 rounded hover:bg-[#202c33] shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-2 text-[10px] font-black uppercase tracking-wider text-[#8696a0]">Stickers</div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker.name}
                    onClick={() => sendSticker(sticker)}
                    className="p-2 rounded border border-[#314047] bg-[#202c33] hover:bg-[#26353d] text-center text-[#d1d7db] shrink-0 min-w-[82px]"
                  >
                    <div className="text-2xl">{sticker.icon}</div>
                    <div className="text-[10px] font-black mt-1">{sticker.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 bg-[#111b21] rounded-full px-3 py-2 border border-[#314047] focus-within:border-[#25d366] transition-colors relative">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAttachedFile(file);
                if (file) {
                  setAttachmentTargetChannel(selectedChannel || conversationItems[0]?.id || '');
                }
              }}
            />

            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-[#d1d7db] hover:bg-[#202c33] transition" title="Joindre un fichier">
              <Paperclip size={14} />
            </button>

            <button
              onClick={() => {
                setShowEmojiPicker((s) => !s);
              }}
              className="p-2 rounded-full text-[#d1d7db] hover:bg-[#202c33] transition"
              title="Emojis et stickers"
            >
              <Smile size={14} />
            </button>

            <button
              onClick={toggleVoiceRecording}
              className={`p-2 rounded-full transition ${isRecordingVoice ? 'bg-red-500 text-white' : 'text-[#d1d7db] hover:bg-[#202c33]'}`}
              title={isRecordingVoice ? 'Stop enregistrement vocal' : 'Enregistrer message vocal'}
            >
              {isRecordingVoice ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <button
              onClick={() => setPriority((p) => (p === 'low' ? 'high' : 'low'))}
              className={`p-2 rounded-full transition ${priority === 'high' ? 'bg-red-500 text-white' : 'text-[#d1d7db] hover:bg-[#202c33]'}`}
              title="Priorite message"
            >
              {priority === 'high' ? <BellRing size={14} /> : <Bell size={14} />}
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                const value = e.target.value;
                setNewMessage(value);
                setDraftsByChannel((prev) => ({ ...prev, [selectedChannel]: value }));
                // Broadcast typing indicator
                if (value.trim() && !typingPublishedRef.current) {
                  typingPublishedRef.current = true;
                  publishTyping(true);
                }
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  typingPublishedRef.current = false;
                  publishTyping(false);
                }, 3000);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Entrez un message"
              className="flex-1 bg-transparent outline-none text-sm font-medium text-white placeholder:text-[#8696a0]"
            />

            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && !attachedFile}
              className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                newMessage.trim() || attachedFile ? 'bg-[#25d366] text-[#0b141a]' : 'bg-[#314047] text-[#8696a0] cursor-not-allowed'
              }`}
            >
              <Send size={14} />
            </button>
          </div>

          {voiceError && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-bold text-red-300">{voiceError}</p>
              <button
                onClick={() => void handleRequestMicAccess()}
                className="text-[10px] px-2 py-1 rounded-full bg-[#25d366] text-[#0b141a] hover:opacity-90"
              >
                Demander acces micro
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`${showInfoPanelDesktop ? 'hidden xl:flex' : 'hidden'} w-[320px] shrink-0 flex-col border-l border-[#26353d] bg-[#111b21]`}>
        <div className="px-6 py-5 border-b border-[#26353d] flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8696a0]">Infos discussion</p>
          <button onClick={() => setShowInfoPanelDesktop(false)} className="w-9 h-9 rounded-full hover:bg-[#202c33] text-[#d1d7db] flex items-center justify-center" title="Fermer">
            <MoreVertical size={18} />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto space-y-6">
          <div className="flex flex-col items-center text-center">
            <img src={selectedAvatarSrc} alt={selectedConversationName} className="w-24 h-24 rounded-full object-cover border border-[#314047] mb-4" />
            <p className="text-xl font-bold text-white">{selectedConversationName}</p>
            <p className="text-sm text-[#8696a0] mt-1">{selectedConversationDescription}</p>
            <p className="text-xs text-[#53bdeb] mt-2">{conversationPresenceLabel === 'en ligne' ? 'En ligne maintenant' : conversationPresenceLabel === 'Assistant actif' ? 'Assistant actif' : conversationPresenceLabel === 'vu recemment' ? 'Vu recemment' : conversationPresenceLabel}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-[#202c33] px-3 py-4">
              <p className="text-lg font-black text-white">{selectedConversationMessages.length}</p>
              <p className="text-[11px] text-[#8696a0]">Messages</p>
            </div>
            <div className="rounded-2xl bg-[#202c33] px-3 py-4">
              <p className="text-lg font-black text-white">{selectedSharedFiles.length}</p>
              <p className="text-[11px] text-[#8696a0]">Fichiers</p>
            </div>
            <div className="rounded-2xl bg-[#202c33] px-3 py-4">
              <p className="text-lg font-black text-white">{selectedImportantCount}</p>
              <p className="text-[11px] text-[#8696a0]">Favoris</p>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#202c33] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0] mb-3">Contexte & outils</p>
            <div className="flex flex-wrap gap-2 mb-3 text-[11px] text-[#8696a0]">
              <span className="rounded-full bg-[#111b21] px-2 py-1">Contexte: {selectedContext.context_label}</span>
              <span className="rounded-full bg-[#111b21] px-2 py-1">Trad: {translationTarget.toUpperCase()}</span>
              <span className="rounded-full bg-[#111b21] px-2 py-1">Timeline: {actionsTimeline.length}</span>
              <span className="rounded-full bg-[#111b21] px-2 py-1">Appels: {callHistory.length}</span>
              <span className="rounded-full bg-[#111b21] px-2 py-1">Push: {pushPermission === 'granted' ? (pushEnabled ? 'ON' : 'OFF') : pushPermission}</span>
            </div>
            <div className="space-y-2 text-sm text-[#d1d7db]">
              <div className="flex items-center justify-between gap-3">
                <span>Contexte</span>
                <span className="text-[#53bdeb] text-right">{selectedContext.context_label}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Traduction</span>
                <span>{translationTarget.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Push</span>
                <span>{pushPermission === 'granted' ? (pushEnabled ? 'Actif' : 'Off') : 'Navigateur'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Bot</span>
                <span>{botEnabled ? 'Actif' : 'Desactive'}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <select value={selectedContextId} onChange={(e) => setSelectedContextId(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                {DEFAULT_CONTEXTS.map((ctx) => (
                  <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
                ))}
                <option value="custom">Contexte personnalise</option>
              </select>
              {selectedContextId === 'custom' && (
                <input
                  value={customContextLabel}
                  onChange={(e) => setCustomContextLabel(e.target.value)}
                  placeholder="Nom du contexte personnalise"
                  className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-white placeholder:text-[#8696a0] outline-none"
                />
              )}
              <select value={translationTarget} onChange={(e) => setTranslationTarget(e.target.value as 'fr' | 'en' | 'es' | 'ln')} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                {TRANSLATION_LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (pushPermission === 'default') {
                    void requestPushPermission()
                    return
                  }
                  if (pushPermission === 'granted') setPushEnabled((v) => !v)
                }}
                className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db]"
              >
                Push navigateur
              </button>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#202c33] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0] mb-3">Recherche discussion</p>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" size={14} />
                <input
                  type="text"
                  value={messageSearchInput}
                  onChange={(e) => setMessageSearchInput(e.target.value)}
                  placeholder="Rechercher dans la discussion"
                  className="w-full rounded-xl bg-[#111b21] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#8696a0] outline-none"
                />
              </div>
              <select value={searchSender} onChange={(e) => setSearchSender(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                {senderOptions.map((sender) => (
                  <option key={sender} value={sender}>{sender === 'all' ? 'Tous exp.' : sender}</option>
                ))}
              </select>
              <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                <option value="all">Tous types</option>
                <option value="text">Texte</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="file">Fichier</option>
                <option value="sticker">Sticker</option>
              </select>
              <label className="text-xs text-[#8696a0]">Date (jj-mm-aaaa)</label>
              <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none" />
              <label className="flex items-center gap-2 rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db]">
                <input type="checkbox" checked={searchOnlyAttachments} onChange={(e) => setSearchOnlyAttachments(e.target.checked)} />
                Fichiers
              </label>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#202c33] p-4">
            <div className="flex items-center gap-2 mb-3 text-[#d1d7db]"><ImageIcon size={16} /><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0]">Medias partages</p></div>
            <div className="space-y-2">
              {selectedSharedFiles.length === 0 ? (
                <p className="text-sm text-[#8696a0]">Aucun fichier recent.</p>
              ) : (
                selectedSharedFiles.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#111b21] px-3 py-2">
                    <div className="w-10 h-10 rounded-xl bg-[#0b141a] flex items-center justify-center text-[#53bdeb]">
                      <Paperclip size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.attachment_name}</p>
                      <p className="text-xs text-[#8696a0]">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {isSelectedChannelGroup && (
            <div className="rounded-[24px] bg-[#202c33] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0] mb-3">Membres du groupe</p>
              <div className="space-y-2">
                {selectedGroupMembers.map((member) => (
                  <div key={member} className="flex items-center gap-3 rounded-2xl bg-[#111b21] px-3 py-2">
                    <img src={getAvatarForName(member)} alt={member} className="w-8 h-8 rounded-full object-cover border border-[#314047]" />
                    <span className="truncate text-sm text-white">{member}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-[24px] bg-[#202c33] p-4">
            <div className="flex items-center gap-2 mb-3 text-[#d1d7db]"><History size={16} /><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0]">Appels & actions</p></div>
            <div className="space-y-2">
              {callHistory.length === 0 && actionsTimeline.length === 0 ? (
                <p className="text-sm text-[#8696a0]">Aucun appel ou action recente.</p>
              ) : null}
              {callHistory.slice(0, 2).map((item) => (
                <div key={`call-${item.id}`} className="flex items-center justify-between rounded-2xl bg-[#111b21] px-3 py-2 text-sm hover:bg-[#1a2a32] transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Phone size={12} className="text-[#53bdeb] flex-shrink-0" />
                    <span className="truncate text-white capitalize">{item.call_type}</span>
                  </div>
                  <span className="text-[#8696a0] text-right ml-2 flex-shrink-0">{item.duration_seconds || 0}s</span>
                </div>
              ))}
              {actionsTimeline.slice(0, 2).map((item) => (
                <div key={`action-${item.id}`} className="flex items-center justify-between rounded-2xl bg-[#111b21] px-3 py-2 text-sm hover:bg-[#1a2a32] transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CheckSquare size={12} className="text-[#2cb67d] flex-shrink-0" />
                    <span className="truncate text-white capitalize">{item.title || item.action_type}</span>
                  </div>
                  <span className="text-[#25d366]">{item.status || 'open'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInfoPanelMobile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="xl:hidden absolute inset-0 z-40 bg-[#0b141a]">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#26353d] bg-[#202c33]">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowInfoPanelMobile(false)} className="w-10 h-10 rounded-full bg-[#111b21] text-[#d1d7db] flex items-center justify-center">
                  <ChevronLeft size={18} />
                </button>
                <p className="text-base font-bold text-white">Infos discussion</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-[#111b21] text-[#d1d7db] flex items-center justify-center">
                <MoreVertical size={18} />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-73px)] px-5 py-6 space-y-5">
              <div className="flex flex-col items-center text-center">
                <img src={selectedAvatarSrc} alt={selectedConversationName} className="w-28 h-28 rounded-full object-cover border border-[#314047] mb-4" />
                <p className="text-2xl font-bold text-white">{selectedConversationName}</p>
                <p className="text-sm text-[#8696a0] mt-1">{selectedConversationDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setShowInfoPanelMobile(false); void startCall('audio'); }} className="rounded-2xl bg-[#202c33] px-4 py-4 text-[#d1d7db] flex items-center justify-center gap-2"><Phone size={16} /> Appel</button>
                <button onClick={() => { setShowInfoPanelMobile(false); void startCall('video'); }} className="rounded-2xl bg-[#202c33] px-4 py-4 text-[#d1d7db] flex items-center justify-center gap-2"><Video size={16} /> Video</button>
              </div>
              <div className="rounded-[24px] bg-[#202c33] p-4 space-y-3 text-sm">
                <div className="flex flex-wrap gap-2 text-[11px] text-[#8696a0]">
                  <span className="rounded-full bg-[#111b21] px-2 py-1">Contexte: {selectedContext.context_label}</span>
                  <span className="rounded-full bg-[#111b21] px-2 py-1">Trad: {translationTarget.toUpperCase()}</span>
                  <span className="rounded-full bg-[#111b21] px-2 py-1">Timeline: {actionsTimeline.length}</span>
                  <span className="rounded-full bg-[#111b21] px-2 py-1">Appels: {callHistory.length}</span>
                  <span className="rounded-full bg-[#111b21] px-2 py-1">Push: {pushPermission === 'granted' ? (pushEnabled ? 'ON' : 'OFF') : pushPermission}</span>
                </div>
                <div className="flex items-center justify-between"><span className="text-[#8696a0]">Fichiers</span><span className="text-white">{selectedSharedFiles.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#8696a0]">Favoris</span><span className="text-white">{selectedImportantCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#8696a0]">Contexte</span><span className="text-[#53bdeb] text-right">{selectedContext.context_label}</span></div>
                <div className="flex items-center justify-between"><span className="text-[#8696a0]">Push</span><span className="text-white">{pushPermission === 'granted' ? (pushEnabled ? 'ON' : 'OFF') : pushPermission}</span></div>
              </div>
              <div className="rounded-[24px] bg-[#202c33] p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0]">Contexte & recherche</p>
                <select value={selectedContextId} onChange={(e) => setSelectedContextId(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                  {DEFAULT_CONTEXTS.map((ctx) => (
                    <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
                  ))}
                  <option value="custom">Contexte personnalise</option>
                </select>
                {selectedContextId === 'custom' && (
                  <input
                    value={customContextLabel}
                    onChange={(e) => setCustomContextLabel(e.target.value)}
                    placeholder="Nom du contexte personnalise"
                    className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-white placeholder:text-[#8696a0] outline-none"
                  />
                )}
                <select value={translationTarget} onChange={(e) => setTranslationTarget(e.target.value as 'fr' | 'en' | 'es' | 'ln')} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                  {TRANSLATION_LANGS.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (pushPermission === 'default') {
                      void requestPushPermission()
                      return
                    }
                    if (pushPermission === 'granted') setPushEnabled((v) => !v)
                  }}
                  className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db]"
                >
                  Push navigateur
                </button>
                <div className="relative pt-1">
                  <Search className="absolute left-3 top-[18px] -translate-y-1/2 text-[#8696a0]" size={14} />
                  <input
                    type="text"
                    value={messageSearchInput}
                    onChange={(e) => setMessageSearchInput(e.target.value)}
                    placeholder="Rechercher dans la discussion"
                    className="w-full rounded-xl bg-[#111b21] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#8696a0] outline-none"
                  />
                </div>
                <select value={searchSender} onChange={(e) => setSearchSender(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                  {senderOptions.map((sender) => (
                    <option key={sender} value={sender}>{sender === 'all' ? 'Tous exp.' : sender}</option>
                  ))}
                </select>
                <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none">
                  <option value="all">Tous types</option>
                  <option value="text">Texte</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="file">Fichier</option>
                  <option value="sticker">Sticker</option>
                </select>
                <label className="text-xs text-[#8696a0]">Date (jj-mm-aaaa)</label>
                <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="w-full rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db] outline-none" />
                <label className="flex items-center gap-2 rounded-xl bg-[#111b21] px-3 py-2 text-sm text-[#d1d7db]">
                  <input type="checkbox" checked={searchOnlyAttachments} onChange={(e) => setSearchOnlyAttachments(e.target.checked)} />
                  Fichiers
                </label>
              </div>
              <div className="rounded-[24px] bg-[#202c33] p-4">
                <div className="flex items-center gap-2 mb-3 text-[#d1d7db]"><History size={16} /><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0]">Appels & actions</p></div>
                <div className="space-y-2">
                  {callHistory.length === 0 && actionsTimeline.length === 0 ? (
                    <p className="text-sm text-[#8696a0]">Aucun appel ou action recente.</p>
                  ) : null}
                  {callHistory.slice(0, 2).map((item) => (
                    <div key={`call-${item.id}`} className="flex items-center justify-between rounded-2xl bg-[#111b21] px-3 py-2 text-sm hover:bg-[#1a2a32] transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Phone size={12} className="text-[#53bdeb] flex-shrink-0" />
                        <span className="truncate text-white capitalize">{item.call_type}</span>
                      </div>
                      <span className="text-[#8696a0] text-right ml-2 flex-shrink-0">{item.duration_seconds || 0}s</span>
                    </div>
                  ))}
                  {actionsTimeline.slice(0, 2).map((item) => (
                    <div key={`action-${item.id}`} className="flex items-center justify-between rounded-2xl bg-[#111b21] px-3 py-2 text-sm hover:bg-[#1a2a32] transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <CheckSquare size={12} className="text-[#2cb67d] flex-shrink-0" />
                        <span className="truncate text-white capitalize">{item.title || item.action_type}</span>
                      </div>
                      <span className="text-[#25d366]">{item.status || 'open'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] bg-[#202c33] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8696a0] mb-3">Elements recents</p>
                <div className="space-y-2">
                  {selectedSharedFiles.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#111b21] px-3 py-2">
                      <div className="w-9 h-9 rounded-xl bg-[#0b141a] flex items-center justify-center text-[#53bdeb]"><LinkIcon size={15} /></div>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{item.attachment_name}</p>
                        <p className="text-xs text-[#8696a0]">{formatTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {selectedSharedFiles.length === 0 && <p className="text-sm text-[#8696a0]">Aucun media recent.</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {actionMenu.open && actionMenu.message && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeActionMenu}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="absolute w-[220px] rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl p-1"
            style={{
              left: Math.min(actionMenu.x, window.innerWidth - 240) + 'px',
              top: Math.min(actionMenu.y, window.innerHeight - 460) + 'px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Actions principales */}
            <button onClick={() => void runMessageAction('reply', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Reply size={12} /> Repondre</button>
            {actionMenu.message.attachment_url && (
              <button onClick={() => void runMessageAction('download', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Download size={12} /> Telecharger</button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(actionMenu.message?.content || '').catch(() => {});
                closeActionMenu();
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"
            >
              <Copy size={12} /> Copier
            </button>
            {canEditMessage(actionMenu.message) && (
              <button onClick={() => void runMessageAction('edit', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Pencil size={12} /> Editer</button>
            )}
            <button onClick={() => void runMessageAction('pin', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Pin size={12} /> Epingler</button>
            <button onClick={() => void runMessageAction('important', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Star size={12} /> Important</button>

            {/* Réactions */}
            <div className="mx-1 my-1 border-t border-zinc-100" />
            <div className="flex justify-around px-2 py-1">
              <button onClick={() => void runMessageAction('react-up', actionMenu.message!)} className="text-lg hover:scale-125 transition-transform">👍</button>
              <button onClick={() => void runMessageAction('react-fire', actionMenu.message!)} className="text-lg hover:scale-125 transition-transform">🔥</button>
              <button onClick={() => void runMessageAction('react-check', actionMenu.message!)} className="text-lg hover:scale-125 transition-transform">✅</button>
            </div>

            {/* Traduction + Timeline */}
            <div className="mx-1 my-1 border-t border-zinc-100" />
            <button onClick={() => void runMessageAction('translate', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Languages size={12} /> FR — Traduire</button>
            <button onClick={() => void runMessageAction('timeline-task', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><CheckSquare size={12} /> Tache</button>
            <button onClick={() => void runMessageAction('timeline-reminder', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><Bell size={12} /> Rappel</button>
            <button onClick={() => void runMessageAction('timeline-calendar', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-zinc-900 rounded-lg hover:bg-zinc-100 flex items-center gap-2"><CalendarDays size={12} /> Evenement</button>

            {/* Suppression */}
            <div className="mx-1 my-1 border-t border-zinc-100" />
            <button onClick={() => void runMessageAction('delete-me', actionMenu.message!)} className="w-full text-left px-3 py-2 text-xs text-red-500 rounded-lg hover:bg-red-50">Suppr. pour moi</button>
            {actionMenu.message.sender_name === currentUser && (
              <button
                onClick={() => void runMessageAction('delete-all', actionMenu.message!)}
                disabled={!canDeleteForAll(actionMenu.message)}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg ${
                  canDeleteForAll(actionMenu.message)
                    ? 'hover:bg-red-50 text-red-600'
                    : 'text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Trash2 size={12} className="inline mr-2" /> Suppr. pour tous
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl p-4 w-[560px] max-w-[95vw] shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800">
                  {callState === 'incoming' ? `Appel entrant de ${displayPeerName(incomingFrom)}` : `Appel ${callType}`}
                </h3>
                <button onClick={() => endCall()} className="p-1 rounded hover:bg-zinc-100">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900 rounded-xl overflow-hidden min-h-36 flex items-center justify-center text-white text-xs">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  {!localStreamRef.current && <span className="absolute">Votre flux</span>}
                </div>
                <div className="bg-zinc-900 rounded-xl overflow-hidden min-h-36 flex items-center justify-center text-white text-xs">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <span className="absolute">Participant distant</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                {callState === 'incoming' ? (
                  <>
                    <button onClick={acceptIncomingCall} className="px-4 py-2 rounded-xl bg-green-500 text-white text-xs font-black uppercase">
                      Accepter
                    </button>
                    <button onClick={rejectIncomingCall} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black uppercase">
                      Refuser
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleMic}
                      className={`px-3 py-2 rounded-xl text-white text-xs font-black uppercase flex items-center gap-2 ${isMicMuted ? 'bg-orange-500' : 'bg-zinc-700'}`}
                    >
                      {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />} {isMicMuted ? 'Micro coupe' : 'Micro actif'}
                    </button>

                    {callType === 'video' && (
                      <button
                        onClick={toggleCamera}
                        className={`px-3 py-2 rounded-xl text-white text-xs font-black uppercase flex items-center gap-2 ${isCamOff ? 'bg-orange-500' : 'bg-zinc-700'}`}
                      >
                        {isCamOff ? <VideoOff size={14} /> : <Video size={14} />} {isCamOff ? 'Camera coupee' : 'Camera active'}
                      </button>
                    )}

                    <button onClick={() => endCall()} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-black uppercase flex items-center gap-2">
                      <PhoneOff size={14} /> Raccrocher
                    </button>
                  </>
                )}
              </div>
              {callError && <p className="mt-3 text-xs font-bold text-red-600">{callError}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAllCallsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111b21] rounded-2xl p-6 w-[90%] max-w-2xl shadow-2xl border border-[#26353d] max-h-[80vh] overflow-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Phone size={20} className="text-[#53bdeb]" />
                  Tous les appels ({allCalls.length})
                </h3>
                <button
                  onClick={() => setShowAllCallsModal(false)}
                  className="p-2 rounded-full hover:bg-[#202c33] text-[#8696a0]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2 max-h-[calc(80vh-120px)] overflow-y-auto">
                {allCalls.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-[#8696a0]">
                    <p className="text-sm">Aucun appel enregistré</p>
                  </div>
                ) : (
                  allCalls.map((call, idx) => (
                    <div
                      key={`${call.id}-${idx}`}
                      className="flex items-center justify-between rounded-2xl bg-[#202c33] px-4 py-3 hover:bg-[#26353d] transition border border-[#26353d]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-[#0b141a] flex items-center justify-center flex-shrink-0">
                          <Phone size={16} className="text-[#53bdeb]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {call.from_user || call.to_user || 'Appel'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[#8696a0]">
                            <span className={`px-2 py-0.5 rounded-full ${
                              call.status === 'missed' ? 'bg-red-500/20 text-red-300' :
                              call.status === 'rejected' ? 'bg-orange-500/20 text-orange-300' :
                              call.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {call.status === 'missed' ? 'Manqué' : 
                               call.status === 'rejected' ? 'Rejeté' : 
                               call.status === 'completed' ? 'Complété' : 
                               'Annulé'}
                            </span>
                            <span>{formatDate(call.created_at)}</span>
                            {call.duration_seconds && <span>• {Math.round(call.duration_seconds / 60)}min</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-[#8696a0] text-right flex-shrink-0">
                        {call.channel && <p>{call.channel}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu contextuel pour les conversations */}
      <AnimatePresence>
        {conversationContextMenu.open && conversationContextMenu.channel && (() => {
          const ch = conversationContextMenu.channel;
          const isMuted = (channelMutedUntil[ch.id] || 0) > Date.now();
          const isPinned = channelPinned[ch.id] || false;
          const isArchived = channelArchived[ch.id] || false;
          const isBlocked = channelBlocked[ch.id] || false;
          const closeMenu = () => {
            setConversationContextMenu({ open: false, x: 0, y: 0, channel: null });
            setMuteSubmenuOpen(false);
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              onClick={closeMenu}
              onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: -6 }}
                transition={{ duration: 0.12 }}
                style={{ position: 'fixed', left: conversationContextMenu.x, top: conversationContextMenu.y }}
                className="bg-[#233138] rounded-xl shadow-2xl border border-[#2e4551] py-1.5 w-56 z-[61] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >

                {/* Marquer comme non lu */}
                <button
                  onClick={() => { handleMarkUnread(ch.id); closeMenu(); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                >
                  <MessageCircle size={16} className="text-[#8696a0] flex-shrink-0" />
                  <span>Marquer comme non lu</span>
                </button>

                {/* Épingler / Désépingler */}
                <button
                  onClick={() => { handlePinConversation(ch.id); closeMenu(); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                >
                  <Pin size={16} className={isPinned ? 'text-[#ffc107] flex-shrink-0' : 'text-[#8696a0] flex-shrink-0'} />
                  <span>{isPinned ? 'Désépingler' : 'Épingler'}</span>
                </button>

                {/* Mettre en sourdine – expand/collapse inline */}
                <div className="border-t border-[#2e4551] mt-1 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMuteSubmenuOpen((v) => !v); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={16} className={isMuted ? 'text-[#ffc107] flex-shrink-0' : 'text-[#8696a0] flex-shrink-0'} />
                      <span>{isMuted ? 'Désactiver sourdine' : 'Mettre en sourdine'}</span>
                    </div>
                    <ChevronLeft
                      size={14}
                      className={`text-[#8696a0] transition-transform duration-200 ${muteSubmenuOpen ? '-rotate-90' : 'rotate-180'}`}
                    />
                  </button>

                  <AnimatePresence>
                    {muteSubmenuOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden bg-[#1b2b33]"
                      >
                        {isMuted ? (
                          <button
                            onClick={() => {
                              setChannelMutedUntil((prev) => { const n = { ...prev }; delete n[ch.id]; return n; });
                              closeMenu();
                            }}
                            className="w-full px-6 py-2 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] transition-colors flex items-center gap-2"
                          >
                            <span className="text-[#25d366]">✓</span> Désactiver
                          </button>
                        ) : (
                          <>
                            {[
                              { label: '8 heures', value: '8h' },
                              { label: '1 semaine', value: '1w' },
                              { label: 'Toujours', value: 'always' },
                            ].map(({ label, value }) => (
                              <button
                                key={value}
                                onClick={() => { handleMuteConversation(ch.id, value); closeMenu(); }}
                                className="w-full px-6 py-2 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] transition-colors"
                              >
                                {label}
                              </button>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Archiver / Désarchiver */}
                <div className="border-t border-[#2e4551] mt-1 pt-1">
                  <button
                    onClick={() => { handleArchiveConversation(ch.id); closeMenu(); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                  >
                    <Archive size={16} className={isArchived ? 'text-[#ffc107] flex-shrink-0' : 'text-[#8696a0] flex-shrink-0'} />
                    <span>{isArchived ? 'Désarchiver' : 'Archiver'}</span>
                  </button>

                  {/* Voir le profil */}
                  <button
                    onClick={() => handleShowProfile(ch)}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                  >
                    <Info size={16} className="text-[#53bdeb] flex-shrink-0" />
                    <span>Voir le profil</span>
                  </button>
                </div>

                {/* Bloquer (privé) / Quitter (groupe) */}
                <div className="border-t border-[#2e4551] mt-1 pt-1">
                  {ch.isGroup ? (
                    <button
                      onClick={() => { handleLeaveGroup(ch.id); closeMenu(); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                    >
                      <Users size={16} className="flex-shrink-0" />
                      <span>Quitter le groupe</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { handleBlockContact(ch.id); closeMenu(); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-[#e9edef] hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                    >
                      <X size={16} className={isBlocked ? 'text-red-500 flex-shrink-0' : 'text-[#8696a0] flex-shrink-0'} />
                      <span>{isBlocked ? 'Débloquer' : 'Bloquer'}</span>
                    </button>
                  )}
                </div>

                {/* Supprimer */}
                <div className="border-t border-[#2e4551] mt-1 pt-1">
                  <button
                    onClick={() => { handleDeleteConversation(ch.id); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-[#2e4551] active:bg-[#37535f] transition-colors flex items-center gap-3"
                  >
                    <Trash2 size={16} className="flex-shrink-0" />
                    <span>Supprimer la discussion</span>
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Panneau de profil du contact */}
      <AnimatePresence>
        {showContactProfile && selectedContactForProfile && (() => {
          const contact = selectedContactForProfile;
          const contactMessages = messages.filter((m) => (m.channel || 'Direction Générale') === contact.id);
          const contactMedia = contactMessages.filter((m) => m.attachment_name && (m.message_type === 'image' || m.message_type === 'video'));
          const contactFiles = contactMessages.filter((m) => m.attachment_name && m.message_type !== 'image' && m.message_type !== 'video');
          const contactPinned = contactMessages.filter((m) => m.pinned || m.important);
          const isBlocked = channelBlocked[contact.id] || false;
          const isMuted = (channelMutedUntil[contact.id] || 0) > Date.now();

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 flex items-center justify-end z-[70]"
              onClick={() => setShowContactProfile(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="bg-[#111b21] h-full w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-4 px-4 py-4 bg-[#202c33] border-b border-[#26353d]">
                  <button onClick={() => setShowContactProfile(false)} className="text-[#8696a0] hover:text-white transition">
                    <X size={20} />
                  </button>
                  <span className="text-base font-semibold text-[#e9edef]">Infos {contact.isGroup ? 'du groupe' : 'du contact'}</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Photo de profil grande */}
                  <div className="flex flex-col items-center px-6 pt-8 pb-6 bg-[#202c33]">
                    <div className="relative mb-4">
                      <img
                        src={contact.avatarSrc}
                        alt={contact.name}
                        className="w-32 h-32 rounded-full object-cover border-2 border-[#26353d] shadow-xl"
                      />
                      {isMuted && (
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#111b21] flex items-center justify-center border border-[#26353d]">
                          <Bell size={14} className="text-[#ffc107]" />
                        </div>
                      )}
                      {isBlocked && (
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-[#111b21] flex items-center justify-center border border-[#26353d]">
                          <X size={14} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-2xl font-black text-white text-center leading-tight">{contact.name}</p>
                    {contact.description && (
                      <p className="text-sm text-[#8696a0] text-center mt-1">{contact.description}</p>
                    )}
                    {!contact.description && (
                      <p className="text-sm text-[#8696a0] text-center mt-1 italic">
                        {contact.isGroup ? 'Groupe de discussion' : 'Canal Sécurisé - DG'}
                      </p>
                    )}
                  </div>

                  {/* Actions rapides */}
                  <div className="flex justify-around px-4 py-4 bg-[#202c33] mt-2">
                    <button
                      onClick={() => { setShowContactProfile(false); setSelectedChannel(contact.id); startCall('audio'); }}
                      className="flex flex-col items-center gap-1.5 text-[#53bdeb] hover:text-white transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#111b21] flex items-center justify-center">
                        <Phone size={20} />
                      </div>
                      <span className="text-[10px] text-[#8696a0]">Appel</span>
                    </button>
                    <button
                      onClick={() => { setShowContactProfile(false); setSelectedChannel(contact.id); startCall('video'); }}
                      className="flex flex-col items-center gap-1.5 text-[#53bdeb] hover:text-white transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#111b21] flex items-center justify-center">
                        <Video size={20} />
                      </div>
                      <span className="text-[10px] text-[#8696a0]">Vidéo</span>
                    </button>
                    <button
                      onClick={() => { handleMuteConversation(contact.id, isMuted ? 0 : '8h'); }}
                      className={`flex flex-col items-center gap-1.5 transition ${isMuted ? 'text-[#ffc107]' : 'text-[#53bdeb] hover:text-white'}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-[#111b21] flex items-center justify-center">
                        <Bell size={20} />
                      </div>
                      <span className="text-[10px] text-[#8696a0]">{isMuted ? 'Activer' : 'Sourdine'}</span>
                    </button>
                    <button
                      onClick={() => { setShowContactProfile(false); setSelectedChannel(contact.id); }}
                      className="flex flex-col items-center gap-1.5 text-[#25d366] hover:text-white transition"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#111b21] flex items-center justify-center">
                        <MessageCircle size={20} />
                      </div>
                      <span className="text-[10px] text-[#8696a0]">Message</span>
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="mx-4 mt-4 grid grid-cols-3 rounded-2xl bg-[#202c33] overflow-hidden border border-[#26353d]">
                    <div className="flex flex-col items-center py-4 border-r border-[#26353d]">
                      <p className="text-lg font-black text-white">{contactMessages.length}</p>
                      <p className="text-[10px] text-[#8696a0] mt-0.5">Messages</p>
                    </div>
                    <div className="flex flex-col items-center py-4 border-r border-[#26353d]">
                      <p className="text-lg font-black text-white">{contactMedia.length + contactFiles.length}</p>
                      <p className="text-[10px] text-[#8696a0] mt-0.5">Fichiers</p>
                    </div>
                    <div className="flex flex-col items-center py-4">
                      <p className="text-lg font-black text-white">{contactPinned.length}</p>
                      <p className="text-[10px] text-[#8696a0] mt-0.5">Épinglés</p>
                    </div>
                  </div>

                  {/* Statut profil permanent */}
                  <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#26353d] flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Statut profil</span>
                      {!contact.isGroup && contact.id === selectedChannel && (
                        <button
                          onClick={() => setEditingProfileStatus(true)}
                          className="text-[10px] text-[#53bdeb] hover:text-white transition"
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-[#e9edef]">
                        {contact.description || myProfileStatus || 'Hey there! I am using WhatsApp'}
                      </p>
                    </div>
                  </div>

                  {/* Explication des statuts WhatsApp */}
                  <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#26353d]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Types de statuts WhatsApp</span>
                    </div>
                    <div className="px-4 py-3 space-y-2 text-xs text-[#d1d7db]">
                      <p><span className="text-[#25d366] font-semibold">1. Statut texte (profil)</span> - permanent jusqu'à modification.</p>
                      <p><span className="text-[#53bdeb] font-semibold">2. Statut story</span> - expire automatiquement après 24h.</p>
                      <p><span className="text-[#ebc953] font-semibold">3. Statut activité</span> - en ligne, écrit, enregistrement vocal en temps réel.</p>
                    </div>
                  </div>

                  {/* Médias partagés */}
                  {contactMedia.length > 0 && (
                    <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#26353d]">
                        <div className="flex items-center gap-2">
                          <ImageIcon size={15} className="text-[#8696a0]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Médias partagés</span>
                        </div>
                        <span className="text-xs text-[#8696a0]">{contactMedia.length}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-0.5 p-1">
                        {contactMedia.slice(0, 6).map((m) => (
                          <div key={m.id} className="aspect-square bg-[#111b21] rounded-lg overflow-hidden flex items-center justify-center">
                            {m.message_type === 'image' ? (
                              <img src={m.attachment_url || ''} alt={m.attachment_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-[#8696a0]">
                                <Video size={20} />
                                <span className="text-[9px]">vidéo</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fichiers */}
                  {contactFiles.length > 0 && (
                    <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#26353d]">
                        <div className="flex items-center gap-2">
                          <Paperclip size={15} className="text-[#8696a0]" />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Fichiers</span>
                        </div>
                        <span className="text-xs text-[#8696a0]">{contactFiles.length}</span>
                      </div>
                      <div className="divide-y divide-[#26353d]">
                        {contactFiles.slice(0, 4).map((m) => (
                          <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#111b21] flex items-center justify-center flex-shrink-0">
                              <Paperclip size={14} className="text-[#53bdeb]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-[#e9edef]">{m.attachment_name}</p>
                              <p className="text-[10px] text-[#8696a0]">{formatDate(m.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Liens */}
                  {contactMessages.filter((m) => m.content?.includes('http')).length > 0 && (
                    <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#26353d] flex items-center gap-2">
                        <LinkIcon size={15} className="text-[#8696a0]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Liens</span>
                      </div>
                      {contactMessages.filter((m) => m.content?.includes('http')).slice(0, 3).map((m) => (
                        <div key={m.id} className="px-4 py-2.5 border-b border-[#26353d] last:border-b-0">
                          <p className="truncate text-sm text-[#53bdeb]">{m.content}</p>
                          <p className="text-[10px] text-[#8696a0]">{m.sender_name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Messages épinglés */}
                  {contactPinned.length > 0 && (
                    <div className="mx-4 mt-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#26353d] flex items-center gap-2">
                        <Pin size={15} className="text-[#8696a0]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Messages épinglés</span>
                      </div>
                      {contactPinned.slice(0, 3).map((m) => (
                        <div key={m.id} className="px-4 py-2.5 border-b border-[#26353d] last:border-b-0">
                          <p className="text-[10px] font-black text-[#53bdeb]">{m.sender_name}</p>
                          <p className="truncate text-sm text-[#e9edef]">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confidentialité / Actions de gestion */}
                  <div className="mx-4 mt-4 mb-4 rounded-2xl bg-[#202c33] border border-[#26353d] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#26353d]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8696a0]">Actions</span>
                    </div>
                    <button
                      onClick={() => { handlePinConversation(contact.id); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[#e9edef] hover:bg-[#26353d] transition border-b border-[#26353d]"
                    >
                      <Pin size={16} className={channelPinned[contact.id] ? 'text-[#ffc107]' : 'text-[#8696a0]'} />
                      <span className="text-sm">{channelPinned[contact.id] ? 'Désépingler' : 'Épingler'}</span>
                    </button>
                    <button
                      onClick={() => { handleArchiveConversation(contact.id); setShowContactProfile(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-[#e9edef] hover:bg-[#26353d] transition border-b border-[#26353d]"
                    >
                      <Archive size={16} className={channelArchived[contact.id] ? 'text-[#ffc107]' : 'text-[#8696a0]'} />
                      <span className="text-sm">{channelArchived[contact.id] ? 'Désarchiver' : 'Archiver'}</span>
                    </button>
                    {!contact.isGroup && (
                      <button
                        onClick={() => { handleBlockContact(contact.id); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#26353d] transition"
                      >
                        <X size={16} />
                        <span className="text-sm">{isBlocked ? 'Débloquer' : 'Bloquer'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Story viewer (24h status) */}
      <AnimatePresence>
        {showStoryViewer && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[90] flex items-center justify-center"
            onClick={() => setShowStoryViewer(false)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="w-full max-w-md h-[80vh] rounded-3xl overflow-hidden border border-[#26353d] bg-[#111b21] shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/70 to-transparent">
                <div className="flex gap-1 mb-3">
                  {activeStory.items.map((item, idx) => (
                    <div key={item.id} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                      <motion.div
                        key={`${item.id}-${storyProgressKey}`}
                        className="h-full bg-white"
                        initial={{ width: idx < activeStoryItemIndex ? '100%' : '0%' }}
                        animate={{ width: idx < activeStoryItemIndex ? '100%' : idx === activeStoryItemIndex ? '100%' : '0%' }}
                        transition={{ duration: idx === activeStoryItemIndex ? 5 : 0 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={activeStory.avatar_url} alt={activeStory.channel_name} className="w-10 h-10 rounded-full border border-white/30 object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{activeStory.channel_name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-white/75">Statut 24h</p>
                        {activeStoryCurrentItem?.privacy && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/80">
                            {activeStoryCurrentItem.privacy === 'all' ? 'Tout le monde' : activeStoryCurrentItem.privacy === 'only' ? 'Seulement...' : 'Sauf...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeStory?.owner_key === currentStoryOwnerKey && (
                      <button
                        onClick={() => setShowStoryViewers((v) => !v)}
                        className="text-white/90 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10"
                        title="Voir qui a vu"
                      >
                        Vu par {activeStoryViewers.length}
                      </button>
                    )}
                    <button onClick={() => setShowStoryViewer(false)} className="text-white/90 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {activeStory.items[activeStoryItemIndex]?.type === 'image' && activeStory.items[activeStoryItemIndex]?.url ? (
                <img
                  src={activeStory.items[activeStoryItemIndex].url}
                  alt="story"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center px-8 text-center"
                  style={{ background: activeStory.items[activeStoryItemIndex]?.bg_color || STORY_BG_COLORS[0] }}
                >
                  <p className="text-white text-2xl font-bold leading-snug">
                    {activeStory.items[activeStoryItemIndex]?.content || 'Statut'}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  const prev = Math.max(activeStoryItemIndex - 1, 0);
                  setActiveStoryItemIndex(prev);
                  setStoryProgressKey((k) => k + 1);
                }}
                className="absolute left-0 top-0 bottom-0 w-1/2"
                aria-label="Story précédente"
              />
              <button
                onClick={() => {
                  const next = activeStoryItemIndex + 1;
                  if (next < activeStory.items.length) {
                    setActiveStoryItemIndex(next);
                    setStoryProgressKey((k) => k + 1);
                  } else {
                    setShowStoryViewer(false);
                  }
                }}
                className="absolute right-0 top-0 bottom-0 w-1/2"
                aria-label="Story suivante"
              />

              <AnimatePresence>
                {showStoryViewers && activeStory?.owner_key === currentStoryOwnerKey && (
                  <motion.div
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 24, opacity: 0 }}
                    className="absolute left-0 right-0 bottom-0 bg-black/75 border-t border-white/15 p-3 max-h-48 overflow-y-auto"
                  >
                    <p className="text-xs text-white/80 font-semibold mb-2">Vu par ({activeStoryViewers.length})</p>
                    {activeStoryViewers.length === 0 ? (
                      <p className="text-xs text-white/60">Aucune vue pour le moment.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activeStoryViewers.map((viewer) => (
                          <div key={`${viewer.viewer_key}-${viewer.viewed_at}`} className="flex items-center justify-between text-xs text-white/85">
                            <span className="truncate">{viewer.viewer_name || viewer.viewer_key}</span>
                            <span className="text-white/60">{formatTime(viewer.viewed_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story composer (camera/gallery + privacy) */}
      <AnimatePresence>
        {showCreateStoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[96] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowCreateStoryModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-[#111b21] border border-[#26353d] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-[#26353d] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#e9edef]">Publier un statut</p>
                  <p className="text-[11px] text-[#8696a0]">Story temporaire 24h</p>
                </div>
                <button onClick={() => setShowCreateStoryModal(false)} className="text-[#8696a0] hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => storyCameraInputRef.current?.click()}
                    className="rounded-xl border border-[#314047] bg-[#202c33] px-3 py-2.5 text-sm text-[#e9edef] hover:bg-[#26353d] flex items-center justify-center gap-2"
                  >
                    <Camera size={16} /> Caméra directe
                  </button>
                  <button
                    onClick={() => storyGalleryInputRef.current?.click()}
                    className="rounded-xl border border-[#314047] bg-[#202c33] px-3 py-2.5 text-sm text-[#e9edef] hover:bg-[#26353d] flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={16} /> Galerie
                  </button>
                </div>

                {storyDraftImage ? (
                  <img src={storyDraftImage} alt="Aperçu story" className="w-full h-56 object-cover rounded-xl border border-[#314047]" />
                ) : (
                  <div className="w-full h-40 rounded-xl border border-[#314047] flex items-center justify-center text-[#8696a0]" style={{ background: storyDraftBg }}>
                    <p className="text-sm font-semibold">Aperçu texte story</p>
                  </div>
                )}

                <textarea
                  value={storyDraftText}
                  onChange={(e) => setStoryDraftText(e.target.value)}
                  placeholder="Écris ton statut..."
                  rows={3}
                  className="w-full rounded-xl bg-[#202c33] px-4 py-3 text-sm text-white placeholder:text-[#8696a0] border border-[#314047] outline-none focus:border-[#25d366]"
                />

                {!storyDraftImage && (
                  <div className="flex gap-2 flex-wrap">
                    {STORY_BG_COLORS.map((bg) => (
                      <button
                        key={bg}
                        onClick={() => setStoryDraftBg(bg)}
                        className={`w-9 h-9 rounded-full border ${storyDraftBg === bg ? 'border-[#25d366] border-2' : 'border-[#314047]'}`}
                        style={{ background: bg }}
                      />
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-[#314047] p-3 bg-[#202c33] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#d1d7db] uppercase tracking-wider">
                    <Users size={14} /> Confidentialité (qui voit ton statut)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'Tout le monde' },
                      { id: 'only', label: 'Seulement...' },
                      { id: 'exclude', label: 'Sauf...' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setStoryPrivacy(opt.id as 'all' | 'only' | 'exclude')}
                        className={`rounded-lg px-2 py-2 text-[11px] font-semibold ${storyPrivacy === opt.id ? 'bg-[#25d366] text-[#0b141a]' : 'bg-[#111b21] text-[#d1d7db]'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {storyPrivacy !== 'all' && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {storyAudienceOptions.length === 0 ? (
                        <p className="text-xs text-[#8696a0]">Aucun contact disponible.</p>
                      ) : storyAudienceOptions.map((opt) => {
                        const checked = storyAudienceKeys.includes(opt.key);
                        return (
                          <label key={opt.key} className="flex items-center gap-2 text-sm text-[#e9edef]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setStoryAudienceKeys((prev) => {
                                  if (e.target.checked) return Array.from(new Set([...prev, opt.key]));
                                  return prev.filter((k) => k !== opt.key);
                                });
                              }}
                            />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-[#26353d] flex justify-end gap-2">
                <button
                  onClick={() => {
                    resetStoryComposer();
                    setShowCreateStoryModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#202c33] text-[#e9edef] text-sm hover:bg-[#26353d]"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePublishStory}
                  disabled={!storyDraftText.trim() && !storyDraftImage}
                  className="px-4 py-2 rounded-xl bg-[#25d366] text-[#0b141a] text-sm font-bold hover:bg-[#20c457] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Publier (24h)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit profile text status */}
      <AnimatePresence>
        {editingProfileStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setEditingProfileStatus(false)}
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-[#111b21] border border-[#26353d] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-[#26353d] flex items-center justify-between">
                <p className="text-sm font-bold text-[#e9edef]">Statut profil</p>
                <button onClick={() => setEditingProfileStatus(false)} className="text-[#8696a0] hover:text-white transition">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={newProfileStatusText}
                  onChange={(e) => setNewProfileStatusText(e.target.value)}
                  placeholder="Ex: Disponible, Au travail..."
                  className="w-full rounded-xl bg-[#202c33] px-4 py-3 text-sm text-white placeholder:text-[#8696a0] outline-none border border-[#314047] focus:border-[#25d366]"
                />
                <div className="flex gap-2">
                  {['Disponible', 'Occupé', 'Au travail', 'Ne pas déranger'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewProfileStatusText(s)}
                      className="px-3 py-1.5 rounded-full text-[11px] bg-[#202c33] text-[#d1d7db] hover:bg-[#26353d]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[#26353d] flex justify-end gap-2">
                <button
                  onClick={() => setEditingProfileStatus(false)}
                  className="px-4 py-2 rounded-xl bg-[#202c33] text-[#e9edef] text-sm hover:bg-[#26353d]"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setMyProfileStatus(newProfileStatusText.trim() || 'Disponible');
                    setEditingProfileStatus(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#25d366] text-[#0b141a] text-sm font-bold hover:bg-[#20c457]"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}









