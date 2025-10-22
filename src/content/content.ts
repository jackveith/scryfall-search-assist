import api from '../utils/api';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage } from '../utils/utils';

import dm from '../components/datamanager';
import popupmenu, { type PopupmenuState } from '../components/popupmenu';
import searchbarmenu from '../components/searchbarmenu';
dm.setContextName(`content_${location.href}`);


//TODO: custom keyboard shortcuts
function attachWindowEvents() {
    popupmenu.updatePosition();
    window.addEventListener('scroll', () => popupmenu.updatePosition());
    window.addEventListener('resize', () => popupmenu.updatePosition());
    //keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        //SHIFT-F shortcut
        if (e.shiftKey && e.key === 'F') {
            e.preventDefault();
            if (!popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility();
            }
            popupmenu.updatePosition();
            popupmenu.focusSearchbar();
        }
        //SHIFT-R shortcut
        else if (e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (!popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility();
            }
            popupmenu.updatePosition();
            popupmenu.focusSearchbar();
            popupmenu.changeTab(2);
        }
        //ESCAPE shortcut
        else if (e.key === 'Escape') {
            if (popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility()
            }
        }
    }, true);

}

async function analyzeWindowLocation() {
    const loc = window.location;
    if (loc.pathname !== '/search') { return; }

    const params = new URLSearchParams(window.location.search);
    console.log(`q: ${params.get('q')}`);
    const this_q = params.get('q');

    let recent_searches = await dm.get('userRecent');
    if (!recent_searches) { return; }
    const same_recent = (() => {
        for (let i = 0; i < recent_searches.length; i++) {
            if (this_q === recent_searches[i].query) {
                return recent_searches.splice(i, 1);
            }
        }
        return null;
    })();

    if (same_recent) {
        recent_searches.unshift(same_recent[0]);
    } else {
        const new_id = genId('rec_');
        const now = new Date(Date.now());
        const time_str = now.toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const date_str = `${month}-${day}`;
        console.log(time_str);

        const new_search = {
            id: new_id,
            name: `${date_str} ${time_str}`,
            query: this_q,
            tags: []
        }
        recent_searches.unshift(new_search);
    }

    await dm.set('userRecent', recent_searches);
    if (popupmenu.getActiveTab() === 2 && popupmenu.getIsVisible()) {
        popupmenu.changeTab(2);

    }
}


async function testDBManager() {

    const already_init = await dm.get('testInitCompleted', { force: true }) ?? false;
    if (already_init) { return; }


    await dm.set('userPinned', [
        { name: 'First', query: 'ci<=bg mv=3', tags: ['t1', 't2'] },
        { name: 'Second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'Third', query: 'ci=temur t:legend t:creature', tags: ['t3', 't4'] },
    ]);
    await dm.set('userRules', [
        { id: genId(), name: 'Golgari', query: 'ci<=bg', tags: ['t1', 't2'] },
        { id: genId(), name: 'Temur', query: 'ci<=temur', tags: ['t3', 't4'] },
        { id: genId(), name: 'Cheap', query: 'mv<=3', tags: ['t3', 't4'] },
        { id: genId(), name: 'EDH', query: 'legal:edh', tags: ['t1', 't2'] },
        { id: genId(), name: 'Historic', query: 'is:historic', tags: ['t3', 't4'] },
        { id: genId(), name: 'Mentions treasures', query: 'fo:treasure', tags: ['t3', 't4'] },
    ]);
    await dm.set('userRecent', [
        { name: 'First', query: 'ci<=bg mv=3', tags: ['t1', 't2'] },
        { name: 'Second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'Third', query: 'ci=temur t:legend t:creature', tags: ['t3', 't4'] },
    ]);

    await dm.set('testInitCompleted', true);
}

async function injectUI() {
    //await injectSearchbarMenu();
    attachWindowEvents();
    const prev_popup_state: PopupmenuState | null = await dm.get('popupSavedState') ?? null;
    prev_popup_state ? popupmenu.initState(prev_popup_state) : popupmenu.initState();
    console.log(searchbarmenu);
    await searchbarmenu.init();
    testDBManager();
    analyzeWindowLocation();
}


if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
