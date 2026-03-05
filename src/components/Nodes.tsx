import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot, MessageSquare, Globe, Zap, Copy, Trash2 } from 'lucide-react';

const NodeWrapper = ({ children, label, icon: Icon, type, onDuplicate, onDelete, id }: any) => (
  <div className="px-4 py-3 min-w-[200px]">
    <div className="flex items-center justify-between mb-2 border-b border-black/10 pb-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-black/60" />
        <span className="text-[10px] font-mono uppercase tracking-wider opacity-50">{type}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate?.(id); }}
          className="p-1 hover:bg-black/5 rounded transition-colors"
          title="Duplicar"
        >
          <Copy size={12} className="opacity-40 hover:opacity-100" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
          className="p-1 hover:bg-red-50 rounded transition-colors group"
          title="Excluir"
        >
          <Trash2 size={12} className="opacity-40 group-hover:opacity-100 group-hover:text-red-500" />
        </button>
      </div>
    </div>
    <div className="text-sm font-medium mb-2">{label}</div>
    {children}
  </div>
);

export const WebhookNode = memo(({ data, id }: any) => (
  <div className="bg-white border-2 border-black">
    <NodeWrapper
      id={id}
      label={data.label}
      icon={Zap}
      type="Gatilho"
      onDuplicate={data.onDuplicate}
      onDelete={data.onDelete}
    >
      <div className="text-[10px] font-mono bg-black/5 p-2 break-all">
        /api/webhook/{data.id || '...'}
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));

export const AINode = memo(({ data, id }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper
      id={id}
      label={data.label}
      icon={Bot}
      type="Lógica de IA"
      onDuplicate={data.onDuplicate}
      onDelete={data.onDelete}
    >
      <div className="text-[10px] opacity-60 italic">
        Processado por Gemini
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));

export const WhatsAppNode = memo(({ data, id }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper
      id={id}
      label={data.label}
      icon={MessageSquare}
      type="Mensagens"
      onDuplicate={data.onDuplicate}
      onDelete={data.onDelete}
    >
      <div className="text-[10px] opacity-60">
        Envio automático para WhatsApp
      </div>
    </NodeWrapper>
  </div>
));

export const HTTPNode = memo(({ data, id }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper
      id={id}
      label={data.label}
      icon={Globe}
      type="Requisição HTTP"
      onDuplicate={data.onDuplicate}
      onDelete={data.onDelete}
    >
      <div className="text-[10px] opacity-60">
        Chamada de API Externa
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));
