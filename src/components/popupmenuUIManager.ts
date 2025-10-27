import type { BackgroundManager } from "./backgroundmanager";
import type { PopupMenuState, PopupMutatorObject, NamedQuery } from "../types/ssa_types";
import { TabareaDataItem } from "../types/ssa_types";

import dm from './datamanager';
import { createCreateButton } from "../utils/utils";

const TAB_NAME_TO_ID_MAP: { [id: string]: string } = {
    'userRules': 'tab-selector-rules-btn',
    'userPinned': 'tab-selector-pinned-btn',
    'userRecents': 'tab-selector-recents-btn'
}

export class PopupMenuUIManager {

    private backgroundMgr: BackgroundManager;

    private overlay: HTMLDivElement | null = null;

    private isResizing = false;
    private isRepositioning = false;
    //private moduleHandles: { [id: string]: HTMLElement } = {};



    constructor(bkgd: BackgroundManager) {
        this.backgroundMgr = bkgd;
    }

    //called after DOMContentLoaded
    public init() {

        //get and store reference to backgroundManager, (more?)

    }

    public ensureOverlay() {
        const old = document.getElementById('ssa-popupmenu-overlay') as HTMLDivElement | null;
        if (old) {
            old.remove();
        }

        const ovr = document.createElement('div');
        ovr.id = 'ssa-popupmenu-overlay';
        this.overlay = ovr;
    }

    public attachOverlay() {
        if (this.overlay) {
            console.log('attach overlay');
            console.log(this.overlay);
            console.log(this.backgroundMgr.getShadow());
            this.backgroundMgr.getShadow().appendChild(this.overlay);
        }
    }

    public getOverlay() { return this.overlay; }

    public destroyOverlay() {
        this.overlay?.remove();
    }

    public focusSearchbar() {
        if (this.overlay) {
            const input = this.overlay.querySelector('#popup-searchbar-input') as HTMLInputElement;
            input?.focus();
        }
    }

    public setIsResizing(val: boolean) {
        this.isResizing = val;
    }

    public setIsRepositioning(val: boolean) {
        this.isRepositioning = val;
    }

    //create and fill out all UI components, dont attach overlay to
    //visible DOM yet
    public async initUIFromTemplate(template: HTMLTemplateElement, state: PopupMenuState) {

        this.ensureOverlay();
        const t = this.backgroundMgr.getTemplate('mainPopupmenuTemplate') as HTMLTemplateElement;
        const clone = t.content.cloneNode(true) as DocumentFragment;
        this.overlay!.appendChild(clone);
        const popupShell = this.overlay!.querySelector('#ssa-popupmenu-wrapper') as HTMLDivElement;

        //SEARCHBAR
        const mainSearchForm = popupShell.querySelector('#ssa-popup-searchform') as HTMLFormElement;
        //fill searchbar buttons or do it in template html

        const numActiveRules = Object.keys(state.activeRules).length;
        if (numActiveRules > 0) {
            this.createUpdateRulesButton(numActiveRules);
        }


        //TAB BUTTONS
        const tabButtonContainer = popupShell.querySelector('#popup-tab-selector-container') as HTMLDivElement;
        const currentActiveId = TAB_NAME_TO_ID_MAP[state.activeTab] ?? null;
        console.log(`active ID: ${currentActiveId}`);
        if (currentActiveId) {
            const aBtn = tabButtonContainer.querySelector(`#${currentActiveId}`) ?? null;
            aBtn?.classList.add('popup-tab-selector-btn-active');
        }


        //TABAREA BUTTONS
        const tabarea = popupShell.querySelector('#popup-tabarea-grid-outer') as HTMLDivElement;
        const els = this.createAllTabareaItems(state);
        this.attachAllTabareaItems(tabarea, els);

        if (state.activeTab === 'userRules' || state.activeTab === 'userPinned') {
            const createButton = createCreateButton();
            tabarea.prepend(createButton);
        }

        //need to make svg, append




        //FOOTER
        //anything to do...?
    }

    public createAllTabareaItems(state: PopupMenuState) {
        const els: HTMLDivElement[] = [];
        const allItems = state.tabareaItems;

        for (let dataItem of allItems) {
            dataItem.elementRef = this.createTabareaItemReference(dataItem.data, state);
            if (dataItem.id in state.activeRules) {
                dataItem.isActive = true;
                dataItem.elementRef.classList.add('popup-item-active-rule');
            }
            els.push(dataItem.elementRef);
        }
        return els;
    }

