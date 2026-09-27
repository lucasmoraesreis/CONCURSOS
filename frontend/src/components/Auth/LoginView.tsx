import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { GraduationCap, Loader2, Lock, Mail } from 'lucide-react';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const { data } = await api.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      login(data.access_token, data.user);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl glass border border-surface-700/50 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/20 mb-4">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-100 text-center">Questões de Concurso</h1>
          <p className="text-sm text-surface-400 mt-2">Plataforma restrita para alunos VIP</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">Email de Acesso</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="seuemail@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-400 mb-1.5 uppercase tracking-wider">Senha</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500" />
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold hover:from-primary-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary-600/30"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Entrar na Plataforma'}
          </button>
        </form>
      </div>
    </div>
  );
}
