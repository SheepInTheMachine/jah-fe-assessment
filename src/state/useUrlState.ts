import {useCallback, useState} from 'react';
import type {FixtureName} from '../fixtures/generate';

export interface UrlState {
    fixture: FixtureName;
    selectedIds: string[];
}

function readUrl(): UrlState {
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('selected');
    return {
        fixture: params.get('fixture') === 'large' ? 'large' : 'small',
        selectedIds: selected ? selected.split(',').filter(id => id.length > 0) : []
    };
}

/**
 * Mirrors the fixture and the selection into the URL so a view can be bookmarked,
 * the way jcontent keeps part of its state in the address bar.
 */
export function useUrlState(): [UrlState, (patch: Partial<UrlState>) => void] {
    const [state, setState] = useState<UrlState>(readUrl);

    const update = useCallback((patch: Partial<UrlState>) => {
        setState(prev => {
            const next = {...prev, ...patch};
            const params = new URLSearchParams();
            params.set('fixture', next.fixture);
            if (next.selectedIds.length > 0) {
                params.set('selected', next.selectedIds.join(','));
            }

            window.history.replaceState(null, '', `?${params.toString()}`);
            return next;
        });
    }, []);

    return [state, update];
}
