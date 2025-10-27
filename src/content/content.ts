import api from '../utils/api';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage, getDeepActiveElement } from '../utils/utils';

import dm from '../components/datamanager';
import { BackgroundManager } from '../components/backgroundmanager';
import { PopupMenu } from '../components/popupmenu';
import { SearchbarMenu } from '../components/searchbarmenu';

dm.setContextName(`content_${location.href}`);
const backgroundMgr = new BackgroundManager();
const popupmenu = new PopupMenu(backgroundMgr);
const searchbarmenu = new SearchbarMenu(popupmenu);


//TODO: custom keyboard shortcuts
function attachWindowEvents() {
    //popupmenu.updatePosition();
    //window.addEventListener('scroll', () => popupmenu.updatePosition());
    //window.addEventListener('resize', () => popupmenu.updatePosition());
    //keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        //SHIFT-F shortcut

        if (getDeepActiveElement() instanceof HTMLInputElement && !(e.key === 'Escape')) {
            return;
        }

        if (e.shiftKey && e.key === 'F') {
            e.preventDefault();
            if (!popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility();
            }
            //popupmenu.updatePosition();
            popupmenu.focusSearchbar();
        }
        //SHIFT-R shortcut
        else if (e.shiftKey && e.key === 'R') {
            e.preventDefault();
            if (!popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility();
            }
            //popupmenu.updatePosition();
            popupmenu.focusSearchbar();
            if (popupmenu.getActiveTab() != 'userRecents') {
                popupmenu.changeTab('userRecents');
            }
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

    let recentSearches = await dm.get('userRecents');
    if (!recentSearches) { return; }
    const same_recent = (() => {
        for (let i = 0; i < recentSearches.length; i++) {
            if (this_q === recentSearches[i].query) {
                return recentSearches.splice(i, 1);
            }
        }
        return null;
    })();

    if (same_recent) {
        recentSearches.unshift(same_recent[0]);
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
        recentSearches.unshift(new_search);
    }

    await dm.set('userRecents', recentSearches);
    if (popupmenu.getActiveTab() === 'userRecents' && popupmenu.getIsVisible()) {
        popupmenu.changeTab('userRecents');

    }
}


async function testDBManager() {

    const already_init = await dm.get('testInitCompleted', { force: true }) ?? false;
    if (already_init) { return; }


    const has_pinned = await dm.get('userPinned');
    if (!has_pinned) {
        await dm.set('userPinned', [
            { id: genId('pin_'), name: 'SSA', query: '!\"Smoke Spirits Aid\" cn=62', tags: [] },
        ]);
    }
    const has_rules = await dm.get('userRules');
    if (!has_rules) {
        await dm.set('userRules', [
            { id: genId('rul_'), name: 'EDH', query: 'legal:edh', tags: [] },
        ]);
    }
    const has_recents = await dm.get('userRecents');
    if (!has_recents) {
        await dm.set('userRecents', [
        ]);
    }

    await dm.set('testInitCompleted', true);
}

async function injectUI() {
    //await injectSearchbarMenu();
    //attachWindowEvents();
    //const prev_popup_state: PopupmenuState | null = await dm.get('popupSavedState') ?? null;
    //prev_popup_state ? popupmenu.initState(prev_popup_state) : popupmenu.initState();

    await testDBManager();
    popupmenu.init();
    console.log(popupmenu);
    await searchbarmenu.init();
    console.log(searchbarmenu);

    await popupmenu.createAndShow();
    //analyzeWindowLocation();
}


if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
