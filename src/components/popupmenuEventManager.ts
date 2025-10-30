import type { BackgroundManager } from "./backgroundmanager";
import type { PopupMenuStateManager } from "./popupmenuStateManager";
import type { PopupMenuUIManager } from "./popupmenuUIManager";

import type { PopupMutatorObject } from "../types/ssa_types";

import { haltEventPropogation } from "../utils/utils";
import type { PopupMenu } from "./popupmenu";

export class PopupMenuEventManager {

    private backgroundMgr: BackgroundManager;
    private uiMgr: PopupMenuUIManager;
    private stateMgr: PopupMenuStateManager;

    constructor(bk: BackgroundManager, ui: PopupMenuUIManager, st: PopupMenuStateManager) {
        this.backgroundMgr = bk;
        this.uiMgr = ui;
        this.stateMgr = st;
    }

    public async initPopupEvents(popupObject: PopupMenu) {
        this.attachSearchFormEvents(popupObject);
        this.attachTabButtonEvents(popupObject);
        //add filter bar events
        await this.attachTabareaEvents(popupObject);
        this.attachFooterEvents();

    }

    public attachSearchFormEvents(popupObject: PopupMenu) {
        const form = this.uiMgr.getOverlay()?.querySelector('#ssa-popup-searchform') ?? null;
        if (!form) { return; }
        //SEARCHFORM key blockers/submit
        form.addEventListener('click', () => {
            this.uiMgr.focusSearchbar();
        });
        form.addEventListener('keydown', (e) => {
            haltEventPropogation(e);
            if ((e as KeyboardEvent).key === 'Enter') {
                (form as HTMLFormElement).requestSubmit();
            }
        }, true);
        form.addEventListener('keyup', haltEventPropogation, true);
        form.addEventListener('keypress', haltEventPropogation, true);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            haltEventPropogation(e);
            popupObject.searchformSubmit();
        }, true);
        //attach RuleButton listener (changeTabAndFilter('userRules')) if RuleButton exists
        const rulesButton = this.uiMgr.getOverlay()?.querySelector('#searchbar-rules-link');
        if (rulesButton) {
            this.attachRulesButtonEvents(popupObject);
        }

    }

    public attachTabButtonEvents(popupObject: PopupMenu) {
        const uiOvr = this.uiMgr.getOverlay();
        if (!uiOvr) { return; }

        const tabButtons = uiOvr.getElementsByClassName('popup-tab-selector-btn');
        const tabNames = ['userRules', 'userPinned', 'userRecents'];
        for (let i = 0; i <= tabButtons.length; i++) {
            if (!tabNames[i]) { return }

            tabButtons[i]?.addEventListener('click', async () => {
                await popupObject.changeTab(tabNames[i]!);
            });
        }
    }

    public async attachTabareaEvents(popupObject: PopupMenu) {
        if (!this.stateMgr.getIsVisible()) { return }

        const actTab = this.stateMgr.getActiveTab();
        const tabarea = this.uiMgr.getOverlay()!.querySelector('#popup-tabarea-grid-outer') as HTMLDivElement;
        let tabItemListeners: { type: string, listener: (ev: Event) => any }[] = [];
        //define listeners for each item, by activeTab
        if (actTab === 'userRules') {
            const ruleClick = (ev: Event) => {
                const ruleId = (ev.currentTarget as HTMLElement).dataset.ssaItemId ?? null;
                if (!ruleId) { return; }

                //toggle rule in state and UI
                this.stateMgr.toggleActiveRule(ruleId);
                this.uiMgr.toggleItemActiveRule(ev.currentTarget as HTMLDivElement);
                //refresh/update rulesButton
                const actives = this.stateMgr.getActiveRules();
                const numActiveRules = Object.keys(actives).length;
                const wasCreated = this.uiMgr.createUpdateRulesButton(numActiveRules);
                if (wasCreated) {
                    this.attachRulesButtonEvents(popupObject);
                }
            }
            tabItemListeners.push({ type: 'click', listener: ruleClick });
        }
        //TODO: double click fill-and-go for userPinned, userRecents

        //attach item click listener(s) and options button listeners
        for (let tabItem of tabarea.children) {
            if (tabItem.classList.contains('popup-tabarea-item')) {
                for (let listDef of tabItemListeners) {
                    tabItem.addEventListener(listDef.type, listDef.listener);
                }
            }
            await this.attachItemOptionsListeners(tabItem as HTMLDivElement, actTab);
        }
        //try attach create button listener
        const createButton = tabarea.querySelector('.popup-tabarea-create');
        if (createButton) {
            this.attachCreateButtonListener(createButton as HTMLDivElement, actTab);
        }
    }

    public async attachItemOptionsListeners(item: HTMLDivElement, actTab: string) {
        for (let c of item.children) {
            const classes = c.classList;

            //OPTION
            if (classes.contains('tabarea-item-edit-options')) {
                c.addEventListener('click', async (e) => {
                    haltEventPropogation(e);

                    this.uiMgr.replaceOptionsButtons(item, actTab, "expand");
                    await this.attachItemOptionsListeners(item, actTab);
                });
            }
            //DELETE
            else if (classes.contains('tabarea-item-edit-delbtn')) {
                c.addEventListener('click', async (e) => {
                    haltEventPropogation(e);

                    const itemId = item.dataset.ssaItemId!;
                    const isActiveRule = actTab === 'userRules' && itemId in this.stateMgr.getActiveRules() ? true : false;
                    const removed = await this.stateMgr.deleteNamedQueryById(itemId, actTab);
                    if (removed) {
                        this.uiMgr.removeTabareaItem(item);
                        if (isActiveRule) {
                            const numActiveRules = Object.entries(this.stateMgr.getActiveRules()).length;
                            this.uiMgr.createUpdateRulesButton(numActiveRules);
                        }
                    }
                });
            }
            //EDIT
            else if (classes.contains('tabarea-item-edit-editbtn')) {
                c.addEventListener('click', (e) => {
                    haltEventPropogation(e);

                    this.uiMgr.replaceWithEditForm(item, 'edit');
                    this.attachEditFormListeners(item, actTab, 'edit');
                    const titleInput = item.querySelector('tabarea-item-edit-input-title') as HTMLInputElement;
                    titleInput.focus();
                });
            }
            //FILL
            else if (classes.contains('tabarea-item-edit-fillbtn')) {
                c.addEventListener('click', (e) => {
                    haltEventPropogation(e);

                    const searchform = this.uiMgr.getOverlay()!.querySelector('#popup-searchbar-input') as HTMLInputElement;
                    const querySpan = item.querySelector('.popup-tabarea-item-query');
                    const itemQuery = querySpan?.textContent;
                    //set search value, focus, then sim click on options contract button
                    searchform.value = `${searchform.value} ${itemQuery} `;
                    this.uiMgr.focusSearchbar();
                    (item.querySelector('.tabarea-item-edit-contractbtn') as HTMLLinkElement).click();
                });
            }
            //CONTRACT
            else if (classes.contains('tabarea-item-edit-contractbtn')) {
                c.addEventListener('click', async (e) => {
                    haltEventPropogation(e);

                    this.uiMgr.replaceOptionsButtons(item, actTab, 'contract');
                    await this.attachItemOptionsListeners(item, actTab);
                })
            }
        }


    }

    public attachCreateButtonListener(createButton: HTMLDivElement, actTab: string) {
        const createInner = createButton.querySelector('.popup-tabarea-create-inner') as HTMLDivElement;
        createInner.addEventListener('click', (e) => {
            this.uiMgr.replaceWithEditForm(createButton as HTMLDivElement, 'create');
            this.attachEditFormListeners(createButton, actTab, 'create');
        });
    }

    public attachEditFormListeners(item: HTMLElement, actTab: string, mode: string) {

        //main form event blockers and submit events
        const editForm = item.querySelector('.tabarea-item-edit-form') as HTMLFormElement;
        editForm.addEventListener('click', (e) => {
            const classes = (e.currentTarget as HTMLElement).classList;
            //dodge buttons
            if (classes.contains('tabarea-item-edit-input-button')) { return }
            haltEventPropogation(e);
        }, true);
        editForm.addEventListener('keyup', haltEventPropogation, true);
        editForm.addEventListener('keypress', haltEventPropogation, true);
        editForm.addEventListener('keydown', (e) => {
            haltEventPropogation(e);
            if (e.key === 'Enter') {
                editForm.requestSubmit();
            }
        }, true);
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            haltEventPropogation(e);
            const titleInput = item.querySelector('.tabarea-item-edit-input-title') as HTMLInputElement;
            const queryInput = item.querySelector('.tabarea-item-edit-input-query') as HTMLInputElement;
            const titleValue = titleInput.value;
            const queryValue = queryInput.value;
            if (titleValue === "" || queryValue === "") { return }

            if (mode === 'create') {
                const newDataItem = await this.stateMgr.createNewTabareaItem(titleValue, queryValue, actTab);
                const tabareaItemRef = this.uiMgr.createTabareaItemReference(newDataItem.data, this.stateMgr.exportState());
                newDataItem.elementRef = tabareaItemRef;
                item.insertAdjacentElement('afterend', tabareaItemRef);

                this.uiMgr.replaceCreateButton(item as HTMLDivElement);
                this.attachCreateButtonListener(item as HTMLDivElement, actTab);

            } else if (mode === 'edit') {
                const itemId = item.dataset.ssaItemId!;
                const dataItem = await this.stateMgr.mutateTabareaItem(itemId, titleValue, queryValue, undefined, false);
                const tabareaItem = this.uiMgr.createTabareaItemReference(dataItem.data, this.stateMgr.exportState());

                item.innerHTML = tabareaItem.innerHTML;
                this.attachItemOptionsListeners(item as HTMLDivElement, actTab);
            }
        });

        //submit and exit buttons
        const editSubmit = item.querySelector('.tabarea-item-edit-input-submit') as HTMLLinkElement;
        editSubmit.addEventListener('click', (e) => {
            haltEventPropogation(e);
            editForm.requestSubmit();
        });
        const editExit = item.querySelector('.tabarea-item-edit-input-exit') as HTMLLinkElement;
        editExit.addEventListener('click', (e) => {
            haltEventPropogation(e);
            if (mode === 'create') {
                this.uiMgr.replaceCreateButton(item as HTMLDivElement);
                this.attachCreateButtonListener(item as HTMLDivElement, actTab);
            } else if (mode === 'edit') {
                const tabItems = this.stateMgr.getTabareaItems();
                const itemId = item.dataset.ssaItemId!;
                const dataItem = tabItems.find(i => i.id === itemId)!;
                const tabareaItem = this.uiMgr.createTabareaItemReference(dataItem.data, this.stateMgr.exportState());
                item.innerHTML = tabareaItem.innerHTML;
                this.attachItemOptionsListeners(item as HTMLDivElement, actTab);
            }
        });


    }

    public attachFooterEvents() {
        const uiOvr = this.uiMgr.getOverlay();
        if (!uiOvr) { return; }

        const resizeHandles = uiOvr.querySelectorAll('.footer-resize');
        resizeHandles.forEach((item) => {
            const side = item.id === 'footer-resize-left' ? 'left' : 'right';
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();

                const mouse_e = (e as MouseEvent);
                const wrapper = uiOvr.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
                if (!wrapper) { return; }
                const wrapperStyle = window.getComputedStyle(wrapper);

                const coords: PopupMutatorObject = {
                    startMouseX: mouse_e.clientX,
                    startMouseY: mouse_e.clientY,
                    startPopupX: parseInt(wrapperStyle.left),
                    startPopupY: parseInt(wrapperStyle.top),
                    startPopupW: parseInt(wrapperStyle.width),
                    startPopupH: parseInt(wrapperStyle.height)
                }
                this.uiMgr.setIsResizing(true);

                const cb_resize = (ev: MouseEvent) => {
                    const newPos = this.uiMgr.resize(ev, wrapper, coords, side);
                    this.stateMgr.setPosition(newPos?.left, newPos?.top, newPos?.width, newPos?.height);
                };
                const cb_stopResize = () => {
                    this.uiMgr.stopResize();
                    this.stateMgr.saveState();
                    document.removeEventListener('mousemove', cb_resize as EventListenerOrEventListenerObject);
                    document.removeEventListener('mouseup', cb_stopResize as EventListenerOrEventListenerObject);
                };
                document.addEventListener('mousemove', cb_resize);
                document.addEventListener('mouseup', cb_stopResize);
            })

        }, this);

        const repositionHandle = uiOvr.querySelector('#footer-positioner') as HTMLDivElement;
        this.attachRepositionLister(repositionHandle);

    }


    private attachRepositionLister(handle: HTMLElement) {
        const uiOvr = this.uiMgr.getOverlay();
        if (!uiOvr) { return; }

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const wrapper = uiOvr.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
            if (!wrapper) { return; }
            const wrapperStyle = window.getComputedStyle(wrapper);

            this.uiMgr.setIsRepositioning(true);
            const coords: PopupMutatorObject = {
                startMouseX: e.clientX,
                startMouseY: e.clientY,
                startPopupX: parseInt(wrapperStyle.left, 10),
                startPopupY: parseInt(wrapperStyle.top, 10)
            }
            const cb_reposition = (ev: MouseEvent) => {
                const newPos = this.uiMgr.reposition(ev, wrapper, coords);
                this.stateMgr.setPosition(newPos?.newX, newPos?.newY);
            };
            const cb_stopReposition = () => {
                this.uiMgr.stopReposition();
                this.stateMgr.saveState();
                document.removeEventListener('mousemove', cb_reposition as EventListenerOrEventListenerObject);
                document.removeEventListener('mouseup', cb_stopReposition as EventListenerOrEventListenerObject);
            };

            document.addEventListener('mousemove', cb_reposition);
            document.addEventListener('mouseup', cb_stopReposition);
        });
    }


    private attachRulesButtonEvents(popupObject: PopupMenu) {
        const rulesBtn = this.uiMgr.getOverlay()?.querySelector('#searchbar-rules-link') as HTMLLinkElement;
        rulesBtn.addEventListener('click', (e) => {
            haltEventPropogation(e);

            popupObject.changeTab('userRules');
        });
    }

}
