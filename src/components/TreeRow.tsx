import type {CSSProperties} from 'react';
import {memo} from 'react';
import {Button, ChevronDown, ChevronRight, FileContent, FileImage, Folder, FolderOpen, Page, SiteWeb, Typography} from '@jahia/moonstone';
import type {NodeType} from '../model/types';

export interface TreeRowProps {
    id: string;
    name: string;
    type: NodeType;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    isSelected: boolean;
    isFocused: boolean;
    setSize: number;
    posInSet: number;
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onToggle: (id: string) => void;
    onSelect: (id: string) => void;
    onMoveRequest: () => void;
}

function typeIcon(type: NodeType, isExpanded: boolean) {
    switch (type) {
        case 'site':
            return <SiteWeb/>;
        case 'page':
            return <Page/>;
        case 'folder':
            return isExpanded ? <FolderOpen/> : <Folder/>;
        case 'media':
            return <FileImage/>;
        default:
            return <FileContent/>;
    }
}

export const TreeRow = memo(function TreeRow({
    id, name, type, depth, hasChildren, isExpanded, isSelected, isFocused, setSize, posInSet, hoveredId, onHover, onToggle, onSelect, onMoveRequest
}: TreeRowProps) {
    return (
        <div
            role="treeitem"
            data-node-id={id}
            aria-level={depth}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-selected={isSelected}
            aria-expanded={hasChildren ? isExpanded : undefined}
            tabIndex={isFocused ? 0 : -1}
            className={['treeRow', isSelected ? 'treeRow_selected' : '', hoveredId === id ? 'treeRow_hovered' : ''].join(' ').trim()}
            style={{'--depth': depth} as CSSProperties}
            onClick={() => onSelect(id)}
            onMouseEnter={() => onHover(id)}
            onMouseLeave={() => onHover(null)}
        >
            {hasChildren ? (
                <Button
                    variant="ghost"
                    size="small"
                    icon={isExpanded ? <ChevronDown/> : <ChevronRight/>}
                    aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
                    tabIndex={-1}
                    onClick={e => {
                        e.stopPropagation();
                        onToggle(id);
                    }}
                />
            ) : <span className="treeRow_spacer"/>}
            {typeIcon(type, isExpanded)}
            <Typography isNowrap variant="body">{name}</Typography>
            {isSelected && (
                <span
                    className="treeRow_move"
                    onClick={event => {
                        event.stopPropagation();
                        onMoveRequest();
                    }}
                >
                    Move…
                </span>
            )}
        </div>
    );
});
