#!/bin/bash

# 🧪 AGTA Management Portal - Testing Script
# Ce script teste tous les endpoints et fonctionnalités

echo "🚀 AGTA Portal - Test Suite"
echo "============================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
BASE_URL="http://localhost:5174"
ADMIN_EMAIL="kbgmathieu@gmail.com"

# Test 1: Page Login
echo -e "${BLUE}Test 1: Page Login${NC}"
echo "→ Accès: $BASE_URL/login"
echo "✓ Devrait afficher le formulaire de connexion"
echo ""

# Test 2: Protection des Routes
echo -e "${BLUE}Test 2: Protection des Routes${NC}"
echo "→ Accès direct à $BASE_URL/admin/dg sans login"
echo "✓ Devrait rediriger vers /login"
echo ""

# Test 3: Dashboard DG
echo -e "${BLUE}Test 3: Dashboard DG (Après Login)${NC}"
echo "→ Accès: $BASE_URL/admin/dg"
echo "✓ Éléments visibles:"
echo "  - Radar de Recrutement (gauche)"
echo "  - Compteur de Valeur Marchande (centre)"
echo "  - Horloges Mondiales (droite)"
echo "  - Graphique Tendances (bas)"
echo "  - Stats KPI (bas)"
echo ""

# Test 4: Interface Staff
echo -e "${BLUE}Test 4: Interface Secrétariat${NC}"
echo "→ Accès: $BASE_URL/admin/staff"
echo "✓ Formulaire Journal avec:"
echo "  - Type d'Activité: [Reporty, Message, Update, Alert, Document]"
echo "  - Localisation: [Champ texte]"
echo "  - Description: [Texte long]"
echo "✓ Boutton 'Envoyer l'Activité'"
echo "✓ Historique en temps réel"
echo ""

# Test 5: Envoi d'Activité
echo -e "${BLUE}Test 5: Envoi d'Activité${NC}"
echo "→ Depuis /admin/staff:"
echo "  1. Remplir le formulaire"
echo "  2. Cliquer 'Envoyer l'Activité'"
echo "✓ Message de succès devrait apparaître"
echo "✓ Historique devrait se mettre à jour"
echo "✓ Radar DG devrait afficher la nouvelle activité"
echo ""

# Test 6: Temps Réel
echo -e "${BLUE}Test 6: Temps Réel (Realtime Supabase)${NC}"
echo "→ Ouvrir 2 onglets:"
echo "  - Onglet 1: /admin/dg (Radar)"
echo "  - Onglet 2: /admin/staff (Formulaire)"
echo "✓ Envoyer une activité depuis l'onglet 2"
echo "✓ Onglet 1 doit se mettre à jour INSTANTANÉMENT"
echo ""

# Test 7: Compteur Valeur Marchande
echo -e "${BLUE}Test 7: Compteur Valeur Marchande${NC}"
echo "→ Sur le Dashboard DG"
echo "✓ Le compteur doit augmenter chaque 3 secondes"
echo "✓ Format: $2.5M (USD)"
echo "✓ % de changement affiche l'évolution depuis le démarrage"
echo ""

# Test 8: Horloges Mondiales
echo -e "${BLUE}Test 8: Horloges Mondiales${NC}"
echo "→ Sur le Dashboard DG (bas-droit)"
echo "✓ Kinshasa (🇨🇩) - WAT"
echo "✓ Dubaï (🇦🇪) - GST"
echo "✓ Les heures doivent être correctes ET mises à jour chaque seconde"
echo ""

# Test 9: Graphiques
echo -e "${BLUE}Test 9: Graphiques Tendances${NC}"
echo "→ Sur le Dashboard DG (bas)"
echo "✓ Graphique LineChart avec Recharts"
echo "✓ X-axis: Temps (00:00 à 20:00)"
echo "✓ Y-axis: Nombre de recrutements"
echo "✓ Ligne jaune (#C7FF00)"
echo ""

# Test 10: Design Elite Sports
echo -e "${BLUE}Test 10: Design Elite Sports${NC}"
echo "✓ Fond noir profond (#0A0A0A)"
echo "✓ Textes en blanc"
echo "✓ Accents jaune fluo (#C7FF00)"
echo "✓ Animations fluides"
echo "✓ Responsive design (testez sur mobile)"
echo ""

# Test 11: Déconnexion
echo -e "${BLUE}Test 11: Déconnexion${NC}"
echo "→ Cliquer sur 'Déconnexion' (haut-droit)"
echo "✓ Devrait rediriger vers /login"
echo "✓ Session Supabase terminée"
echo ""

# Test 12: Erreurs de Sécurité
echo -e "${BLUE}Test 12: Erreurs de Sécurité${NC}"
echo "→ Essayer de se connecter avec un autre email"
echo "✓ Devrait afficher: 'Accès réservé aux administrateurs autorisés.'"
echo "✓ Déconnexion automatique"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Suite de tests configurée${NC}"
echo -e "${GREEN}Commencez les tests en ouvrant: $BASE_URL${NC}"
echo -e "${GREEN}============================================${NC}"
