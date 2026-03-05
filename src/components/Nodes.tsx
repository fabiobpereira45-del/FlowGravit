import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot, MessageSquare, Globe, Zap } from 'lucide-react';

const NodeWrapper = ({ children, label, icon: Icon, type }: any) => (
  <div className="px-4 py-3 min-w-[200px]">
    <div className="flex items-center gap-2 mb-2 border-b border-black/10 pb-2">
      <Icon size={16} className="text-black/60" />
      <span className="text-[10px] font-mono uppercase tracking-wider opacity-50">{type}</span>
    </div>
    <div className="text-sm font-medium mb-2">{label}</div>
    {children}
  </div>
);

export const WebhookNode = memo(({ data }: any) => (
  <div className="bg-white border-2 border-black">
    <NodeWrapper label={data.label} icon={Zap} type="Gatilho">
      <div className="text-[10px] font-mono bg-black/5 p-2 break-all">
        /api/webhook/{data.id || '...'}
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));

export const AINode = memo(({ data }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Bot} type="Lógica de IA">
      <div className="text-[10px] opacity-60 italic">
        Processado por Gemini
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));

export const WhatsAppNode = memo(({ data }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={MessageSquare} type="Mensagens">
      <div className="text-[10px] opacity-60">
        Envio automático para WhatsApp
      </div>
    </NodeWrapper>
  </div>
));

export const HTTPNode = memo(({ data }: any) => (
  <div className="bg-white border-2 border-black">
    <Handle type="target" position={Position.Left} />
    <NodeWrapper label={data.label} icon={Globe} type="Requisição HTTP">
      <div className="text-[10px] opacity-60">
        Chamada de API Externa
      </div>
    </NodeWrapper>
    <Handle type="source" position={Position.Right} />
  </div>
));
