export type NodeType = 'site' | 'page' | 'folder' | 'content' | 'media';

export interface ContentNode {
    id: string;
    name: string;
    type: NodeType;
    children: ContentNode[];
}
