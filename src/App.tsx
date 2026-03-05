/// <reference types="vite/client" />
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Save, Play, Trash2, ArrowLeft, Settings2, Activity, LogOut, User, Lock, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { WebhookNode, AINode, WhatsAppNode, HTTPNode } from './components/Nodes';
import { Workflow } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration is missing! Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const nodeTypes = {
  webhook: WebhookNode,
  ai: AINode,
  whatsapp: WhatsAppNode,
  http: HTTPNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function AuthScreen({ onAuth }: { onAuth: (user: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: username.includes('@') ? username : `${username}@example.com`,
        password,
      });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email: username.includes('@') ? username : `${username}@example.com`,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        alert('Confirme seu e-mail para continuar (ou verifique se o auto-confirm está ativado no Supabase)');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E4E3E0] p-4">
      <div className="w-full max-w-md bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-4xl font-serif italic mb-8 border-b-2 border-black pb-4">FlowGravity</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest mb-2">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border-2 border-black p-3 pl-10 focus:outline-none focus:bg-black/5"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-black p-3 pl-10 pr-10 focus:outline-none focus:bg-black/5"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
          <button type="submit" className="w-full bg-black text-white p-4 font-bold hover:bg-zinc-800 transition-colors">
            {isLogin ? 'ENTRAR' : 'REGISTRAR'}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-6 text-xs font-mono uppercase tracking-widest hover:underline"
        >
          {isLogin ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Entre'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/workflows', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL,
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });

      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      } else {
        const contentType = res.headers.get("content-type");
        const errorText = contentType && contentType.includes("application/json")
          ? (await res.json()).error
          : await res.text();
        console.error('Error fetching workflows:', errorText);
      }
    } catch (err) {
      console.error('Network error fetching workflows:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchWorkflows();
  }, [user, fetchWorkflows]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveWorkflow(null);
  };

  const duplicateNode = useCallback((id: string) => {
    setNodes((nds) => {
      const nodeToDuplicate = nds.find((n) => n.id === id);
      if (!nodeToDuplicate) return nds;

      const newNode = {
        ...nodeToDuplicate,
        id: uuidv4(),
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50,
        },
        selected: false,
      };

      return nds.concat(newNode);
    });
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const updateNodesWithHandlers = useCallback((nds: Node[]) => {
    return nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onDuplicate: duplicateNode,
        onDelete: deleteNode,
      },
    }));
  }, [duplicateNode, deleteNode]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  };

  const createWorkflow = async () => {
    const newWorkflow = {
      name: "Nova Automação",
      nodes: [
        {
          id: '1',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: { label: 'Gatilho de Entrada', type: 'webhook' },
        }
      ],
      edges: [],
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL,
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(newWorkflow),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || 'Erro no servidor');
        } else {
          const rawError = await res.text();
          throw new Error(rawError.substring(0, 300) || "Erro interno no servidor (Vercel)");
        }
      }

      const { id } = await res.json();
      console.log('Workflow created successfully:', id);
      fetchWorkflows();
      openWorkflow({ ...newWorkflow, id, created_at: new Date().toISOString() } as Workflow);
    } catch (err: any) {
      console.error('Failed to create workflow:', err);
      alert(`Erro: ${err.message}`);
    }
  };

  const openWorkflow = (w: Workflow) => {
    setActiveWorkflow(w);
    setNodes(updateNodesWithHandlers(w.nodes));
    setEdges(w.edges);
  };

  const saveWorkflow = async () => {
    if (!activeWorkflow) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/workflows/${activeWorkflow.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-supabase-url': import.meta.env.VITE_SUPABASE_URL,
          'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          name: activeWorkflow.name,
          nodes,
          edges,
        }),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao salvar alterações');
        } else {
          const rawError = await res.text();
          throw new Error(rawError.substring(0, 300) || "Erro ao salvar alterações");
        }
      }

      setIsSaving(false);
      fetchWorkflows();
    } catch (err: any) {
      console.error('Failed to save workflow:', err);
      alert(`Erro: ${err.message}`);
      setIsSaving(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Você tem certeza?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/workflows/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'x-supabase-url': import.meta.env.VITE_SUPABASE_URL,
        'x-supabase-key': import.meta.env.VITE_SUPABASE_ANON_KEY
      }

    });
    fetchWorkflows();
  };

  const addNode = (type: string) => {
    const labels: any = { ai: 'Lógica de IA', whatsapp: 'WhatsApp', http: 'Requisição HTTP', webhook: 'Gatilho' };
    const newNode: Node = {
      id: uuidv4(),
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: `Novo ${labels[type] || type.toUpperCase()}`,
        type,
        onDuplicate: duplicateNode,
        onDelete: deleteNode,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono">CARREGANDO...</div>;
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Configuração Auxente</h1>
        <p className="max-w-md text-red-800">
          As variáveis de ambiente do Supabase não foram encontradas.
          Certifique-se de configurar <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> no painel do Vercel e realizar um novo deploy.
        </p>
      </div>
    );
  }
  if (!user) return <AuthScreen onAuth={setUser} />;

  if (!activeWorkflow) {
    return (
      <div className="min-h-screen p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-black pb-8">
          <div>
            <h1 className="text-5xl font-serif italic tracking-tight mb-2">FlowGravity</h1>
            <div className="flex items-center gap-4">
              <p className="text-sm font-mono opacity-50 uppercase tracking-widest">Automação Low-Code</p>
              <div className="h-4 w-[1px] bg-black/20" />
              <div className="flex items-center gap-2 text-xs font-mono uppercase">
                <User size={12} /> {user.username}
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 border border-black px-6 py-3 hover:bg-black hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
            <button
              onClick={createWorkflow}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 hover:bg-zinc-800 transition-colors"
            >
              <Plus size={18} />
              <span>Novo Fluxo</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="group border border-black p-6 bg-white hover:bg-black hover:text-white transition-all cursor-pointer relative"
              onClick={() => openWorkflow(w)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-medium">{w.name}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteWorkflow(w.id); }}
                    className="p-2 hover:bg-white/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider opacity-60">
                <span className="flex items-center gap-1"><Activity size={10} /> {w.nodes.length} Nós</span>
                <span>Criado em {new Date(w.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="col-span-2 border border-dashed border-black/30 p-12 text-center opacity-40 italic">
              Nenhum fluxo criado ainda. Comece criando sua primeira automação.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <nav className="h-16 border-b border-black bg-white flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setActiveWorkflow(null)} className="p-2 hover:bg-black/5 rounded">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <input
              value={activeWorkflow.name}
              onChange={(e) => setActiveWorkflow({ ...activeWorkflow, name: e.target.value })}
              className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            />
            <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">ID: {activeWorkflow.id}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase mr-4 opacity-50">
            <User size={12} /> {user.username}
          </div>
          <button
            onClick={saveWorkflow}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 border border-black hover:bg-black hover:text-white transition-all disabled:opacity-50"
          >
            <Save size={16} />
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 transition-all">
            <Play size={16} />
            <span>Implantar</span>
          </button>
        </div>
      </nav>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#aaa" gap={20} />
          <Controls />

          {selectedNode && (
            <Panel position="bottom-right" className="bg-white border border-black p-6 w-80 shadow-2xl mb-4 mr-4">
              <div className="flex justify-between items-center mb-6 border-b border-black pb-2">
                <h4 className="text-xs font-mono uppercase tracking-widest opacity-50">Configurações do Nó</h4>
                <button onClick={() => setSelectedNode(null)} className="text-xs hover:underline">Fechar</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">Rótulo</label>
                  <input
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full border border-black p-2 text-sm focus:outline-none"
                  />
                </div>

                {selectedNode.type === 'ai' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">Prompt do Sistema</label>
                    <textarea
                      placeholder="Você é um assistente prestativo..."
                      className="w-full border border-black p-2 text-sm h-24 focus:outline-none resize-none"
                    />
                  </div>
                )}

                {selectedNode.type === 'whatsapp' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">Instância Evolution</label>
                    <input
                      placeholder="main"
                      value={selectedNode.data.config?.instance || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { config: { ...selectedNode.data.config, instance: e.target.value } })}
                      className="w-full border border-black p-2 text-sm focus:outline-none mb-4"
                    />
                    <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">Número de Telefone</label>
                    <input
                      placeholder="+55... ou {{phone}}"
                      value={selectedNode.data.config?.phone || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { config: { ...selectedNode.data.config, phone: e.target.value } })}
                      className="w-full border border-black p-2 text-sm focus:outline-none mb-4"
                    />
                    <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">Template da Mensagem</label>
                    <textarea
                      placeholder="Olá {{name}}, sua prova é hoje! Aberta das {{open_time}} às {{close_time}}."
                      value={selectedNode.data.config?.message || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { config: { ...selectedNode.data.config, message: e.target.value } })}
                      className="w-full border border-black p-2 text-sm h-24 focus:outline-none resize-none"
                    />
                    <p className="text-[9px] mt-2 opacity-50">
                      Dica: Use <strong>{"{{variável}}"}</strong> para dados dinâmicos do IETEO.
                    </p>
                  </div>
                )}

                {selectedNode.type === 'webhook' && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-tighter opacity-40 mb-1">URL do Webhook</label>
                    <div className="bg-black/5 p-2 text-[10px] font-mono break-all border border-black/10">
                      {window.location.origin}/api/webhook/{activeWorkflow.id}
                    </div>
                    <p className="text-[9px] mt-2 opacity-50 leading-tight">
                      Envie uma requisição POST para este URL para disparar este fluxo a partir do Antigravity IA ou qualquer outro app.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                    setSelectedNode(null);
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> Excluir Nó
                </button>
              </div>
            </Panel>
          )}

          <Panel position="top-right" className="flex flex-col gap-2">
            <div className="bg-white border border-black p-4 shadow-xl">
              <h4 className="text-[10px] font-mono uppercase tracking-widest mb-4 opacity-50">Adicionar Componentes</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addNode('ai')} className="flex items-center gap-2 px-3 py-2 text-xs border border-black hover:bg-black hover:text-white transition-all">
                  <Plus size={12} /> Lógica de IA
                </button>
                <button onClick={() => addNode('whatsapp')} className="flex items-center gap-2 px-3 py-2 text-xs border border-black hover:bg-black hover:text-white transition-all">
                  <Plus size={12} /> WhatsApp
                </button>
                <button onClick={() => addNode('http')} className="flex items-center gap-2 px-3 py-2 text-xs border border-black hover:bg-black hover:text-white transition-all">
                  <Plus size={12} /> Req. HTTP
                </button>
                <button onClick={() => addNode('webhook')} className="flex items-center gap-2 px-3 py-2 text-xs border border-black hover:bg-black hover:text-white transition-all">
                  <Plus size={12} /> Gatilho
                </button>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
