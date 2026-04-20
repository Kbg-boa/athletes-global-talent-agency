"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabaseStaff as supabase } from '../../lib/supabase'; // Vérifie que ce chemin est correct
import { useAppPreferences } from '../../lib/appPreferences';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Folder, 
  FileText, 
  ShieldCheck, 
  Download, 
  Search, 
  Plus, 
  FileSignature, 
  History,
  Loader2,
  Lock,
  Trash2,
  Eye,
  X
} from 'lucide-react';

type DocCategory = 'Contrats' | 'Passeports' | 'Médical' | 'Image';

interface AgtaDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  storage_path: string;
  category?: DocCategory;
  created_at: string;
}

interface DocumentAuditLog {
  id?: string;
  user_email: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

const IMAGE_EXTENSIONS = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'];
const CONTRACT_EXTENSIONS = ['PDF', 'DOC', 'DOCX'];
const MEDICAL_KEYWORDS = ['medical', 'med', 'sante', 'health', 'scan', 'rapport'];
const PASSPORT_KEYWORDS = ['passport', 'passeport', 'visa', 'id', 'identity'];
const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET || 'agta_vault').trim();

function formatSupabaseError(error: unknown, contextLabel: string): string {
  const err = (error || {}) as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };
  const message = String(err.message || '').toLowerCase();
  const details = String(err.details || '').toLowerCase();
  const hint = String(err.hint || '').toLowerCase();
  const code = String(err.code || '').toLowerCase();
  const isRls =
    code === '42501' ||
    message.includes('row-level security') ||
    details.includes('row-level security') ||
    hint.includes('policy');

  if (isRls) {
    return `${contextLabel}: accès refusé par les règles de sécurité (RLS). Vérifiez les policies Storage pour le bucket ${DOCUMENTS_BUCKET} et la session connectée.`;
  }

  return `${contextLabel}: ${err.message || 'erreur inconnue'}`;
}

function detectCategory(fileName: string, extUpper: string): DocCategory {
  const lowerName = fileName.toLowerCase();
  if (MEDICAL_KEYWORDS.some((k) => lowerName.includes(k))) return 'Médical';
  if (PASSPORT_KEYWORDS.some((k) => lowerName.includes(k))) return 'Passeports';
  if (IMAGE_EXTENSIONS.includes(extUpper)) return 'Image';
  if (CONTRACT_EXTENSIONS.includes(extUpper)) return 'Contrats';
  return 'Contrats';
}

