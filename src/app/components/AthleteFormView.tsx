"use client";

import { useMemo, useState } from 'react';
import { supabase, supabaseStaff } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Upload,
  Link,
  Video,
  FileText,
  Image,
} from 'lucide-react';

type FormState = {
  name: string;
  sport: string;
  position: string;
  club: string;
  value: string;
  status: string;
  location: string;
  nationality: string;
  bio: string;
  achievements: string;
  age: string;
  email: string;
  phone: string;
  height: string;
  weight: string;
  portfolioUrl: string;
  websiteUrl: string;
  youtubeUrl: string;
  highlightUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  xUrl: string;
};

type UploadResult = {
  publicUrl: string | null;
  storagePath: string | null;
};

const MAX_PHOTO_FILES = 20;
const MAX_VIDEO_FILES = 10;
const MIN_DOC_SIZE_BYTES = 5 * 1024 * 1024;

const SPORTS = [
  'Football',
  'Basketball',
  'Athletisme',
  'Boxe',
  'Tennis',
  'Natation',
  'Volleyball',
  'Handball',
  'Judo',
  'Karate',
  'Taekwondo',
  'Rugby',
  'Cyclisme',
  'Gymnastique',
  'MMA',
  'Escrime',
  'Autre',
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czechia', "Cote d'Ivoire", 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const initialState: FormState = {
  name: '',
  sport: '',
  position: '',
  club: '',
  value: '',
  status: 'Actif',
  location: '',
  nationality: 'RDC',
  bio: '',
  achievements: '',
  age: '',
  email: '',
  phone: '',
  height: '',
  weight: '',
  portfolioUrl: '',
  websiteUrl: '',
  youtubeUrl: '',
  highlightUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  linkedinUrl: '',
  facebookUrl: '',
  xUrl: '',
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidUrlOrEmpty = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const safeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

type AthleteFormViewProps = {
  mode?: 'staff' | 'public';
};

export default function AthleteFormView({ mode = 'staff' }: AthleteFormViewProps) {
  const isPublic = mode === 'public';
  const client = isPublic ? supabase : supabaseStaff;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [formData, setFormData] = useState<FormState>(initialState);

  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  const profileScore = useMemo(() => {
    const checkpoints = [
      formData.name,
      formData.sport,
      formData.position,
      formData.club,
      formData.value,
      formData.status,
      formData.location,
      formData.bio,
      formData.achievements,
      formData.age,
      formData.email,
      formData.phone,
      formData.height,
      formData.weight,
      formData.portfolioUrl,
      formData.websiteUrl,
      formData.youtubeUrl,
      formData.highlightUrl,
      formData.instagramUrl,
      formData.tiktokUrl,
      formData.linkedinUrl,
      formData.facebookUrl,
      formData.xUrl,
      profilePhotoFile ? '1' : '',
      photoFiles.length > 0 ? '1' : '',
      videoFiles.length > 0 ? '1' : '',
      cvFile ? '1' : '',
      portfolioFile ? '1' : '',
    ];

    const filled = checkpoints.filter((item) => item && String(item).trim().length > 0).length;
    return Math.round((filled / checkpoints.length) * 100);
  }, [cvFile, formData, photoFiles.length, portfolioFile, profilePhotoFile, videoFiles.length]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadOptionalFile = async (file: File, prefix: string): Promise<UploadResult> => {
    const fileName = `${prefix}_${Date.now()}_${safeFileName(file.name)}`;
    const path = `recruitment/${fileName}`;

    const buckets = ['athlete-files', 'agta-files'];

    for (const bucket of buckets) {
      const uploadTry = await client.storage.from(bucket).upload(path, file, { upsert: true });
      if (!uploadTry.error) {
        const { data } = client.storage.from(bucket).getPublicUrl(path);
        return {
          publicUrl: data.publicUrl || null,
          storagePath: path,
        };
      }
    }

    return { publicUrl: null, storagePath: null };
  };

  const uploadOptionalFiles = async (files: File[], prefix: string): Promise<string[]> => {
    const uploads = await Promise.all(files.map((file) => uploadOptionalFile(file, prefix)));
    return uploads.map((result) => result.publicUrl).filter((url): url is string => Boolean(url));
  };

  const buildExperiencePayload = (
    profilePhotoUrl: string | null,
    uploadedPhotoUrls: string[],
    uploadedVideoUrls: string[],
    uploadedPortfolioUrl: string | null
  ) => {
    const bio = formData.bio.trim() || 'Aucune bio fournie.';
    const achievements = formData.achievements.trim() || 'Aucun palmares renseigne.';

    const links = {
      website: toNullable(formData.websiteUrl),
      portfolio_link: toNullable(formData.portfolioUrl),
      youtube: toNullable(formData.youtubeUrl),
      video_highlight: toNullable(formData.highlightUrl),
      instagram: toNullable(formData.instagramUrl),
      tiktok: toNullable(formData.tiktokUrl),
      linkedin: toNullable(formData.linkedinUrl),
      facebook: toNullable(formData.facebookUrl),
      x: toNullable(formData.xUrl),
      profile_photo_url: profilePhotoUrl,
      photo_urls: uploadedPhotoUrls.length ? uploadedPhotoUrls.join(', ') : null,
      video_urls: uploadedVideoUrls.length ? uploadedVideoUrls.join(', ') : null,
      portfolio_file_url: uploadedPortfolioUrl,
    };

    const linksSummary = Object.entries(links)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');

    return [
      `Bio: ${bio}`,
      `Palmares: ${achievements}`,
      `Statut: ${formData.status || 'Actif'}`,
      `Localisation: ${formData.location || 'N/A'}`,
      `Profil enrichi: ${profileScore}% (plus le score est haut, plus la candidature est competitive)`,
      linksSummary ? `Liens & assets: ${linksSummary}` : 'Liens & assets: aucun fourni',
    ].join('\n');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', msg: '' });

    if (!toNullable(formData.email)) {
      setLoading(false);
      setStatus({
        type: 'error',
        msg: 'Erreur: le champ email est obligatoire pour envoyer la confirmation de candidature.',
      });
      return;
    }

    const invalidUrlField = [
      formData.portfolioUrl,
      formData.websiteUrl,
      formData.youtubeUrl,
      formData.highlightUrl,
      formData.instagramUrl,
      formData.tiktokUrl,
      formData.linkedinUrl,
      formData.facebookUrl,
      formData.xUrl,
    ].some((url) => !isValidUrlOrEmpty(url));

    if (invalidUrlField) {
      setLoading(false);
      setStatus({
        type: 'error',
        msg: 'Erreur: un ou plusieurs liens sont invalides. Utilise un format http(s)://...'
      });
      return;
    }

    if (photoFiles.length > MAX_PHOTO_FILES || videoFiles.length > MAX_VIDEO_FILES) {
      setLoading(false);
      setStatus({
        type: 'error',
        msg: `Erreur: maximum ${MAX_PHOTO_FILES} photos et ${MAX_VIDEO_FILES} videos autorisees.`,
      });
      return;
    }

    if (cvFile && cvFile.size < MIN_DOC_SIZE_BYTES) {
      setLoading(false);
      setStatus({
        type: 'error',
        msg: 'Erreur: le CV doit avoir une taille minimale de 5 MB.',
      });
      return;
    }

    if (portfolioFile && portfolioFile.size < MIN_DOC_SIZE_BYTES) {
      setLoading(false);
      setStatus({
        type: 'error',
        msg: 'Erreur: le document portfolio doit avoir une taille minimale de 5 MB.',
      });
      return;
    }

    try {
      const [profilePhotoUpload, photoUploads, videoUploads, cvUpload, portfolioUpload] = await Promise.all([
        profilePhotoFile ? uploadOptionalFile(profilePhotoFile, 'profile_photo') : Promise.resolve({ publicUrl: null, storagePath: null }),
        photoFiles.length ? uploadOptionalFiles(photoFiles, 'photo') : Promise.resolve([]),
        videoFiles.length ? uploadOptionalFiles(videoFiles, 'video') : Promise.resolve([]),
        cvFile ? uploadOptionalFile(cvFile, 'cv') : Promise.resolve({ publicUrl: null, storagePath: null }),
        portfolioFile ? uploadOptionalFile(portfolioFile, 'portfolio') : Promise.resolve({ publicUrl: null, storagePath: null }),
      ]);

      const athleteData = {
        full_name: formData.name.trim(),
        sport: formData.sport.trim(),
        position: toNullable(formData.position) || 'N/A',
        nationality: toNullable(formData.nationality) || 'RDC',
        club: toNullable(formData.club),
        value: toNullable(formData.value),
        experience: buildExperiencePayload(profilePhotoUpload.publicUrl, photoUploads, videoUploads, portfolioUpload.publicUrl),
        age: toNullable(formData.age),
        email: toNullable(formData.email),
        phone: toNullable(formData.phone),
        height: toNullable(formData.height),
        weight: toNullable(formData.weight),
        video_url: videoUploads[0] || toNullable(formData.highlightUrl) || toNullable(formData.youtubeUrl),
        cv_url: cvUpload.publicUrl,
        status: 'pending',
        submitted_by: isPublic ? 'athlete' : 'staff',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await client.from('recruitment').insert([athleteData]);

      if (error) {
        throw error;
      }

      setStatus({
        type: 'success',
        msg: isPublic
          ? 'Candidature envoyee avec succes. Notre equipe vous contactera rapidement.'
          : 'Fiche transmise avec succes. Le profil enrichi augmente les chances de selection.',
      });
      setFormData(initialState);
      setProfilePhotoFile(null);
      setPhotoFiles([]);
      setVideoFiles([]);
      setCvFile(null);
      setPortfolioFile(null);
    } catch (err: any) {
      console.error('Error details:', err);
      setStatus({
        type: 'error',
        msg: `Erreur: ${err?.message || 'verifie la connexion ou les policies Supabase.'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 ${isPublic ? 'join-public-form' : ''}`}>
      {isPublic ? (
        <style>{`
          .join-public-form .agta-form-card {
            background: linear-gradient(160deg, rgba(16,18,22,0.95) 0%, rgba(10,10,10,0.96) 100%);
            border: 1px solid rgba(199,255,0,0.22);
            box-shadow: 0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(199,255,0,0.08);
            border-radius: 34px;
          }
          .join-public-form .agta-form-section {
            background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%);
            border: 1px solid rgba(199,255,0,0.18);
            border-radius: 24px;
          }
          .join-public-form .agta-score-card {
            background: rgba(199,255,0,0.08);
            border: 1px solid rgba(199,255,0,0.35);
            border-radius: 18px;
          }
          .join-public-form input,
          .join-public-form textarea,
          .join-public-form select {
            background: rgba(14,16,20,0.96) !important;
            border-color: rgba(199,255,0,0.25) !important;
            color: #f4f4f5 !important;
            border-radius: 16px !important;
          }
          .join-public-form input::placeholder,
          .join-public-form textarea::placeholder {
            color: #a1a1aa !important;
          }
          .join-public-form input:focus,
          .join-public-form textarea:focus,
          .join-public-form select:focus {
            border-color: rgba(199,255,0,0.8) !important;
            box-shadow: 0 0 0 1px rgba(199,255,0,0.35), 0 0 30px rgba(199,255,0,0.12);
            outline: none;
          }
        `}</style>
      ) : null}

      <div className="agta-form-card bg-white p-8 md:p-12 rounded-[45px] shadow-2xl shadow-zinc-200/50 border border-zinc-100">
        <div className="flex items-center justify-between gap-5 mb-12">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-black rounded-[22px] flex items-center justify-center text-[#C7FF00] shadow-xl shadow-[#C7FF00]/10">
              <UserPlus size={28} />
            </div>
            <div>
              <h3 className={`text-2xl font-black tracking-tighter leading-none ${isPublic ? 'text-[#C7FF00]' : 'text-zinc-900'}`}>
                {isPublic ? 'Candidature Athlete' : 'Nouvel Athlete'}
              </h3>
              <p className={`text-xs mt-2 ${isPublic ? 'text-zinc-300' : 'text-zinc-500'}`}>Remplir les informations du profil</p>
            </div>
          </div>

          <div className="agta-score-card min-w-[180px] rounded-2xl border border-zinc-200 p-4 bg-zinc-50">
            <p className={`text-[10px] font-black uppercase tracking-[2px] ${isPublic ? 'text-zinc-300' : 'text-zinc-500'}`}>Score Profil</p>
            <p className={`text-2xl font-black mt-1 ${isPublic ? 'text-[#C7FF00]' : 'text-zinc-900'}`}>{profileScore}%</p>
            <p className={`text-[10px] font-bold mt-1 ${isPublic ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {profileScore === 0
                ? 'Profil incomplet - ajoutez des informations pour augmenter la visibilite.'
                : 'Plus complet = plus de chances'}
            </p>
            <div className={`w-full h-2 rounded-full mt-2 overflow-hidden ${isPublic ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <div className="h-full bg-[#C7FF00]" style={{ width: `${profileScore}%` }} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-10">
          <div className="agta-form-section rounded-3xl border border-zinc-100 p-6 bg-zinc-50/50">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4 text-[#8AAE00]" />
              <h4 className={`text-[11px] font-black uppercase tracking-[2px] ${isPublic ? 'text-zinc-100' : 'text-zinc-700'}`}>Identite</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-[2px] ml-1 ${isPublic ? 'text-zinc-300' : 'text-zinc-400'}`}>Nom complet *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border-zinc-200 border-2 p-5 rounded-2xl outline-none focus:border-black transition-all font-bold text-black placeholder-zinc-400"
                  placeholder="ex: Exauce Ikamba"
                  value={formData.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>

              <div className="group space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-[2px] ml-1 ${isPublic ? 'text-zinc-300' : 'text-zinc-400'}`}>Sport</label>
                <select
                  required
                  className="w-full bg-white border-zinc-200 border-2 p-5 rounded-2xl outline-none focus:border-black transition-all font-bold text-black"
                  value={formData.sport}
                  onChange={(e) => setField('sport', e.target.value)}
                >
                  <option value="">Choisir...</option>
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="agta-form-section rounded-3xl border border-zinc-100 p-6">
            <h4 className={`text-[11px] font-black uppercase tracking-[2px] mb-6 ${isPublic ? 'text-zinc-100' : 'text-zinc-700'}`}>Physique & Club</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Poste / Specialite</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="Ex: Avant, Gardien, Milieu..."
                  value={formData.position}
                  onChange={(e) => setField('position', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Club actuel</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="Nom du club"
                  value={formData.club}
                  onChange={(e) => setField('club', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Localisation</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: Kinshasa, DRC"
                  value={formData.location}
                  onChange={(e) => setField('location', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Valeur marchande</label>
                <input
                  type="text"
                  className="w-full bg-white border border-[#C7FF00]/30 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: $High Potential Prospect"
                  value={formData.value}
                  onChange={(e) => setField('value', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Statut</label>
                <select
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black"
                  value={formData.status}
                  onChange={(e) => setField('status', e.target.value)}
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Age</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: 23"
                  value={formData.age}
                  onChange={(e) => setField('age', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Nationalite</label>
                <input
                  type="text"
                  list="countries-list"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: DR Congo"
                  value={formData.nationality}
                  onChange={(e) => setField('nationality', e.target.value)}
                />
                <datalist id="countries-list">
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="athlete@example.com"
                  value={formData.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Telephone</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="+243 xxx xxx xxx"
                  value={formData.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Taille</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: 2.04 m"
                  value={formData.height}
                  onChange={(e) => setField('height', e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Poids</label>
                <input
                  type="text"
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400"
                  placeholder="ex: 95 kg"
                  value={formData.weight}
                  onChange={(e) => setField('weight', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="agta-form-section rounded-3xl border border-zinc-100 p-6">
            <h4 className={`text-[11px] font-black uppercase tracking-[2px] mb-6 ${isPublic ? 'text-zinc-100' : 'text-zinc-700'}`}>Profil & Palmares</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Bio / Description</label>
                <textarea
                  rows={4}
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-medium text-black placeholder-zinc-400 resize-none"
                  placeholder="Presentation courte de lathlete..."
                  value={formData.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Palmares (separes par |)</label>
                <textarea
                  rows={3}
                  className="w-full bg-white border border-zinc-200 p-5 rounded-2xl outline-none text-sm font-medium text-black placeholder-zinc-400 resize-none"
                  placeholder="National Team Player | BAL Qualified | All-Star 2025"
                  value={formData.achievements}
                  onChange={(e) => setField('achievements', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="agta-form-section rounded-3xl border border-zinc-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="w-4 h-4 text-zinc-600" />
              <h4 className={`text-[11px] font-black uppercase tracking-[2px] ${isPublic ? 'text-zinc-100' : 'text-zinc-700'}`}>Assets Optionnels (fortement recommandes)</h4>
            </div>

            <p className={`text-xs mb-4 ${isPublic ? 'text-zinc-300' : 'text-zinc-500'}`}>Augmentent significativement les chances de visibilite et de contrat.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2"><Image className="w-4 h-4" /> Photo Profil</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-black file:text-black"
                />
                <p className="text-xs text-zinc-500">Photo principale affichee dans Liste Profils</p>
                {profilePhotoFile ? (
                  <p className="text-xs text-zinc-600">{profilePhotoFile.name}</p>
                ) : <p className="text-xs text-zinc-400">Aucun fichier na ete selectionne</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2"><Image className="w-4 h-4" /> Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files || []).slice(0, MAX_PHOTO_FILES))}
                  className="w-full text-sm text-black file:text-black"
                />
                <p className="text-xs text-zinc-500">Jusqua {MAX_PHOTO_FILES} photos</p>
                {photoFiles.length > 0 ? (
                  <p className="text-xs text-zinc-600">{photoFiles.length} photo(s) selectionnee(s)</p>
                ) : <p className="text-xs text-zinc-400">Aucun fichier na ete selectionne</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2"><Video className="w-4 h-4" /> Video (fichier)</label>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => setVideoFiles(Array.from(e.target.files || []).slice(0, MAX_VIDEO_FILES))}
                  className="w-full text-sm text-black file:text-black"
                />
                <p className="text-xs text-zinc-500">Jusqua {MAX_VIDEO_FILES} videos</p>
                {videoFiles.length > 0 ? (
                  <p className="text-xs text-zinc-600">{videoFiles.length} video(s) selectionnee(s)</p>
                ) : <p className="text-xs text-zinc-400">Aucun fichier na ete selectionne</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2"><FileText className="w-4 h-4" /> CV</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] || null)} className="w-full text-sm text-black file:text-black" />
                <p className="text-xs text-zinc-500">Un seul document, taille minimale 5 MB</p>
                {cvFile ? <p className="text-xs text-zinc-600">{cvFile.name} ({(cvFile.size / (1024 * 1024)).toFixed(2)} MB)</p> : <p className="text-xs text-zinc-400">Aucun fichier na ete selectionne</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2"><FileText className="w-4 h-4" /> Portfolio (fichier)</label>
                <input type="file" accept=".pdf,.ppt,.pptx,.zip" onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)} className="w-full text-sm text-black file:text-black" />
                <p className="text-xs text-zinc-500">Un seul document, taille minimale 5 MB</p>
                {portfolioFile ? <p className="text-xs text-zinc-600">{portfolioFile.name} ({(portfolioFile.size / (1024 * 1024)).toFixed(2)} MB)</p> : <p className="text-xs text-zinc-400">Aucun fichier na ete selectionne</p>}
              </div>
            </div>
          </div>

          <div className="agta-form-section rounded-3xl border border-zinc-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Link className="w-4 h-4 text-zinc-600" />
              <h4 className={`text-[11px] font-black uppercase tracking-[2px] ${isPublic ? 'text-zinc-100' : 'text-zinc-700'}`}>Liens optionnels (augmentent les chances)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="url" placeholder="Lien portfolio (https://...)" value={formData.portfolioUrl} onChange={(e) => setField('portfolioUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="Site web perso (https://...)" value={formData.websiteUrl} onChange={(e) => setField('websiteUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="Lien YouTube (https://...)" value={formData.youtubeUrl} onChange={(e) => setField('youtubeUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="Lien Video Highlights (https://...)" value={formData.highlightUrl} onChange={(e) => setField('highlightUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="Instagram (https://...)" value={formData.instagramUrl} onChange={(e) => setField('instagramUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="TikTok (https://...)" value={formData.tiktokUrl} onChange={(e) => setField('tiktokUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="LinkedIn (https://...)" value={formData.linkedinUrl} onChange={(e) => setField('linkedinUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="Facebook (https://...)" value={formData.facebookUrl} onChange={(e) => setField('facebookUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400" />
              <input type="url" placeholder="X / Twitter (https://...)" value={formData.xUrl} onChange={(e) => setField('xUrl', e.target.value)} className="w-full bg-white border border-zinc-200 p-4 rounded-2xl outline-none text-sm font-bold text-black placeholder-zinc-400 md:col-span-2" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-6 rounded-3xl font-black uppercase tracking-[5px] text-[11px] transition-all shadow-2xl flex items-center justify-center gap-4 ${
                loading
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-black text-[#C7FF00] hover:bg-[#C7FF00] hover:text-black hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={18} /> Traitement...</>
              ) : (
                <>{isPublic ? 'Envoyer ma candidature' : 'Transmettre la fiche'}</>
              )}
            </button>
          </div>

          <AnimatePresence>
            {status.msg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-5 rounded-3xl flex items-center justify-center gap-3 text-sm font-bold ${
                  status.type === 'success'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {status.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
