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
            e.stopPropagation();
            if (!popupmenu.getIsVisible()) {
                popupmenu.toggleVisibility();
            }
            popupmenu.updatePosition();
            popupmenu.focusSearchbar();
        }
        //SHIFT-R shortcut
        else if (e.shiftKey && e.key === 'R') {
            e.preventDefault();
            e.stopPropagation();
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

function analyzeWindowLocation() {
    const loc = window.location;
    if (loc.pathname !== '/search') { return; }

    const params = new URLSearchParams(window.location.search);
    console.log(`q: ${params.get('q')}`);

}

async function testDBManager() {
    await dm.set('userPinned', [
        { name: 'First', query: 'ci<=bg mv=3', tags: ['t1', 't2'] },
        { name: 'Second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'Third', query: 'ci=temur t:legend t:creature', tags: ['t3', 't4'] },
    ]);
    await dm.set('userRules', [
        { name: 'Golgari', query: 'ci<=bg', tags: ['t1', 't2'] },
        { name: 'Temur', query: 'ci<=temur', tags: ['t3', 't4'] },
        { name: 'Cheap', query: 'mv<=3', tags: ['t3', 't4'] },
        { name: 'Golgari', query: 'ci<=bg', tags: ['t1', 't2'] },
        { name: 'Temur', query: 'ci<=temur', tags: ['t3', 't4'] },
        { name: 'Cheap', query: 'mv<=3', tags: ['t3', 't4'] },
    ]);
    await dm.set('userRecent', [
        { name: 'First', query: 'ci<=bg mv=3', tags: ['t1', 't2'] },
        { name: 'Second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'Third', query: 'ci=temur t:legend t:creature', tags: ['t3', 't4'] },
    ]);
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