    public attachAllTabareaItems(container: HTMLElement, els: HTMLDivElement[]) {
        for (let e of els) {
            container.appendChild(e);
        }
    }

    public replaceTabarea(container: HTMLElement, state: PopupMenuState) {
        const els = this.createAllTabareaItems(state);
        container.replaceChildren();
        this.attachAllTabareaItems(container, els);

        if (state.activeTab === 'userRules' || state.activeTab === 'userPinned') {
            const createButton = createCreateButton();
            container.prepend(createButton);
        }
    }

    public createTabareaItemReference(itemData: NamedQuery, state: PopupMenuState) {

        const item = this.backgroundMgr.getTemplateContent('tabareaItem') as HTMLDivElement;
        item.dataset.ssaItemId = itemData.id;
        item.querySelector('.popup-tabarea-item-title')!.innerHTML = itemData.name;
        item.querySelector('.popup-tabarea-item-query')!.innerHTML = itemData.query;

        return item;
    }

    public replaceOptionsButtons(item: HTMLDivElement, actTab: string, dir: string) {
        if (dir === 'expand') {
            const deleteButton = document.createElement('a');
            const editButton = document.createElement('a');
            const fillButton = document.createElement('a');
            const contractButton = document.createElement('a');
            deleteButton.classList.add('tabarea-item-edit-input-button', 'tabarea-item-edit-delbtn');
            editButton.classList.add('tabarea-item-edit-input-button', 'tabarea-item-edit-editbtn');
            fillButton.classList.add('tabarea-item-edit-input-button', 'tabarea-item-edit-fillbtn');
            contractButton.classList.add('tabarea-item-edit-input-button', 'tabarea-item-edit-contractbtn');
            deleteButton.textContent = "✖";
            editButton.textContent = "✏";
            fillButton.textContent = "⤒";
            contractButton.textContent = "⮞";

            for (let oldbtn of item.querySelectorAll('.tabarea-item-edit-input-button')) {
                oldbtn.remove();
            }
            item.appendChild(deleteButton);
            item.appendChild(editButton);
            item.appendChild(fillButton);
            item.appendChild(contractButton);

        } else if (dir === 'contract') {
            const optionsButton = document.createElement('a');
            optionsButton.classList.add('tabarea-item-edit-input-button', 'tabarea-item-edit-options');
            optionsButton.textContent = "⚙︎";

            for (let oldbtn of item.querySelectorAll('.tabarea-item-edit-input-button')) {
                oldbtn.remove();
            }
            item.appendChild(optionsButton);
        }
    }

    public replaceWithEditForm(item: HTMLDivElement, mode: string) {
        const editForm = this.backgroundMgr.getTemplateContent('tabareaEditForm') as HTMLFormElement;
        if (mode === 'edit') {
            //fill input values
            const itemTitle = (item.querySelector('.popup-tabarea-item-title') as HTMLSpanElement).textContent;
            const itemQuery = (item.querySelector('.popup-tabarea-item-query') as HTMLSpanElement).textContent;
            const titleInput = editForm.querySelector('.tabarea-item-edit-input-title') as HTMLInputElement;
            const queryInput = editForm.querySelector('.tabarea-item-edit-input-query') as HTMLInputElement;
            titleInput.value = itemTitle;
            queryInput.value = itemQuery;
        }
        item.replaceChildren();
        item.append(editForm);
    }

    public replaceCreateButton(oldBtn: HTMLDivElement) {
        const cb = createCreateButton();
        oldBtn.innerHTML = cb.innerHTML;
    }


    public reposition(e: MouseEvent, wrapper: HTMLDivElement, startData: PopupMutatorObject) {
        if (!this.isRepositioning) { return; }

        const deltaX = e.clientX - startData.startMouseX;
        const deltaY = e.clientY - startData.startMouseY;
        wrapper.style.position = 'absolute';
        wrapper.style.left = `${startData.startPopupX + deltaX}px`;
        wrapper.style.top = `${startData.startPopupY + deltaY}px`;

        return { newX: startData.startPopupX + deltaX, newY: startData.startPopupY + deltaY };
    }

    public stopReposition() {
        this.isRepositioning = false;
    }

