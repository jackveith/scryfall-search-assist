import api from '../api';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage } from '../utils/utils';

import dm from '../components/datamanager';
dm.setContextName(`content_${location.href}`);

import popupmenu from '../components/popupmenu';
import searchbarmenu from '../components/searchbarmenu';


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

async function testDBManager() {
    await dm.set('dummy', 'dummy data.');
    await dm.set('userPinned', [
        { name: 'first', query: 'ci<=bg mv=3', tags: ['t1', 't2'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
        { name: 'second', query: 'ci<=temur t:creature legal:edh Fierce Emp', tags: ['t3', 't4'] },
    ])
}

async function injectUI() {
    //await injectSearchbarMenu();
    attachWindowEvents();
    testDBManager();
}


if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
