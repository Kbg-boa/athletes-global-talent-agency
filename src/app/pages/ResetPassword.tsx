import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabaseDG, supabaseStaff } from '../../lib/supabase';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const role = searchParams.get('role') === 'staff' ? 'staff' : 'dg';
  const supabase = useMemo(() => (role === 'staff' ? supabaseStaff : supabaseDG), [role]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setLoading(false);
      setError('Lien expiré ou invalide. Demandez un nouveau lien de réinitialisation.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Impossible de mettre à jour le mot de passe.');
      return;
    }

    setSuccess('Mot de passe mis à jour. Vous pouvez maintenant vous reconnecter.');
    await supabase.auth.signOut();

    window.setTimeout(() => {
      navigate(role === 'staff' ? '/login/staff' : '/login/dg');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl">
        <h1 className="text-2xl font-black text-[#C7FF00] mb-2">Nouveau mot de passe</h1>
        <p className="text-zinc-300 text-sm mb-6">
          Entrez votre nouveau mot de passe pour finaliser la réinitialisation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-200 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
              placeholder="Minimum 8 caractères"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-200 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-[#0A0A0A] px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#C7FF00]"
              placeholder="Retapez le mot de passe"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-green-400">{success}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#C7FF00] py-2 font-bold text-black hover:bg-[#b3e600] transition disabled:opacity-60"
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}