    public resize(ev: MouseEvent, wrapper: HTMLDivElement, startData: PopupMutatorObject, side: string) {
        if (!this.isResizing) { return; }

        const currentStyle = getComputedStyle(wrapper);
        const boundingRect = wrapper.getBoundingClientRect();

        const minW = parseInt(currentStyle.minWidth);
        const maxW = parseInt(currentStyle.maxWidth);
        const minH = parseInt(currentStyle.minHeight);
        const maxH = parseInt(currentStyle.maxHeight);
        let newW = startData.startPopupW!;
        let newH = startData.startPopupH!;
        let newX = boundingRect.left;

        if (side === "right") {
            newW = startData.startPopupW! + (ev.clientX - startData.startMouseX);
            newW = Math.min(Math.max(newW, minW), maxW);
        } else if (side === "left") {
            // When dragging left, width increases as e.clientX decreases
            const deltaX = ev.clientX - boundingRect.left;
            newW = boundingRect.width - deltaX;
            newW = Math.min(Math.max(newW, minW), maxW);
            // Move X so that right side stays still
            //TODO: if the resize ends up at minW or maxW,
            //do math to ensure that the position is correct if the mouse
            //moved farther than a few units (currently snaps strangely)
            if (newW == maxW && boundingRect.width == maxW) {
                //dont change the position if resizing maxWidth popup
            } else if (newW > minW) {
                newX = boundingRect.left + deltaX;
            } else {
                const wDif = boundingRect.width - newW;
                newX = boundingRect.left + wDif;
            }
        }

        // Handle vertical resize (if you ever add top/bottom)
        newH = startData.startPopupH! + (ev.clientY - startData.startMouseY);
        newH = Math.min(Math.max(newH, minH), maxH);

        wrapper.style.width = `${newW}px`;
        wrapper.style.height = `${newH}px`;

        this.relocatePopup(newX, boundingRect.top);
        //force reflow
        const subtab_area = wrapper.querySelector('#popup-tabarea-grid-outer') as HTMLElement;
        void subtab_area?.offsetHeight;

        return { left: newX, top: boundingRect.top, width: newW, height: newH };
    }

    public stopResize() {
        this.isResizing = false;
    }

    public relocatePopup(left: number, top: number) {

        const popup = this.overlay?.querySelector('#ssa-popupmenu-outer-container-div') ?? null;
        if (!popup) { return; }

        (popup as HTMLDivElement).style.left = `${left}px`;
        (popup as HTMLDivElement).style.top = `${top}px`;
    }

    public refreshPopupLocation(state: PopupMenuState) {
        this.relocatePopup(state.position.left, state.position.top);
    }

    //return whether the button had to be created (so click listener may be attached)
    public createUpdateRulesButton(numActive: number): boolean {
        const searchContainer = this.overlay?.querySelector('#popup-searchbar-container') ?? null;
        if (!searchContainer) { return false }

        let rv = false;
        let rulesBtn = searchContainer.querySelector('#searchbar-rules-link');
        if (!rulesBtn) {
            rv = true;
            rulesBtn = document.createElement('a');
            rulesBtn.id = 'searchbar-rules-link';
            searchContainer.prepend(rulesBtn);
        }
        if (numActive == 0) {
            rulesBtn.remove();
            rv = false;
            return rv;
        }

        rulesBtn.textContent = `${numActive}`;
        return rv;
    }

    public toggleItemActiveRule(item: HTMLDivElement) {
        if (item.classList.contains('popup-tabarea-item')) {
            if (item.classList.contains('popup-item-active-rule')) {
                item.classList.remove('popup-item-active-rule');
            } else {
                item.classList.add('popup-item-active-rule');
            }
        }

    }

    public removeTabareaItem(item: HTMLElement) {
        item.remove();
    }


    public changeTabSelector(toTab: string) {

        console.log(`toTab: ${toTab}`)

        const tabContainer = this.overlay!.querySelector('#popup-tab-selector-container')!;
        const toTabId: string | null = TAB_NAME_TO_ID_MAP[toTab] ?? null;
        console.log(`toTab ID: ${toTabId}`)
        const toTabEl = tabContainer.querySelector(`#${toTabId}`);
        if (!toTabEl) { return false }
        //ui exists, mutate it
        const fromTabEls = tabContainer.querySelectorAll(`.popup-tab-selector-btn-active`);
        fromTabEls.forEach((a) => { a.classList.remove("popup-tab-selector-btn-active") });
        toTabEl.classList.add('popup-tab-selector-btn-active');

        return true;
    }






}
