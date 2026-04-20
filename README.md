
# 🚀 AGTA Management Portal

**Plateforme complète de scouting mondial pour l'agence AGTA**

## 🏗️ Architecture du Système

### 3 Espaces Séparés

#### 👑 **1. ADMIN DG** (`/admin-dashboard`)
- **Accès**: Mathieu (DG) uniquement
- **URL**: `/admin-dashboard`
- **Fonctionnalités**:
  - 📊 Dashboard global avec radar, compteur valeur, horloges mondiales
  - 📂 Gestion complète des athlètes (CRUD)
  - 🎯 Recrutement - validation des candidatures
  - 💼 Opportunités - publication d'offres
  - 💰 Paiements - suivi des revenus
  - 👥 Recruteurs - gestion des utilisateurs payants
  - 📢 Publication - autopublish sur réseaux sociaux
  - 📁 Documents - contrats, CV, passeports
  - ⚙️ Settings - configuration

#### 👩‍💼 **2. DASHBOARD SECRÉTAIRE** (`/staff-dashboard`)
- **Accès**: Secrétaire Kinshasa
- **URL**: `/staff-dashboard`
- **Fonctionnalités**:
  - 📂 Nouvel Athlète - création de profils validés
  - 📋 Liste Profils - gestion des athlètes
  - 🎯 Recrutement - accept/reject candidatures
  - 📥 Messages - communication
  - 📁 Documents - upload et classement
  - 📊 Rapports - activité et statistiques
  - 📅 Journal Journalier - rapports quotidiens

#### 🧑‍💼 **3. INSCRIPTION ATHLÈTE** (`/join`)
- **Accès**: Public
- **URL**: `/join`
- **Fonctionnalités**:
  - 📥 Formulaire complet d'inscription
  - 📹 Upload vidéo et CV
  - 🔁 Workflow automatique vers recrutement

## 🗄️ Base de Données Supabase

### Tables Principales

```sql
- agta_activity     # Journal d'activité
- athletes         # Profils athlètes validés
- recruitment      # Candidatures en attente
- payments         # Suivi des revenus
- recruiters       # Utilisateurs payants
- opportunities    # Offres d'emploi
- documents        # Fichiers uploadés
```

### Configuration

1. **Créer un projet Supabase**
2. **Exécuter le script SQL** `SUPABASE_SETUP.sql`
3. **Configurer les variables d'environnement**

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 18+
- npm ou pnpm
- Compte Supabase

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd "Premium Sports Management Website (2)"

# Installer les dépendances
npm install

# Configurer Supabase
cp .env.example .env
# Éditer .env avec vos clés Supabase

# Démarrer le serveur
npm run dev
```

### Variables d'Environnement
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔐 Système d'Authentification

### Comptes Utilisateur
- **DG**: `kbgmathieu@gmail.com`
- **Staff**: `staff@agta.com`
- **Athlètes**: Inscription publique

### Routes Protégées
- `/admin-dashboard` → DG uniquement
- `/staff-dashboard` → Staff uniquement
- `/join` → Public

## 🎨 Design System

### Couleurs AGTA
- **Primaire**: `#C7FF00` (Vert fluo)
- **Fond**: `#0A0A0A` (Noir profond)
- **Texte**: Blanc
- **Accents**: Zinc grays

### Composants
- **Framer Motion**: Animations fluides
- **Tailwind CSS**: Styling responsive
- **Lucide React**: Icônes cohérentes
- **Recharts**: Graphiques et visualisations

## 📱 Fonctionnalités Clés

### 🔔 Notifications Temps Réel
- Nouveaux athlètes inscrits
- Messages reçus
- Paiements effectués

### 📧 Email Automatique
- Confirmation d'inscription
- Acceptation/Rejet de candidatures
- Rappels et alertes

### 🔄 Workflow Automatique
```
Athlète → Inscription → Recrutement → Accept → Athletes DB → Site
```

### 💳 Système de Paiement (Stripe)
- Abonnements recruteurs
- Commissions sur transferts
- Services premium

### 📊 Score Athlète Pro
- Potentiel technique
- Performance actuelle
- Valeur marchande

## 🌐 Déploiement

### Production
```bash
# Build pour production
npm run build

# Preview local
npm run preview

# Déployer sur Vercel/Netlify
```

### Environnements
- **Development**: `http://localhost:5175`
- **Production**: Configurer selon hébergeur

## 📈 Monitoring & Analytics

### Métriques Clés
- Nombre d'inscriptions
- Taux de conversion recrutement
- Revenus par source
- Activité par fuseau horaire

### Logs & Audit
- Toutes les actions trackées
- Journal quotidien obligatoire
- Historique complet

## 🔧 Maintenance

### Tâches Quotidiennes
- Vérifier les nouvelles candidatures
- Générer le rapport journalier
- Traiter les paiements
- Mettre à jour les opportunités

### Sauvegarde
- Base de données Supabase (automatique)
- Fichiers uploadés (stockage Supabase)

## 📞 Support

### Contacts
- **DG**: Mathieu
- **Technique**: Équipe dev
- **Support**: support@agta.com

### Documentation
- Ce README pour l'architecture
- Code comments pour les détails
- Supabase docs pour la DB

---

**🎯 Mission**: Révolutionner le scouting sportif africain avec une plateforme digitale de pointe.

**🇨🇩 Kinshasa • 🇦🇪 Dubai • 🌍 Worldwide**
  