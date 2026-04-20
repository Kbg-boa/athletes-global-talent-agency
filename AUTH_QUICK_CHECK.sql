-- AUTH_QUICK_CHECK.sql
-- Diagnostic rapide login DG + Staff (à exécuter dans Supabase SQL Editor)

-- 1) Vérifier que les deux comptes existent et sont confirmés
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  banned_until,
  deleted_at
FROM auth.users
WHERE email IN ('kbgmathieu@gmail.com', 'agta.management@gmail.com')
ORDER BY email;

-- 2) Compter les comptes trouvés (doit retourner 2)
SELECT COUNT(*) AS total_accounts_found
FROM auth.users
WHERE email IN ('kbgmathieu@gmail.com', 'agta.management@gmail.com');

-- 3) Vérifier les éventuelles policies sur la table documents (utile pour votre autre incident)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'documents_agta')
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- 4) Vérifier les buckets attendus
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('agta-files', 'athlete-files', 'agta_vault')
ORDER BY id;

-- Actions si login KO:
-- A) Si email_confirmed_at est NULL: confirmer l'utilisateur dans Authentication > Users.
-- B) Si compte absent: créer le compte dans Authentication > Users.
-- C) Si mot de passe inconnu: faire "Send password recovery" depuis Supabase Dashboard.
-- D) Vérifier que le provider Email est activé: Authentication > Providers > Email.