export default function DocumentsView() {
  const { formatDate, formatDateTime } = useAppPreferences();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');
  const [documents, setDocuments] = useState<AgtaDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<DocumentAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDoc, setPreviewDoc] = useState<AgtaDocument | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isPreviewable = (doc: AgtaDocument) => {
    const ext = (doc.type || '').toUpperCase();
    return ext === 'PDF' || IMAGE_EXTENSIONS.includes(ext);
  };

  const getCurrentUserEmail = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email || 'session@agta.local';
  };

  const appendLocalAuditFallback = (entry: DocumentAuditLog) => {
    try {
      const key = 'agta_documents_audit_local';
      const current = localStorage.getItem(key);
      const parsed = current ? (JSON.parse(current) as DocumentAuditLog[]) : [];
      const next = [{ ...entry, id: `local-${Date.now()}`, created_at: new Date().toISOString() }, ...parsed].slice(0, 40);
      localStorage.setItem(key, JSON.stringify(next));
      setAuditLogs((prev) => [next[0], ...prev].slice(0, 40));
    } catch {
      // Ignore local fallback errors.
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('agta_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80);

      if (error || !data) throw error;
      const filtered = (data as DocumentAuditLog[]).filter((row) => {
        const type = (row.activity_type || '').toLowerCase();
        const source = String(row.metadata?.source || '').toLowerCase();
        return type.startsWith('document_') || source === 'documents';
      }).slice(0, 20);
      setAuditLogs(filtered);
    } catch {
      try {
        const localRaw = localStorage.getItem('agta_documents_audit_local');
        const localLogs = localRaw ? (JSON.parse(localRaw) as DocumentAuditLog[]) : [];
        setAuditLogs(localLogs.slice(0, 20));
      } catch {
        setAuditLogs([]);
      }
    } finally {
      setAuditLoading(false);
    }
  };

  const logDocumentAudit = async (activityType: 'document_upload' | 'document_download' | 'document_delete', doc: Pick<AgtaDocument, 'id' | 'name' | 'storage_path' | 'type' | 'category'>) => {
    const userEmail = await getCurrentUserEmail();
    const payload: DocumentAuditLog = {
      user_email: userEmail,
      activity_type: activityType,
      description: `${activityType.replace('document_', '').toUpperCase()} - ${doc.name}`,
      metadata: {
        source: 'documents',
        document_id: doc.id,
        document_name: doc.name,
        document_type: doc.type,
        category: doc.category || 'Contrats',
        storage_path: doc.storage_path,
      },
    };

    try {
      const { error } = await supabase.from('agta_activity').insert([payload]);
      if (error) throw error;
      fetchAuditLogs();
    } catch {
      appendLocalAuditFallback(payload);
    }
  };

  // 1. CHARGEMENT DES DOCUMENTS DEPUIS SUPABASE
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents_agta') // Nom de ta table dans Supabase
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const normalized = (data as AgtaDocument[]).map((doc) => {
          const ext = (doc.type || doc.name.split('.').pop() || 'DOC').toUpperCase();
          return {
            ...doc,
            type: ext,
            category: (doc.category as DocCategory | undefined) || detectCategory(doc.name, ext),
          };
        });
        setDocuments(normalized);
      }
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 2. FONCTION D'UPLOAD RÉELLE (CLOUD STORAGE)
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const files = Array.from(e.target.files);
      for (const file of files) {
        const fileExt = (file.name.split('.').pop() || 'doc').toUpperCase();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt.toLowerCase()}`;
        const filePath = `vault/${safeName}`;

        // A. Envoyer le fichier au Storage
        const { error: uploadError } = await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        // B. Enregistrer les infos en base de données
        const { error: dbError } = await supabase
          .from('documents_agta')
          .insert([{
            name: file.name,
            type: fileExt,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            storage_path: filePath,
            category: detectCategory(file.name, fileExt),
          }]);

        if (dbError) throw dbError;
        await logDocumentAudit('document_upload', {
          id: filePath,
          name: file.name,
          storage_path: filePath,
          type: fileExt,
          category: detectCategory(file.name, fileExt),
        });
      }

      fetchDocs(); // Rafraîchir la liste
      e.target.value = '';
    } catch (error: any) {
      alert(formatSupabaseError(error, 'Erreur AGTA'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: AgtaDocument) => {
    const confirmDelete = confirm(`Supprimer ${doc.name} du coffre-fort ?`);
    if (!confirmDelete) return;

    try {
      setDeletingId(doc.id);
      const { error: storageError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([doc.storage_path]);

      // Continue even if storage file is missing; DB deletion must still happen.
      if (storageError) {
        console.warn('Suppression storage:', storageError.message);
      }

      const { error: dbError } = await supabase
        .from('documents_agta')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      await logDocumentAudit('document_delete', doc);
    } catch (error: any) {
      alert(formatSupabaseError(error, 'Erreur suppression'));
    } finally {
      setDeletingId(null);
    }
  };

  // 3. TÉLÉCHARGEMENT RÉEL
  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
    if (error) return alert(formatSupabaseError(error, 'Erreur de récupération'));
    
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePreview = async (doc: AgtaDocument) => {
    if (!isPreviewable(doc)) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewDoc(doc);

    try {
      const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(doc.storage_path);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(data);
      setPreviewUrl(blobUrl);
    } catch (error: any) {
      alert(formatSupabaseError(error, 'Prévisualisation impossible'));
      setPreviewOpen(false);
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDoc(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  };

  const auditRows = useMemo(() => {
    return auditLogs.map((row) => {
      const type = (row.activity_type || '').toLowerCase();
      const label = type.includes('upload')
        ? 'Upload'
        : type.includes('download')
          ? 'Téléchargement'
          : type.includes('delete')
            ? 'Suppression'
            : row.activity_type;
      return {
        ...row,
        label,
        docName: String(row.metadata?.document_name || row.description || 'Document'),
      };
    });
  }, [auditLogs]);

  const categories = [
    { name: "Contrats" as DocCategory, count: documents.filter((d) => d.category === 'Contrats').length, icon: <FileSignature size={22} className="text-blue-500" /> },
    { name: "Passeports" as DocCategory, count: documents.filter((d) => d.category === 'Passeports').length, icon: <Folder size={22} className="text-amber-500" /> },
    { name: "Médical" as DocCategory, count: documents.filter((d) => d.category === 'Médical').length, icon: <History size={22} className="text-red-500" /> },
    { name: "Image" as DocCategory, count: documents.filter((d) => d.category === 'Image').length, icon: <ShieldCheck size={22} className="text-[#C7FF00]" /> },
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' ? true : doc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      
      {/* BARRE D'ACTION */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative w-full md:w-2/3 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C7FF00] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher dans les archives de la direction..." 
            className="w-full bg-white border border-zinc-100 py-5 pl-14 pr-6 rounded-[25px] text-[11px] font-black uppercase tracking-wider focus:outline-none focus:border-[#C7FF00] shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <label className="w-full md:w-auto bg-black text-[#C7FF00] px-10 py-5 rounded-[25px] text-[11px] font-black uppercase tracking-[3px] flex items-center justify-center gap-4 hover:shadow-2xl active:scale-95 transition-all cursor-pointer group">
          {uploading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} className="group-hover:rotate-90 transition-transform" />}
          {uploading ? "SÉCURISATION..." : "IMPORTER"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} multiple />
        </label>
      </div>

      {/* GRILLE DES DOSSIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          return (
          <motion.button
            key={cat.name}
            whileHover={{ y: -8 }}
            onClick={() => setActiveCategory((prev) => (prev === cat.name ? 'all' : cat.name))}
            className={`text-left bg-white p-7 rounded-[40px] border shadow-sm transition-all cursor-pointer group ${isActive ? 'border-[#C7FF00] ring-2 ring-[#C7FF00]/30' : 'border-zinc-100'}`}
          >
            <div className="w-16 h-16 bg-zinc-50 rounded-[22px] flex items-center justify-center mb-8 group-hover:bg-black transition-all shadow-inner">
              {cat.icon}
            </div>
            <h4 className="font-black text-zinc-900 uppercase text-[12px] tracking-tight mb-2">{cat.name}</h4>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{cat.count} Documents</p>
          </motion.button>
        )})}
      </div>

      {/* COFFRE-FORT AGTA */}
      <div className="bg-[#111214] rounded-[50px] p-8 md:p-14 text-white border border-zinc-800 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none rotate-12">
          <Lock size={300} />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 relative z-10 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-[#C7FF00] rounded-full animate-pulse shadow-[0_0_10px_#C7FF00]"></div>
              <h3 className="text-[#C7FF00] font-black text-2xl uppercase tracking-tighter italic">Coffre-fort AGTA</h3>
            </div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[3px] ml-5">Security Protocol: AES-256 Enabled</p>
          </div>
          
          <div className="bg-zinc-800/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-zinc-700/50 flex items-center gap-4">
             <ShieldCheck className="text-[#C7FF00]" size={16} />
             <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Cloud Kinshasa-Dubai Actif</span>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-4">
              <Loader2 className="animate-spin text-zinc-500" />
              <p className="text-[9px] font-black uppercase text-zinc-500">Accès sécurisé en cours...</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredDocuments.map((doc) => (
                <motion.div 
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 15, backgroundColor: "rgba(255,255,255,0.06)" }}
                  className="flex items-center justify-between p-6 rounded-[30px] bg-white/[0.03] border border-white/[0.05] hover:border-[#C7FF00]/40 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-[#C7FF00] transition-all">
                      <FileText className="text-zinc-500 group-hover:text-black" size={24} />
                    </div>
                    <div>
                      <p className="text-[13px] font-black uppercase tracking-tight group-hover:text-[#C7FF00] transition-colors">{doc.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                         <span className="text-[8px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase">{doc.type}</span>
                         <span className="text-[8px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 uppercase">{doc.category || 'Contrats'}</span>
                         <span className="text-[9px] text-zinc-600 font-bold uppercase">{doc.size} • {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handlePreview(doc)}
                      disabled={!isPreviewable(doc)}
                      className="p-4 bg-zinc-800/50 rounded-2xl hover:bg-[#C7FF00] hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isPreviewable(doc) ? 'Prévisualiser' : 'Prévisualisation disponible pour PDF/images'}
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={async () => {
                        await handleDownload(doc.storage_path, doc.name);
                        await logDocumentAudit('document_download', doc);
                      }}
                      className="p-4 bg-zinc-800/50 rounded-2xl hover:bg-white hover:text-black transition-all"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="p-4 bg-zinc-800/50 rounded-2xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      {deletingId === doc.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </motion.div>
              ))}

              {!loading && filteredDocuments.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 rounded-[30px] bg-white/[0.03] border border-white/[0.05]">
                  <FileText className="mx-auto text-zinc-600 mb-3" size={26} />
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-zinc-500">
                    Aucun document trouvé pour cette recherche
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[#C7FF00] font-black uppercase tracking-wider text-sm">Historique d'audit documentaire</h4>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-[10px] font-black uppercase tracking-wider"
            >
              Actualiser
            </button>
          </div>

          {auditLoading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <Loader2 size={14} className="animate-spin" /> Chargement de l'audit...
            </div>
          ) : auditRows.length === 0 ? (
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Aucun événement d'audit pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {auditRows.map((row, idx) => (
                <div key={row.id || `${row.docName}-${idx}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{row.docName}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                      {row.label} par {row.user_email || 'session locale'}
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {row.created_at ? formatDateTime(row.created_at) : 'maintenant'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800/50 flex justify-center">
           <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-[4px]">
             Système de management documentaire réservé à la direction générale
           </p>
        </div>
      </div>

      <AnimatePresence>
        {previewOpen && previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closePreview}
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="w-full max-w-5xl h-[84vh] bg-[#111214] border border-zinc-800 rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">Prévisualisation - {previewDoc.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">{previewDoc.type} • {previewDoc.size}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await handleDownload(previewDoc.storage_path, previewDoc.name);
                      await logDocumentAudit('document_download', previewDoc);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-800 text-white hover:bg-white hover:text-black transition text-xs"
                  >
                    Télécharger
                  </button>
                  <button onClick={closePreview} className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="h-[calc(84vh-56px)] bg-zinc-950 flex items-center justify-center">
                {previewLoading ? (
                  <Loader2 className="animate-spin text-zinc-500" />
                ) : previewUrl ? (
                  previewDoc.type.toUpperCase() === 'PDF' ? (
                    <iframe src={previewUrl} className="w-full h-full" title={`preview-${previewDoc.id}`} />
                  ) : (
                    <img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-full object-contain" />
                  )
                ) : (
                  <p className="text-zinc-500 text-sm">Aperçu indisponible.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}