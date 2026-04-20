"use client";

import { useState, useEffect, useRef } from 'react';
import { getActiveSupabaseClient } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  HelpCircle,
  Lock,
  LogOut,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  Users,
  Download,
  Folder,
  Activity,
  Globe,
  MessageCircle,
  Phone,
  Languages,
  Info,
  Star,
  CheckCircle2,
  Camera,
  Pencil,
  Eye,
  EyeOff,
  Smartphone,
  Database,
  Wifi,
  Archive,
  Trash2,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${checked ? 'bg-[#C7FF00]' : 'bg-zinc-200'}`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full shadow-md transition-all duration-300 ${checked ? 'left-7 bg-black' : 'left-1 bg-white'}`}
      />
    </button>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  subtitle?: string;
  badge?: string;
  toggle?: { checked: boolean; onChange: () => void };
  onClick?: () => void;
  danger?: boolean;
  last?: boolean;
}

function SettingRow({
  icon,
  iconBg = 'bg-zinc-100 text-zinc-500',
  label,
  subtitle,
  badge,
  toggle,
  onClick,
  danger,
  last,
}: SettingRowProps) {
  return (
    <button
      onClick={toggle ? undefined : onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 transition-all group ${!last ? 'border-b border-zinc-100' : ''} ${onClick && !toggle ? 'hover:bg-zinc-50 active:bg-zinc-100' : 'cursor-default'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-semibold truncate ${danger ? 'text-red-500' : 'text-zinc-800'}`}>{label}</p>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {badge && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C7FF00] text-black flex-shrink-0">{badge}</span>
      )}
      {toggle ? (
        <Toggle checked={toggle.checked} onChange={toggle.onChange} />
      ) : (
        onClick && <ChevronRight size={16} className="text-zinc-300 group-hover:text-zinc-500 flex-shrink-0 transition-colors" />
      )}
    </button>
  );
}

interface SectionProps {
  title?: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div>
      {title && <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-400 px-1 mb-2">{title}</p>}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">{children}</div>
    </div>
  );
}

interface MfaEnrollment {
  factorId: string;
  qrCodeSvg?: string;
  otpauthUrl?: string;
}

interface DataOpsSnapshot {
  capturedAt: string;
  opportunitiesActive: number;
  athletes: number;
  posts: number;
  reports: number;
  documents: number;
  docsTotalBytes: number;
  syncHealthy: boolean;
  warnings: string[];
  backupNextRunLabel: string;
}

export default function SettingsView() {
  // Client réévalué à chaque mount — prend le bon client selon /staff-dashboard ou /admin-dashboard
  const supabase = getActiveSupabaseClient();
  const AVATAR_BUCKET_CANDIDATES = ['profile-images', 'agta_vault', 'agta-files'];

  const [syncing, setSyncing] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifSounds, setNotifSounds] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [invisibleMode, setInvisibleMode] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [showDanger, setShowDanger] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [language, setLanguage] = useState('Français');
  const [timezone, setTimezone] = useState('GST +4 — Dubai / UTC+1 — Kinshasa');
  const [lastSyncAt, setLastSyncAt] = useState('Jamais');
  const [lastPasswordResetAt, setLastPasswordResetAt] = useState('Jamais');
  const [statusMessage, setStatusMessage] = useState('');
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [databaseModalOpen, setDatabaseModalOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [disableMfaModalOpen, setDisableMfaModalOpen] = useState(false);

  const [newDisplayName, setNewDisplayName] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreview, setSelectedAvatarPreview] = useState('');
  const [avatarCropZoom, setAvatarCropZoom] = useState(1.2);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [dataOpsLoading, setDataOpsLoading] = useState(false);
  const [dataOpsSnapshot, setDataOpsSnapshot] = useState<DataOpsSnapshot | null>(null);
  const [dataOpsError, setDataOpsError] = useState('');
  const [exportingData, setExportingData] = useState(false);

  // Prefix de stockage scopé par utilisateur — évite tout partage entre DG et Staff
  const storagePrefixRef = useRef<string>('agta-anon');
  const hasInitializedRef = useRef<boolean>(false);
  const lsKey = (suffix: string) => `${storagePrefixRef.current}-${suffix}`;

  const formatBytes = (bytes?: number) => {
    const value = Number.isFinite(bytes) ? Math.max(0, Number(bytes)) : 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getNextDubaiBackupLabel = () => {
    try {
      const dubaiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
      const nextBackup = new Date(dubaiNow);
      nextBackup.setHours(2, 0, 0, 0);
      if (dubaiNow.getTime() >= nextBackup.getTime()) {
        nextBackup.setDate(nextBackup.getDate() + 1);
      }

      const diffMs = Math.max(0, nextBackup.getTime() - dubaiNow.getTime());
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `Prochaine exécution dans ${diffHours}h ${diffMinutes}m (02:00 Dubai)`;
    } catch {
      return 'Chaque nuit à 02:00 (Dubai)';
    }
  };

  const toPositiveNumber = (value: unknown) => {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, num);
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(''), 3000);
  };

  const persistBooleanPreference = (key: string, value: boolean) => {
    // key like 'agta-settings-notif-messages' → scoped to 'agta-{uid}-settings-notif-messages'
    const scopedKey = key.replace(/^agta-/, `${storagePrefixRef.current}-`);
    localStorage.setItem(scopedKey, JSON.stringify(value));
  };

  const appendLog = (entry: string) => {
    setActivityLog((prev) => {
      const next = [`${new Date().toLocaleString('fr-FR')} • ${entry}`, ...prev].slice(0, 30);
      localStorage.setItem(lsKey('settings-logs'), JSON.stringify(next));
      return next;
    });
  };

  const refreshMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const verifiedTotp = (data.totp ?? []).find((factor: any) => factor.status === 'verified');
    setTwoFA(Boolean(verifiedTotp));
    setActiveFactorId(verifiedTotp?.id ?? null);
  };

  const refreshDataOpsSnapshot = async (silent = false) => {
    setDataOpsLoading(true);
    setDataOpsError('');

    const [
      opportunitiesRes,
      athletesRes,
      postsRes,
      reportsRes,
      docsCountRes,
      docsSampleRes,
    ] = await Promise.all([
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('athletes').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('work_logs').select('id', { count: 'exact', head: true }).eq('type', 'bureau_report'),
      supabase.from('documents_agta').select('id', { count: 'exact', head: true }),
      supabase.from('documents_agta').select('size,file_size,size_bytes').limit(500),
    ]);

    const warnings: string[] = [];
    const registerWarning = (label: string, error: any) => {
      if (error) warnings.push(`${label}: ${error.message || 'non disponible'}`);
    };

    registerWarning('Opportunités actives', opportunitiesRes.error);
    registerWarning('Athlètes', athletesRes.error);
    registerWarning('Publications', postsRes.error);
    registerWarning('Rapports SEC', reportsRes.error);
    registerWarning('Documents', docsCountRes.error);
    registerWarning('Volume documents', docsSampleRes.error);

    const docsRows = (docsSampleRes.data ?? []) as Array<Record<string, unknown>>;
    const docsTotalBytes = docsRows.reduce((sum, row) => {
      const rowSize = toPositiveNumber(row.size ?? row.file_size ?? row.size_bytes ?? 0);
      return sum + rowSize;
    }, 0);

    const snapshot: DataOpsSnapshot = {
      capturedAt: new Date().toLocaleString('fr-FR'),
      opportunitiesActive: opportunitiesRes.count ?? 0,
      athletes: athletesRes.count ?? 0,
      posts: postsRes.count ?? 0,
      reports: reportsRes.count ?? 0,
      documents: docsCountRes.count ?? 0,
      docsTotalBytes,
      syncHealthy: warnings.length === 0,
      warnings,
      backupNextRunLabel: getNextDubaiBackupLabel(),
    };

    setDataOpsSnapshot(snapshot);
    setDataOpsLoading(false);

    if (warnings.length > 0) {
      setDataOpsError('Certaines métriques sont partielles (droits/colonnes manquants).');
      if (!silent) {
        showStatus('Synchronisation partielle: vérifiez les permissions Supabase.');
      }
    } else if (!silent) {
      showStatus('Snapshot base et stockage mis à jour.');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const { data: userData } = await supabase.auth.getUser();
      // Scoper le préfixe AVANT toute lecture localStorage
      storagePrefixRef.current = `agta-${userData.user?.id ?? 'anon'}`;
      setCurrentUser(userData.user);
      if (userData.user?.id) {
        void syncChatProfileDirectory({
          fullName: (userData.user.user_metadata?.full_name as string | undefined) || '',
          avatarUrl: (userData.user.user_metadata?.profile_picture_url as string | undefined)
            || (userData.user.user_metadata?.avatar_url as string | undefined)
            || '',
        });
      }

      const storedLogs = localStorage.getItem(lsKey('settings-logs'));
      const storedLanguage = localStorage.getItem(lsKey('settings-language'));
      const storedTimezone = localStorage.getItem(lsKey('settings-timezone'));
      const storedSync = localStorage.getItem(lsKey('settings-last-sync'));
      const storedPwReset = localStorage.getItem(lsKey('settings-last-password-reset'));
      const storedNotifMessages = localStorage.getItem(lsKey('settings-notif-messages'));
      const storedNotifAlerts = localStorage.getItem(lsKey('settings-notif-alerts'));
      const storedNotifSounds = localStorage.getItem(lsKey('settings-notif-sounds'));
      const storedInvisible = localStorage.getItem(lsKey('settings-invisible'));
      const storedAutoBackup = localStorage.getItem(lsKey('settings-auto-backup'));
      const storedMaintenance = localStorage.getItem(lsKey('settings-maintenance'));

      if (storedLogs) setActivityLog(JSON.parse(storedLogs));
      if (storedLanguage) setLanguage(storedLanguage);
      if (storedTimezone) setTimezone(storedTimezone);
      if (storedSync) setLastSyncAt(storedSync);
      if (storedPwReset) setLastPasswordResetAt(storedPwReset);
      if (storedNotifMessages) setNotifMessages(JSON.parse(storedNotifMessages));
      if (storedNotifAlerts) setNotifAlerts(JSON.parse(storedNotifAlerts));
      if (storedNotifSounds) setNotifSounds(JSON.parse(storedNotifSounds));
      if (storedInvisible) setInvisibleMode(JSON.parse(storedInvisible));
      if (storedAutoBackup) setAutoBackup(JSON.parse(storedAutoBackup));
      if (storedMaintenance) setMaintenance(JSON.parse(storedMaintenance));

      await refreshMfaStatus();
      await refreshDataOpsSnapshot(true);
      hasInitializedRef.current = true;
    };

    initialize();
  }, [supabase]);

  useEffect(() => {
    document.documentElement.lang = language === 'Français' ? 'fr' : language === 'English' ? 'en' : 'pt';
    if (hasInitializedRef.current) localStorage.setItem(lsKey('settings-language'), language);
  }, [language]);

  useEffect(() => {
    if (hasInitializedRef.current) localStorage.setItem(lsKey('settings-timezone'), timezone);
  }, [timezone]);

  useEffect(() => {
    if (!avatarModalOpen && selectedAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedAvatarPreview);
      setSelectedAvatarPreview('');
      setSelectedAvatarFile(null);
    }
  }, [avatarModalOpen, selectedAvatarPreview]);

  const DG_EMAIL = 'kbgmathieu@gmail.com';
  const STAFF_EMAIL = 'agta.management@gmail.com';
  const userEmail = currentUser?.email ?? '—';
  const isDG = userEmail === DG_EMAIL;
  const isStaff = userEmail === STAFF_EMAIL;
  // Rôle déterminé strictement par email pour éviter toute confusion entre comptes
  const userRole = isDG ? 'Directeur Général' : isStaff ? 'Staff Secrétaire' : 'Staff';
  const displayName = currentUser?.user_metadata?.full_name
    ?? (isDG ? 'Directeur Général' : isStaff ? 'AGTA Management' : userEmail.split('@')[0]);
  const initials = (displayName || 'US').slice(0, 2).toUpperCase();
  const avatarUrl = (currentUser?.user_metadata?.profile_picture_url as string | undefined)
    || (currentUser?.user_metadata?.avatar_url as string | undefined);
  const lastSignIn = currentUser?.last_sign_in_at
    ? new Date(currentUser.last_sign_in_at).toLocaleString('fr-FR')
    : 'Information indisponible';

  const resolveChatUserName = (email?: string, preferredName?: string) => {
    if (email === DG_EMAIL) return 'Direction Générale';
    if (email === STAFF_EMAIL) return 'STAFF SECRETARY';
    return preferredName?.trim() || email?.split('@')[0] || 'Utilisateur';
  };

  const syncChatProfileDirectory = async (payload?: { fullName?: string; avatarUrl?: string }) => {
    if (!currentUser?.id) return;

    const effectiveDisplayName = payload?.fullName ?? (currentUser?.user_metadata?.full_name as string | undefined) ?? '';
    const effectiveAvatarUrl = payload?.avatarUrl
      ?? (currentUser?.user_metadata?.profile_picture_url as string | undefined)
      ?? (currentUser?.user_metadata?.avatar_url as string | undefined)
      ?? '';

    try {
      await supabase.from('chat_user_profiles').upsert([
        {
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: resolveChatUserName(currentUser.email, effectiveDisplayName),
          display_name: effectiveDisplayName || resolveChatUserName(currentUser.email, effectiveDisplayName),
          profile_picture_url: effectiveAvatarUrl || null,
          avatar_url: effectiveAvatarUrl || null,
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'user_id' });
    } catch {
      // Ignore if the SQL migration has not been applied yet.
    }
  };

  const navigateToTab = (tabId: string) => {
    window.dispatchEvent(new CustomEvent('agta:navigate-tab', { detail: tabId }));
    appendLog(`Navigation vers onglet ${tabId}`);
  };

  const cycleLanguage = () => {
    const options = ['Français', 'English', 'Português'];
    const idx = options.indexOf(language);
    const next = options[(idx + 1) % options.length];
    setLanguage(next);
    appendLog(`Langue changée vers ${next}`);
    showStatus(`Langue active: ${next}`);
  };

  const cycleTimezone = () => {
    const options = [
      'GST +4 — Dubai / UTC+1 — Kinshasa',
      'UTC+1 — Kinshasa',
      'GST +4 — Dubai',
      'UTC+0 — Londres',
    ];
    const idx = options.indexOf(timezone);
    const next = options[(idx + 1) % options.length];
    setTimezone(next);
    appendLog(`Fuseau changé vers ${next}`);
    showStatus(`Fuseau actif: ${next}`);
  };

  const handleSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      setSyncing(false);
      showStatus('Echec de synchronisation avec Supabase.');
      appendLog('Synchronisation Supabase échouée');
      return;
    }

    const syncTime = new Date().toLocaleString('fr-FR');
    setLastSyncAt(syncTime);
    localStorage.setItem(lsKey('settings-last-sync'), syncTime);
    await refreshDataOpsSnapshot(true);
    setSyncing(false);
    appendLog('Synchronisation Supabase réussie');
    showStatus('Synchronisation Supabase réussie. Données rafraîchies.');
  };

  const handlePasswordReset = async () => {
    if (!currentUser?.email) {
      showStatus('Aucun email utilisateur trouvé.');
      return;
    }

    const role = isDG ? 'dg' : 'staff';
    const redirectPath = `/auth/reset-password?role=${role}`;
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: `${window.location.origin}${redirectPath}`,
    });

    if (error) {
      showStatus('Impossible d envoyer le lien de réinitialisation.');
      appendLog('Echec envoi lien mot de passe');
      return;
    }

    const resetTime = new Date().toLocaleString('fr-FR');
    setLastPasswordResetAt(resetTime);
    localStorage.setItem(lsKey('settings-last-password-reset'), resetTime);
    appendLog('Lien de réinitialisation envoyé');
    showStatus(`Lien de réinitialisation envoyé à ${currentUser.email}.`);
  };

  const openProfileModal = () => {
    setNewDisplayName(displayName || '');
    setProfileModalOpen(true);
  };

  const saveProfileName = async () => {
    if (!newDisplayName.trim()) {
      showStatus('Le nom ne peut pas être vide.');
      return;
    }

    // Sécurité: vérifier que la session active correspond EXACTEMENT à cet utilisateur
    const { data: { user: activeUser } } = await supabase.auth.getUser();
    if (!activeUser || activeUser.id !== currentUser?.id) {
      showStatus('Session invalide. Veuillez vous reconnecter.');
      appendLog('Echec: session utilisateur incoherente');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { ...currentUser?.user_metadata, full_name: newDisplayName.trim() },
    });

    if (error) {
      showStatus('Mise à jour du profil impossible.');
      appendLog('Echec mise à jour profil');
      return;
    }

    setCurrentUser((prev: any) => ({
      ...prev,
      user_metadata: {
        ...(prev?.user_metadata ?? {}),
        full_name: newDisplayName.trim(),
      },
    }));

    await syncChatProfileDirectory({ fullName: newDisplayName.trim() });

    window.dispatchEvent(
      new CustomEvent('agta:profile-updated', {
        detail: {
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          chatUserName: resolveChatUserName(currentUser?.email, newDisplayName.trim()),
          fullName: newDisplayName.trim(),
          avatarUrl: avatarUrl || '',
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    appendLog('Nom du profil mis à jour');
    showStatus('Profil mis à jour.');
    setProfileModalOpen(false);
  };

  const openAvatarModal = () => {
    if (selectedAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedAvatarPreview);
    }
    setSelectedAvatarFile(null);
    setSelectedAvatarPreview(avatarUrl ?? '');
    setAvatarCropZoom(1.2);
    setAvatarModalOpen(true);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (selectedAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedAvatarPreview);
    }
    setSelectedAvatarFile(file);
    if (!file) {
      setSelectedAvatarPreview(avatarUrl ?? '');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showStatus('Veuillez choisir un fichier image valide.');
      setSelectedAvatarFile(null);
      setSelectedAvatarPreview(avatarUrl ?? '');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setSelectedAvatarPreview(localPreview);
    setAvatarCropZoom(1.2);
  };

  const createSquareCroppedAvatar = async (file: File, zoom: number): Promise<File> => {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const minSide = Math.min(width, height);
    const cropSide = Math.max(100, Math.floor(minSide / Math.max(1, zoom)));
    const sx = Math.floor((width - cropSide) / 2);
    const sy = Math.floor((height - cropSide) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      URL.revokeObjectURL(imageUrl);
      throw new Error('Impossible de créer le canvas de recadrage.');
    }

    ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, 512, 512);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92);
    });

    URL.revokeObjectURL(imageUrl);

    if (!blob) {
      throw new Error('Impossible de générer l image recadrée.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'avatar';
    return new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
  };

  const uploadAvatarToStorage = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = fileExt.replace(/[^a-z0-9]/g, '') || 'jpg';

    for (const bucket of AVATAR_BUCKET_CANDIDATES) {
      const filePath = `avatars/${userId}/${Date.now()}.${safeExt}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) {
        continue;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      if (data?.publicUrl) {
        return { publicUrl: data.publicUrl, bucket };
      }
    }

    return null;
  };

  const saveAvatar = async () => {
    if (!currentUser?.id) {
      showStatus('Session utilisateur introuvable.');
      return;
    }

    // Sécurité: vérifier que la session active correspond EXACTEMENT à cet utilisateur
    const { data: { user: activeUser } } = await supabase.auth.getUser();
    if (!activeUser || activeUser.id !== currentUser.id) {
      showStatus('Session invalide. Veuillez vous reconnecter.');
      appendLog('Echec: session utilisateur incoherente lors de l upload avatar');
      return;
    }

    if (!selectedAvatarFile) {
      showStatus('Choisissez une image depuis votre galerie.');
      return;
    }

    setAvatarSaving(true);
    let croppedFile: File;
    try {
      croppedFile = await createSquareCroppedAvatar(selectedAvatarFile, avatarCropZoom);
    } catch {
      setAvatarSaving(false);
      showStatus('Recadrage impossible. Veuillez réessayer avec une autre image.');
      appendLog('Echec recadrage avatar');
      return;
    }

    const uploaded = await uploadAvatarToStorage(croppedFile, currentUser.id);

    if (!uploaded?.publicUrl) {
      setAvatarSaving(false);
      showStatus('Upload impossible. Vérifiez le bucket Supabase pour les avatars.');
      appendLog('Echec upload avatar (storage)');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        ...currentUser?.user_metadata,
        avatar_url: uploaded.publicUrl,
        profile_picture_url: uploaded.publicUrl,
      },
    });

    if (error) {
      setAvatarSaving(false);
      showStatus('Mise à jour photo impossible.');
      appendLog('Echec mise à jour avatar');
      return;
    }

    setCurrentUser((prev: any) => ({
      ...prev,
      user_metadata: {
        ...(prev?.user_metadata ?? {}),
        profile_picture_url: uploaded.publicUrl,
        avatar_url: uploaded.publicUrl,
      },
    }));

    await syncChatProfileDirectory({ avatarUrl: uploaded.publicUrl });

    window.dispatchEvent(
      new CustomEvent('agta:profile-updated', {
        detail: {
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          chatUserName: resolveChatUserName(currentUser?.email, displayName),
          avatarUrl: uploaded.publicUrl,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    if (selectedAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(selectedAvatarPreview);
    }
    setAvatarSaving(false);
    setSelectedAvatarFile(null);
    setSelectedAvatarPreview('');
    appendLog(`Photo de profil mise à jour (${uploaded.bucket})`);
    showStatus('Photo de profil mise à jour.');
    setAvatarModalOpen(false);
  };

  const toggleWithPersistence = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    storageKey: string,
    logLabel: string,
    messageOn: string,
    messageOff: string,
  ) => {
    setter((prev) => {
      const next = !prev;
      persistBooleanPreference(storageKey, next);
      appendLog(`${logLabel}: ${next ? 'activé' : 'désactivé'}`);
      showStatus(next ? messageOn : messageOff);
      return next;
    });
  };

  const handleToggleMessages = () => {
    toggleWithPersistence(
      setNotifMessages,
      'agta-settings-notif-messages',
      'Notifications messages',
      'Notifications messages activées.',
      'Notifications messages désactivées.',
    );
  };

  const handleToggleAlerts = async () => {
    const next = !notifAlerts;
    if (next && 'Notification' in window) {
      await Notification.requestPermission();
    }
    setNotifAlerts(next);
    persistBooleanPreference('agta-settings-notif-alerts', next);
    appendLog(`Alertes système: ${next ? 'activé' : 'désactivé'}`);
    showStatus(next ? 'Alertes système activées.' : 'Alertes système désactivées.');
  };

  const handleToggleSounds = () => {
    const next = !notifSounds;
    setNotifSounds(next);
    persistBooleanPreference('agta-settings-notif-sounds', next);
    appendLog(`Sons et vibrations: ${next ? 'activé' : 'désactivé'}`);

    if (next) {
      try {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextCtor();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.04;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12);
        if (navigator.vibrate) navigator.vibrate(80);
      } catch {
        // Ignore environments that block WebAudio APIs
      }
    }

    showStatus(next ? 'Sons et vibrations activés.' : 'Sons et vibrations désactivés.');
  };

  const handleToggleInvisible = () => {
    toggleWithPersistence(
      setInvisibleMode,
      'agta-settings-invisible',
      'Mode discret',
      'Mode discret activé.',
      'Mode discret désactivé.',
    );
  };

  const handleToggleAutoBackup = () => {
    toggleWithPersistence(
      setAutoBackup,
      'agta-settings-auto-backup',
      'Sauvegarde automatique',
      'Sauvegarde auto activée.',
      'Sauvegarde auto désactivée.',
    );
  };

  const handleToggleMaintenance = () => {
    setMaintenance((prev) => {
      const next = !prev;
      persistBooleanPreference('agta-settings-maintenance', next);
      appendLog(`Mode restriction: ${next ? 'activé' : 'désactivé'}`);
      showStatus(next ? 'Mode restriction activé.' : 'Mode restriction désactivé.');
      return next;
    });
    setMaintenanceModalOpen(false);
  };

  const openMfaEnrollment = async () => {
    setMfaModalOpen(true);
    setMfaCode('');
    setMfaLoading(true);

    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setMfaLoading(false);
      showStatus('Impossible de vérifier les facteurs MFA.');
      return;
    }

    const existingTotpFactor = (factorsData.totp ?? [])[0];
    if (existingTotpFactor) {
      setMfaEnrollment({ factorId: existingTotpFactor.id });
      setMfaLoading(false);
      showStatus('Facteur MFA existant trouvé. Saisissez le code OTP pour vérifier.');
      return;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'AGTA Staff MFA',
    });

    setMfaLoading(false);

    if (error || !data?.id) {
      showStatus('Echec enrôlement MFA.');
      appendLog('Echec enrôlement MFA');
      return;
    }

    setMfaEnrollment({
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      otpauthUrl: data.totp.uri,
    });

    appendLog('Enrôlement MFA démarré');
    showStatus('QR MFA généré. Scannez puis validez avec votre code OTP.');
  };

  const verifyMfaCode = async () => {
    if (!mfaEnrollment?.factorId) {
      showStatus('Aucun facteur MFA en cours.');
      return;
    }

    const trimmedCode = mfaCode.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      showStatus('Le code OTP doit contenir 6 chiffres.');
      return;
    }

    setMfaLoading(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: mfaEnrollment.factorId,
    });

    if (challengeError || !challengeData?.id) {
      setMfaLoading(false);
      showStatus('Impossible de créer le challenge MFA.');
      appendLog('Echec challenge MFA');
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaEnrollment.factorId,
      challengeId: challengeData.id,
      code: trimmedCode,
    });

    setMfaLoading(false);

    if (verifyError) {
      showStatus('Code OTP invalide.');
      appendLog('Echec vérification MFA');
      return;
    }

    await refreshMfaStatus();
    setMfaModalOpen(false);
    setMfaEnrollment(null);
    setMfaCode('');
    appendLog('MFA activé avec succès');
    showStatus('MFA activé avec succès.');
  };

  const requestMfaToggle = () => {
    if (twoFA) {
      setDisableMfaModalOpen(true);
      return;
    }
    openMfaEnrollment();
  };

  const disableMfa = async () => {
    let factorId = activeFactorId;

    if (!factorId) {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        showStatus('Impossible de trouver le facteur MFA actif.');
        return;
      }
      factorId = (data.totp ?? []).find((f: any) => f.status === 'verified')?.id ?? null;
    }

    if (!factorId) {
      showStatus('Aucun facteur MFA actif.');
      setDisableMfaModalOpen(false);
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      showStatus('Echec de désactivation MFA.');
      appendLog('Echec désactivation MFA');
      return;
    }

    setDisableMfaModalOpen(false);
    await refreshMfaStatus();
    appendLog('MFA désactivé');
    showStatus('MFA désactivé.');
  };

  const handleExportData = async () => {
    setExportingData(true);
    const [documentsRes, reportsRes, activityRes] = await Promise.all([
      supabase.from('documents_agta').select('id,name,created_at').order('created_at', { ascending: false }).limit(25),
      supabase.from('work_logs').select('id,action,staff_name,created_at,type').order('created_at', { ascending: false }).limit(25),
      supabase.from('agta_activity').select('id,activity_type,description,created_at').order('created_at', { ascending: false }).limit(25),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        email: userEmail,
        displayName,
        role: userRole,
      },
      preferences: {
        language,
        timezone,
        notifMessages,
        notifAlerts,
        notifSounds,
        twoFA,
        invisibleMode,
        autoBackup,
        maintenance,
        lastSyncAt,
        lastPasswordResetAt,
      },
      storageAndData: {
        snapshot: dataOpsSnapshot,
        snapshotError: dataOpsError,
      },
      diagnostics: {
        documentsError: documentsRes.error?.message ?? null,
        reportsError: reportsRes.error?.message ?? null,
        activityError: activityRes.error?.message ?? null,
      },
      samples: {
        recentDocuments: documentsRes.data ?? [],
        recentWorkLogs: reportsRes.data ?? [],
        recentActivity: activityRes.data ?? [],
      },
      activityLog,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agta-settings-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportingData(false);

    appendLog('Export des données utilisateur');
    showStatus('Export JSON téléchargé (préférences + snapshots + échantillons).');
  };

  const openDatabaseDetails = async () => {
    setDatabaseModalOpen(true);
    await refreshDataOpsSnapshot(true);
  };

  const openVaultDetails = async () => {
    setVaultModalOpen(true);
    await refreshDataOpsSnapshot(true);
  };

  const purgeLocalData = () => {
    const suffixes = [
      'settings-logs',
      'settings-language',
      'settings-timezone',
      'settings-last-sync',
      'settings-last-password-reset',
      'settings-notif-messages',
      'settings-notif-alerts',
      'settings-notif-sounds',
      'settings-invisible',
      'settings-auto-backup',
      'settings-maintenance',
      'settings-rating',
    ];

    suffixes.forEach((s) => localStorage.removeItem(lsKey(s)));
    setActivityLog([]);
    setPurgeModalOpen(false);
    appendLog('Données locales purgées');
    showStatus('Données locales de test purgées.');
  };

  const copySupportEmail = async () => {
    await navigator.clipboard.writeText('support@agta.management');
    showStatus('Email support copié.');
  };

  const openFAQ = () => {
    window.open('https://supabase.com/docs', '_blank', 'noopener,noreferrer');
    appendLog('Ouverture documentation');
  };

  const ratePortal = () => {
    localStorage.setItem(lsKey('settings-rating'), '5');
    appendLog('Evaluation portail: 5/5');
    showStatus('Merci pour votre note 5/5.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = isDG ? '/login/dg' : '/login/staff';
  };

  const qrSvg = mfaEnrollment?.qrCodeSvg;
  const qrIsSvg = Boolean(qrSvg && qrSvg.trim().startsWith('<svg'));
  const qrFallbackUrl = mfaEnrollment?.otpauthUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mfaEnrollment.otpauthUrl)}`
    : '';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
          {statusMessage}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex items-center gap-5"
      >
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border border-zinc-200" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-[#C7FF00] text-2xl font-black select-none">
              {initials}
            </div>
          )}
          <button
            onClick={openAvatarModal}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#C7FF00] flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          >
            <Camera size={13} className="text-black" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">{displayName}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{userRole} — AGTA Management</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full inline-block ${invisibleMode ? 'bg-zinc-300' : 'bg-emerald-400'}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {invisibleMode ? 'Invisible' : 'En ligne'}
            </span>
          </div>
        </div>
        <button
          onClick={openProfileModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-600 transition-colors flex-shrink-0"
        >
          <Pencil size={12} /> Modifier
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Section title="Compte">
          <SettingRow
            icon={<KeyRound size={16} />}
            iconBg="bg-blue-100 text-blue-600"
            label="Changer le mot de passe"
            subtitle={`Dernier lien envoyé: ${lastPasswordResetAt}`}
            onClick={handlePasswordReset}
          />
          <SettingRow
            icon={<Smartphone size={16} />}
            iconBg="bg-violet-100 text-violet-600"
            label="Double authentification (2FA)"
            subtitle={twoFA ? 'Activée — TOTP vérifié' : 'Désactivée'}
            toggle={{ checked: twoFA, onChange: requestMfaToggle }}
          />
          <SettingRow
            icon={<Globe size={16} />}
            iconBg="bg-sky-100 text-sky-600"
            label="Langue de l'interface"
            subtitle={language}
            onClick={cycleLanguage}
          />
          <SettingRow
            icon={<Languages size={16} />}
            iconBg="bg-orange-100 text-orange-600"
            label="Fuseau horaire"
            subtitle={timezone}
            onClick={cycleTimezone}
            last
          />
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Section title="Confidentialité">
          <SettingRow
            icon={<Eye size={16} />}
            iconBg="bg-emerald-100 text-emerald-600"
            label="Dernière connexion"
            subtitle={lastSignIn}
            onClick={() => showStatus('Dernière connexion récupérée depuis la session Supabase.')}
          />
          <SettingRow
            icon={<Users size={16} />}
            iconBg="bg-teal-100 text-teal-600"
            label="Accès des membres"
            subtitle="Secrétariat & Cellule Scouting"
            onClick={() => setAccessModalOpen(true)}
          />
          <SettingRow
            icon={<Activity size={16} />}
            iconBg="bg-pink-100 text-pink-600"
            label="Logs de connexion"
            subtitle="Actions locales récentes"
            badge={`${activityLog.length}`}
            onClick={() => setLogsModalOpen(true)}
          />
          <SettingRow
            icon={<EyeOff size={16} />}
            iconBg="bg-zinc-200 text-zinc-600"
            label="Mode discret"
            subtitle="Masquer votre activité en ligne"
            toggle={{ checked: invisibleMode, onChange: handleToggleInvisible }}
            last
          />
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Section title="Notifications">
          <SettingRow
            icon={<MessageCircle size={16} />}
            iconBg="bg-[#C7FF00]/30 text-black"
            label="Notifications Messages"
            subtitle="Afficher les messages entrants"
            toggle={{ checked: notifMessages, onChange: handleToggleMessages }}
          />
          <SettingRow
            icon={<Bell size={16} />}
            iconBg="bg-yellow-100 text-yellow-600"
            label="Alertes Système"
            subtitle="Erreurs et avertissements critiques"
            toggle={{ checked: notifAlerts, onChange: handleToggleAlerts }}
          />
          <SettingRow
            icon={<Phone size={16} />}
            iconBg="bg-green-100 text-green-600"
            label="Sons & Vibrations"
            subtitle="Tonalités de notification"
            toggle={{ checked: notifSounds, onChange: handleToggleSounds }}
            last
          />
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Section title="Stockage & Données">
          <SettingRow
            icon={syncing ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
            iconBg="bg-blue-100 text-blue-600"
            label="Synchronisation Supabase"
            subtitle={syncing ? 'Synchronisation en cours...' : `Dernière sync: ${lastSyncAt}`}
            badge={dataOpsSnapshot?.syncHealthy ? 'OK' : 'Partiel'}
            onClick={handleSync}
          />
          <SettingRow
            icon={<Database size={16} />}
            iconBg="bg-indigo-100 text-indigo-600"
            label="Utilisation de la base de données"
            subtitle={dataOpsLoading ? 'Analyse des tables en cours...' : `Actifs: ${dataOpsSnapshot?.opportunitiesActive ?? 0} • Docs: ${dataOpsSnapshot?.documents ?? 0}`}
            onClick={openDatabaseDetails}
          />
          <SettingRow
            icon={<Archive size={16} />}
            iconBg="bg-amber-100 text-amber-600"
            label="Sauvegarde automatique"
            subtitle={autoBackup ? (dataOpsSnapshot?.backupNextRunLabel ?? 'Chaque nuit à 02:00 (Dubai)') : 'Désactivée pour cette session'}
            toggle={{ checked: autoBackup, onChange: handleToggleAutoBackup }}
          />
          <SettingRow
            icon={<Download size={16} />}
            iconBg="bg-cyan-100 text-cyan-600"
            label="Exporter les données"
            subtitle={exportingData ? 'Préparation de l export enrichi...' : 'Télécharger en JSON'}
            onClick={handleExportData}
          />
          <SettingRow
            icon={<Folder size={16} />}
            iconBg="bg-orange-100 text-orange-600"
            label="Coffre-fort Documents"
            subtitle={`Stockage sécurisé AGTA • ${dataOpsSnapshot?.documents ?? 0} fichiers (${formatBytes(dataOpsSnapshot?.docsTotalBytes ?? 0)})`}
            onClick={openVaultDetails}
            last
          />
        </Section>
      </motion.div>

      {dataOpsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          {dataOpsError}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Section title="Aide">
          <SettingRow
            icon={<HelpCircle size={16} />}
            iconBg="bg-zinc-100 text-zinc-500"
            label="FAQ & Documentation"
            onClick={openFAQ}
          />
          <SettingRow
            icon={<MessageCircle size={16} />}
            iconBg="bg-green-100 text-green-600"
            label="Nous contacter"
            subtitle="Support technique AGTA"
            onClick={() => setSupportModalOpen(true)}
          />
          <SettingRow
            icon={<Star size={16} />}
            iconBg="bg-yellow-100 text-yellow-500"
            label="Évaluer le portail"
            onClick={ratePortal}
          />
          <SettingRow
            icon={<Info size={16} />}
            iconBg="bg-zinc-100 text-zinc-500"
            label="À propos"
            subtitle="AGTA Portal v2.4.0 — Build 2026.04"
            onClick={() => setAboutModalOpen(true)}
            last
          />
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <button
          onClick={() => setShowDanger((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-red-100 shadow-sm hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-500 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <span className="text-sm font-bold text-red-500">Zone de restriction</span>
          </div>
          <ChevronRight size={16} className={`text-red-300 transition-transform duration-200 ${showDanger ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence>
          {showDanger && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-2"
            >
              <div
                className={`rounded-2xl border p-6 transition-all duration-500 ${maintenance ? 'bg-red-600 border-red-700' : 'bg-[#111214] border-zinc-800'}`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all ${maintenance ? 'bg-white text-red-600 border-white' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                    >
                      {maintenance ? <ShieldAlert size={26} className="animate-pulse" /> : <Lock size={26} />}
                    </div>
                    <div>
                      <p className={`font-black text-sm uppercase tracking-tight ${maintenance ? 'text-white' : 'text-zinc-100'}`}>
                        {maintenance ? 'Mode Restriction Activé' : 'Maintenance & Sécurité'}
                      </p>
                      <p className={`text-[10px] uppercase mt-1 tracking-widest ${maintenance ? 'text-white/70' : 'text-zinc-500'}`}>
                        {maintenance ? 'Accès restreint au personnel autorisé' : 'Verrouiller l accès aux bases externes'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMaintenanceModalOpen(true)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[2px] transition-all active:scale-95 flex-shrink-0 ${maintenance ? 'bg-white text-red-600 hover:bg-zinc-100' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    {maintenance ? 'Désactiver' : 'Activer la restriction'}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-700 flex gap-3">
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                  >
                    <Download size={13} /> Sauvegarder
                  </button>
                  <button
                    onClick={() => setPurgeModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/70 text-red-400 text-xs font-bold transition-colors"
                  >
                    <Trash2 size={13} /> Purger données de test
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Section>
          <SettingRow
            icon={<LogOut size={16} />}
            iconBg="bg-red-100 text-red-500"
            label="Déconnexion"
            subtitle={`Terminer la session ${displayName}`}
            onClick={handleLogout}
            danger
            last
          />
        </Section>
      </motion.div>

      <div className="text-center pt-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-10 bg-zinc-200" />
          <CheckCircle2 className="text-[#C7FF00]" size={14} />
          <div className="h-px w-10 bg-zinc-200" />
        </div>
        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[4px]">AGTA Portal v2.4.0 — Build 2026.04</p>
        <p className="text-[9px] text-zinc-200 mt-1">© AGTA Management 2026</p>
      </div>

      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>Mettez à jour votre nom affiché dans le portail.</DialogDescription>
          </DialogHeader>
          <Input value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Nom affiché" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveProfileName}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Photo de profil</DialogTitle>
            <DialogDescription>Choisissez une image, ajustez le recadrage carré, puis enregistrez.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center">
              {selectedAvatarPreview ? (
                <img
                  src={selectedAvatarPreview}
                  alt="Prévisualisation avatar"
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${avatarCropZoom})`, transformOrigin: 'center center' }}
                />
              ) : (
                <span className="text-xs text-zinc-400">Aperçu</span>
              )}
            </div>
            <div className="flex-1">
              <Input type="file" accept="image/*" onChange={handleAvatarFileChange} />
              <p className="text-[11px] text-zinc-500 mt-2">Formats recommandés: JPG, PNG, WEBP.</p>
              <div className="mt-3">
                <label className="text-[11px] text-zinc-500">Zoom recadrage: {avatarCropZoom.toFixed(1)}x</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={avatarCropZoom}
                  onChange={(e) => setAvatarCropZoom(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAvatarModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveAvatar} disabled={avatarSaving || !selectedAvatarFile}>
              {avatarSaving ? 'Upload...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mfaModalOpen} onOpenChange={setMfaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activer la double authentification</DialogTitle>
            <DialogDescription>Scannez le QR Code avec votre application Authenticator, puis saisissez le code OTP.</DialogDescription>
          </DialogHeader>

          {mfaLoading ? (
            <div className="text-sm text-zinc-500">Préparation du facteur MFA...</div>
          ) : (
            <div className="space-y-4">
              {qrIsSvg && (
                <div className="rounded-xl border border-zinc-200 p-4 flex items-center justify-center bg-white">
                  <div className="w-[220px] h-[220px]" dangerouslySetInnerHTML={{ __html: qrSvg ?? '' }} />
                </div>
              )}

              {!qrIsSvg && qrFallbackUrl && (
                <div className="rounded-xl border border-zinc-200 p-4 flex items-center justify-center bg-white">
                  <img src={qrFallbackUrl} alt="QR MFA" className="w-[220px] h-[220px]" />
                </div>
              )}

              <Input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Code OTP (6 chiffres)"
                inputMode="numeric"
              />

              <div className="text-xs text-zinc-500">
                Si votre application ne scanne pas le QR, utilisez l URL OTP ci-dessous.
              </div>
              <Input value={mfaEnrollment?.otpauthUrl ?? ''} readOnly />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMfaModalOpen(false)}>
              Fermer
            </Button>
            <Button onClick={verifyMfaCode} disabled={mfaLoading || mfaCode.length !== 6}>
              Vérifier et activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableMfaModalOpen} onOpenChange={setDisableMfaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver MFA</DialogTitle>
            <DialogDescription>Confirmez-vous la désactivation de la double authentification ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableMfaModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={disableMfa}>
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutModalOpen} onOpenChange={setAboutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>À propos</DialogTitle>
            <DialogDescription>Détails de version et de session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-zinc-700">
            <p>Produit: AGTA Management Portal</p>
            <p>Version: v2.4.0</p>
            <p>Build: 2026.04</p>
            <p>Session: {userEmail}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setAboutModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accessModalOpen} onOpenChange={setAccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accès des membres</DialogTitle>
            <DialogDescription>Récapitulatif des droits courants du compte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-zinc-700">
            <p>Rôle: {userRole}</p>
            <p>Email: {userEmail}</p>
            <p>Permissions: secrétariat, scouting, reporting.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setAccessModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logs d activité</DialogTitle>
            <DialogDescription>Dernières actions enregistrées dans les paramètres.</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-auto rounded-lg border border-zinc-200 p-3 text-xs text-zinc-700 space-y-2">
            {activityLog.length === 0 ? (
              <p>Aucun log disponible pour le moment.</p>
            ) : (
              activityLog.map((line, index) => (
                <p key={`${line}-${index}`} className="border-b border-zinc-100 pb-1 last:border-0">
                  {line}
                </p>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setLogsModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={databaseModalOpen} onOpenChange={setDatabaseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails base de données</DialogTitle>
            <DialogDescription>Session, métriques des tables et état de synchronisation Supabase.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Opportunités actives</p>
              <p className="text-xl font-black text-zinc-900">{dataOpsSnapshot?.opportunitiesActive ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Athlètes</p>
              <p className="text-xl font-black text-zinc-900">{dataOpsSnapshot?.athletes ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Publications</p>
              <p className="text-xl font-black text-zinc-900">{dataOpsSnapshot?.posts ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Rapports SEC</p>
              <p className="text-xl font-black text-zinc-900">{dataOpsSnapshot?.reports ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-zinc-700">
            <p>Projet: AGTA Portal</p>
            <p>Utilisateur: {userEmail}</p>
            <p>Dernière connexion: {lastSignIn}</p>
            <p>2FA: {twoFA ? 'Activé' : 'Désactivé'}</p>
            <p>Dernier snapshot: {dataOpsSnapshot?.capturedAt ?? 'Jamais'}</p>
          </div>

          {dataOpsSnapshot?.warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 space-y-1">
              <p className="font-bold">Alertes de collecte:</p>
              {dataOpsSnapshot.warnings.map((warning, idx) => (
                <p key={`${warning}-${idx}`}>• {warning}</p>
              ))}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => void refreshDataOpsSnapshot(true)}>
              Rafraîchir
            </Button>
            <Button onClick={() => setDatabaseModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vaultModalOpen} onOpenChange={setVaultModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coffre-fort Documents AGTA</DialogTitle>
            <DialogDescription>Vue consolidée du stockage sécurisé et accès rapide aux documents.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Fichiers indexés</p>
              <p className="text-xl font-black text-zinc-900">{dataOpsSnapshot?.documents ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Volume estimé</p>
              <p className="text-xl font-black text-zinc-900">{formatBytes(dataOpsSnapshot?.docsTotalBytes ?? 0)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Chiffrement et contrôles d accès gérés par Supabase Storage + politiques RLS AGTA.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => void refreshDataOpsSnapshot(true)}>
              Re-synchroniser
            </Button>
            <Button
              onClick={() => {
                setVaultModalOpen(false);
                navigateToTab('documents');
              }}
            >
              Ouvrir Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supportModalOpen} onOpenChange={setSupportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support technique AGTA</DialogTitle>
            <DialogDescription>Canaux de support disponibles.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-zinc-700">
            <p>Email: support@agta.management</p>
            <p>Téléphone: +971 00 000 0000</p>
            <p>Disponibilité: Lun-Sam, 08:00-20:00 GST</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copySupportEmail}>
              <Copy size={14} /> Copier email
            </Button>
            <Button onClick={() => setSupportModalOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={maintenanceModalOpen} onOpenChange={setMaintenanceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la restriction</DialogTitle>
            <DialogDescription>Cette action active ou désactive le mode de restriction globale.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleToggleMaintenance}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purgeModalOpen} onOpenChange={setPurgeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purger les données locales</DialogTitle>
            <DialogDescription>Cette action supprime les préférences et logs locaux du navigateur.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={purgeLocalData}>
              Purger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
