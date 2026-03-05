export interface Workflow {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  created_at: string;
}

export type NodeType = 'webhook' | 'ai' | 'whatsapp' | 'http';

export interface NodeData {
  label: string;
  type: NodeType;
  config: any;
}
