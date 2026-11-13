import type {CSSProperties} from 'react';
import {memo} from 'react';
import {Button, ChevronDown, ChevronRight, FileContent, FileImage, Folder, FolderOpen, Page, SiteWeb, Typography} from '@jahia/moonstone';
import type {NodeType} from '../model/types';
import type {TreeSelectModifiers} from './treeSelection';

export interface TreeRowProps {
    id: string;
    name: string;
    type: NodeType;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    isSelected: boolean;
    isFocused: boolean;
    isDisabled?: boolean;
    setSize: number;
    posInSet: number;
    onToggle: (id: string) => void;
    onSelect: (id: string, modifiers: TreeSelectModifiers) => void;
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
    id, name, type, depth, hasChildren, isExpanded, isSelected, isFocused, isDisabled = false, setSize, posInSet,
    onToggle, onSelect
}: TreeRowProps) {
    const rowClass = [
        'treeRow',
        isSelected ? 'treeRow_selected' : '',
        isDisabled ? 'treeRow_disabled' : ''
    ].filter(Boolean).join(' ');

    return (
        <div
            role="treeitem"
            data-node-id={id}
            aria-level={depth}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
            aria-expanded={hasChildren ? isExpanded : undefined}
            tabIndex={isFocused ? 0 : -1}
            className={rowClass}
            style={{'--depth': depth} as CSSProperties}
            onClick={event => {
                if (isDisabled) {
                    return;
                }

                onSelect(id, {
                    additive: event.ctrlKey || event.metaKey,
                    range: event.shiftKey
                });
            }}
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
        </div>
    );
});
