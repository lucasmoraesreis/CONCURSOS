import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Users, Plus, Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function AdminPanelView() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newUser: any) => {
      const { data } = await api.post('/auth/users', newUser);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNome(''); setEmail(''); setSenha(''); setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Erro ao criar usuário');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/auth/users/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  });

  if (!user?.is_master) {
    return (
      <div className="p-8 text-center text-red-400 flex flex-col items-center">
        <ShieldAlert size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p>Você não tem privilégios Master para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl glass border border-surface-700/50">
        <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-6">
          <Plus className="text-primary-400" /> Criar Novo Acesso
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
            {error}
          </div>
        )}

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ nome, email, senha, is_master: false });
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <input 
            placeholder="Nome do aluno" required value={nome} onChange={e => setNome(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-sm"
          />
          <input 
            type="text" placeholder="Email / Login" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-sm"
          />
          <div className="flex gap-2">
            <input 
              type="password" placeholder="Senha" required minLength={6} value={senha} onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-surface-100 text-sm"
            />
            <button 
              type="submit" disabled={createMutation.isPending}
              className="px-4 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-500 transition-colors shrink-0"
            >
              {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Criar'}
            </button>
          </div>
        </form>
      </div>

      <div className="p-6 rounded-3xl glass border border-surface-700/50">
        <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-6">
          <Users className="text-primary-400" /> Acessos Cadastrados
        </h2>

        {isLoading ? (
          <div className="flex justify-center p-8 text-primary-400"><Loader2 size={32} className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700 text-xs text-surface-400 uppercase">
                  <th className="pb-3 font-semibold">Nome</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Status / Perfil</th>
                  <th className="pb-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((u: any) => (
                  <tr key={u.id} className="border-b border-surface-700/50 hover:bg-surface-800/30">
                    <td className="py-4 text-sm font-medium text-surface-100">{u.nome} {u.id === user.id && '(Você)'}</td>
                    <td className="py-4 text-sm text-surface-300">{u.email}</td>
                    <td className="py-4 text-sm">
                      {u.is_master ? (
                        <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-bold">Master</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">Aluno</span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {u.id !== user.id && (
                        <button 
                          onClick={() => { if(confirm('Tem certeza?')) deleteMutation.mutate(u.id) }}
                          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
