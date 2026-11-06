import {Button, Typography} from '@jahia/moonstone';
import type {FixtureName} from '../fixtures/generate';
import {FIXTURE_SIZES} from '../fixtures/generate';

const FIXTURE_LABELS: Record<FixtureName, string> = {small: 'Sample', large: 'Large'};

export interface ToolbarProps {
    fixture: FixtureName;
    nodeCount: number;
    onFixtureChange: (fixture: FixtureName) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

export function Toolbar({fixture, nodeCount, onFixtureChange, onExpandAll, onCollapseAll}: ToolbarProps) {
    return (
        <header className="toolbar">
            <Typography variant="title">Content Tree Explorer</Typography>
            <div className="toolbar_actions">
                {(Object.keys(FIXTURE_SIZES) as FixtureName[]).map(name => (
                    <Button
                        key={name}
                        aria-pressed={fixture === name}
                        label={`${FIXTURE_LABELS[name]} (${FIXTURE_SIZES[name].toLocaleString('en')})`}
                        variant={fixture === name ? 'default' : 'outlined'}
                        onClick={() => onFixtureChange(name)}
                    />
                ))}
                <span aria-hidden className="toolbar_separator"/>
                <Button label="Expand all" variant="ghost" onClick={onExpandAll}/>
                <Button label="Collapse all" variant="ghost" onClick={onCollapseAll}/>
                <Typography className="toolbar_count" variant="caption">
                    {nodeCount.toLocaleString('en')} nodes
                </Typography>
            </div>
        </header>
    );
}
