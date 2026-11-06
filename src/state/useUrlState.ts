import {useCallback, useState} from 'react';
import type {FixtureName} from '../fixtures/generate';

export interface UrlState {
    fixture: FixtureName;
    selectedId: string | null;
}

function readUrl(): UrlState {
    const params = new URLSearchParams(window.location.search);
    return {
        fixture: params.get('fixture') === 'large' ? 'large' : 'small',
        selectedId: params.get('selected')
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
            if (next.selectedId) {
                params.set('selected', next.selectedId);
            }

            window.history.replaceState(null, '', `?${params.toString()}`);
            return next;
        });
    }, []);

    return [state, update];
}
