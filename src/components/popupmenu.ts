import type { PopupMenuState, DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage, constructSVGElement, haltEventPropogation } from '../utils/utils';


import api from '../utils/api';
import dm from './datamanager';
import { BackgroundManager } from './backgroundmanager';
import { PopupMenuUIManager } from './popupmenuUIManager';
import { PopupMenuEventManager } from './popupmenuEventManager';
import { PopupMenuStateManager } from './popupmenuStateManager';

const TAB_NAME_TO_ID_MAP: { [id: string]: string } = {
    'userRules': 'tab-selector-rules-btn',
    'userPinned': 'tab-selector-pinned-btn',
    'userRecents': 'tab-selector-recents-btn'
}

export class PopupMenu {

    private backgroundMgr: BackgroundManager;
    private stateMgr: PopupMenuStateManager;
    private uiMgr: PopupMenuUIManager;
    private eventMgr: PopupMenuEventManager;


    private savedState: PopupMenuState | null = null;


    constructor(bkgdmgr: BackgroundManager) {
        this.backgroundMgr = bkgdmgr;
        this.stateMgr = new PopupMenuStateManager(bkgdmgr);
        this.uiMgr = new PopupMenuUIManager(bkgdmgr, this.stateMgr);
        this.eventMgr = new PopupMenuEventManager(bkgdmgr, this.uiMgr, this.stateMgr);
        console.log('PU constructed');

    }

    public init() {
        this.backgroundMgr.init();
    }

    //TODO: ensure that we actually do ensure template and shadow above

    public getIsVisible() {
        return this.stateMgr.getIsVisible();
    }

    public getActiveTab() {
        return this.stateMgr.getActiveTab();
    }

    /* populatePopupShell (probably still has some stuff to replicate)
    private populatePopupShell(shell: HTMLDivElement) {

        //create all uiObjects
        //attach all events
        //

        //suppress other key events in search form
        //TODO:fix catching the form submit so we can do our own search w/ rules

        const main_search_form = shell.querySelector('#ssa-popup-searchform') as HTMLFormElement;
        if (main_search_form) {
            main_search_form.addEventListener('click', () => this.focusSearchbar());
            main_search_form.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    haltEventPropogation(e);
                    main_search_form.requestSubmit();
                }
                else {
                    haltEventPropogation(e);
                }
            }, true);
            main_search_form.addEventListener('keyup', haltEventPropogation, true);
            main_search_form.addEventListener('keypress', haltEventPropogation, true);
            main_search_form.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.searchformSubmit();
            }, true);
        }

        //TAB AREA AND TAB SWITCHHING BUTTONS
        const tab_buttons = shell.getElementsByClassName('popup-subtab-selector-btn');
        if (tab_buttons[this.active_tab]) {
            tab_buttons[this.active_tab]!.classList.add('popup-subtab-active-btn');
        }
        for (let i = 0; i <= tab_buttons.length; i++) {
            //TODO: make a function factory that maps i to tab_data_enum
            tab_buttons[i]?.addEventListener('click', async () => await this.changeTab(i));
        }
        if (!(this.active_tab < tab_data_enum.length)) { return; }
        this.populateTabArea(tab_data_enum[this.active_tab]!);
        this.updateSearchbar();

        //ADD EVENTS TO RESIZE HANDLES
        const resize_handles = shell.querySelectorAll('.ssa-footer-resize');
        resize_handles.forEach((item) => {
            const side = item.id === 'ssa-footer-resize-left' ? 'left' : 'right';
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const mouse_e = (e as MouseEvent);
                const wrapper = shell.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
                if (!wrapper) { return; }

                const coords = {
                    startX: mouse_e.clientX,
                    startY: mouse_e.clientY,
                    startW: parseInt(window.getComputedStyle(wrapper).width, 10),
                    startH: parseInt(window.getComputedStyle(wrapper).height, 10)
                }
                this.isResizing = true;

                const cb_resize = (e: MouseEvent) => this.resize(e, wrapper, coords, side);
                const cb_stopResize = (e: MouseEvent) => this.stopResize(cb_resize, cb_stopResize);
                document.addEventListener('mousemove', cb_resize);
                document.addEventListener('mouseup', cb_stopResize);
            })

        }, this);

        const reposition_handle = shell.querySelector('#ssa-footer-positioner') as HTMLDivElement;
        reposition_handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const wrapper = shell.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
            if (!wrapper) { return; }
            const coords = {
                startX: e.clientX,
                startY: e.clientY,
                popupX: this.positionX,
                popupY: this.positionY
            };
            this.isRepositioning = true;

            const cb_reposition = (e: MouseEvent) => this.reposition(e, wrapper, coords);
            const cb_stopReposition = (e: MouseEvent) => this.stopReposition(cb_reposition, cb_stopReposition);
            document.addEventListener('mousemove', cb_reposition);
            document.addEventListener('mouseup', cb_stopReposition);
        })

        this.saveCurrentState();
    }
    */


    public async changeTab(toTab: string) {

        await this.stateMgr.syncState();
        if (!this.stateMgr.getIsVisible()) { return }

        //const fromTab = this.stateMgr.getActiveTab();
        const ovr = this.uiMgr.getOverlay()!;
        //const tabContainer = ovr.querySelector('.popup-tab-selector-container')!;

        const uiExistsAndMutated = this.uiMgr.changeTabSelector(toTab);
        if (!uiExistsAndMutated) { return }

        //update state
        this.stateMgr.setActiveTab(toTab);
        await this.stateMgr.createUpdateTabareaDataItems();
        this.stateMgr.saveState();
        const stateNewTab = this.stateMgr.exportState();
        //update ui
        const tabarea = ovr.querySelector('#popup-tabarea-grid-outer') as HTMLDivElement;
        this.uiMgr.replaceTabarea(tabarea, stateNewTab);
        //TODO: reassign event listeners
        this.eventMgr.attachTabareaEvents(this);

    }

    /*populateTabArea (need to replicate SVG construction/attachment)
    private async populateTabArea(active: string) {

        //TODO: pretty sure this is just
        //  uiMgr.fillarea(tab)
        //  eventMgr.attachTabareaEvents(tab)
        //

        const ghost_svg = await constructSVGElement('assets/icons/soul-icon.svg');
        ghost_svg.id = 'subtab-area-bottom-icon';
        ghost_svg.setAttributeNS(null, "width", "32px");
        ghost_svg.setAttributeNS(null, "height", "32px");
        ghost_svg.setAttributeNS(null, "aria-hidden", "true");
        ghost_svg.setAttributeNS(null, "focusable", "false");
        ghost_svg.setAttributeNS(null, "transform", "scale(4, -4)");
        ghost_svg.style.minHeight = "32px";
        ghost_svg.style.minHeight = "32px";
        //ghost_svg.setAttributeNS(null, "transform", "translate(8, 12)");
        subtab_area?.appendChild(ghost_svg);
    }
    */

    /*enterItemEditor (still has some listeners and HTML that needs replicating)
    private enterItemEditor(mode: string, tab: string, container: HTMLElement) {

        const create_form = document.createElement('form');
        create_form.classList.add('subtab-item-edit-form');
        //text inputs
        const create_input_title = document.createElement('input');
        const create_input_query = document.createElement('input');
        create_input_title.classList.add('subtab-item-edit-input-text');
        create_input_query.classList.add('subtab-item-edit-input-text');
        create_input_title.placeholder = 'Name...';
        create_input_query.placeholder = tab === 'userRules' ? 'Rule Text...' : 'Query Text...';
        //submit/exit buttons
        const create_input_submit = document.createElement('a');
        const create_input_exit = document.createElement('a');
        create_input_submit.classList.add('subtab-item-edit-input-button');
        create_input_exit.classList.add('subtab-item-edit-input-button');
        create_input_submit.classList.add('subtab-item-edit-input-submit');
        create_input_exit.classList.add('subtab-item-edit-input-exit');
        create_input_submit.textContent = "↵";
        create_input_exit.textContent = "✖";

        if (mode === 'edit') {
            const old_name = container.querySelector('.ssa-sta-item-title')?.textContent ?? "";
            const old_query = container.querySelector('.ssa-sta-item-query')?.textContent ?? "";
            create_input_title.value = old_name;
            create_input_query.value = old_query;
        }

        create_form.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                haltEventPropogation(e);
                create_form.requestSubmit();
            } else {
                haltEventPropogation(e);
            }
        }, true);
        create_form.addEventListener('keyup', haltEventPropogation, true);
        create_form.addEventListener('keypress', haltEventPropogation, true);

        if (mode === 'create') {
            create_form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (create_input_title.value === "" || create_input_query.value === "") { return; }

                const store = tab === 'userRules' ? 'userRules' : tab === 'userPinned' ? 'userPinned' : 'userRecent';
                const id_prefix = store === 'userRules' ? 'rul_' : store === 'userPinned' ? 'pin_' : 'rec_';
                const new_item_id = genId(id_prefix);
                let tab_data = await dm.get(store);
                if (!tab_data) {
                    tab_data = [];
                }
                const new_item = {
                    id: new_item_id,
                    name: create_input_title.value,
                    query: create_input_query.value,
                    tags: []
                }
                tab_data.unshift(new_item);
                await dm.set(store, tab_data);
                this.populateTabArea(tab);
            });

            create_input_exit.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const create_button_inner = document.createElement('div');
                create_button_inner.classList.add('ssa-popup-subtabarea-create-inner');
                const create_button_text = document.createElement('span');
                create_button_text.classList.add('ssa-popup-subtabarea-create-text');
                create_button_text.textContent = "+";

                create_button_inner.addEventListener('click', async (e) => {
                    this.enterItemEditor('create', tab_data_enum[this.active_tab]!, container);
                });

                create_button_inner.appendChild(create_button_text);
                container.replaceChildren(create_button_inner);
            });
        } else if (mode === 'edit') {
            create_form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (create_input_title.value === "" || create_input_query.value === "") { return; }

                const store = tab === 'userRules' ? 'userRules' : tab === 'userPinned' ? 'userPinned' : 'userRecent';
                let tab_data = await dm.get(store);
                const item_id = container.dataset.ssaItemId!;
                const new_name = create_input_title.value;
                const new_query = create_input_query.value;
                const constructed_item = {
                    id: item_id,
                    name: new_name,
                    query: new_query,
                    tags: ['']
                }
                for (let i = 0; i < tab_data.length; i++) {
                    if (tab_data[i].id === item_id) {
                        constructed_item.tags = tab_data[i].tags!;
                        tab_data[i] = constructed_item;
                        break;
                    }
                }
                await dm.set(store, tab_data);
                if (tab === 'userRules') {
                    if (item_id in this.activeRules) {
                        delete this.activeRules[item_id];
                        this.updateSearchbar();
                    }
                }
                const updated_subtab_item = this.createSubtabItem(store, constructed_item);
                container.parentElement?.insertBefore(updated_subtab_item, container);
                container.remove();

            });

            create_input_exit.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                let tab_data = await dm.get(tab);
                const item_id = container.dataset.ssaItemId!;
                const old_data = tab_data.find((it: { id: string, name: string, query: string, tags: string[] }) => it.id === item_id);

                const remade_item = this.createSubtabItem(tab, old_data);
                container.parentElement?.insertBefore(remade_item, container);
                container.remove();
            });
        }

        create_input_submit.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            create_form.requestSubmit();
        });

        container.replaceChildren();
        create_form.appendChild(create_input_title);
        create_form.appendChild(create_input_query);
        create_form.appendChild(create_input_submit);
        create_form.appendChild(create_input_exit);
        container.prepend(create_form);

        create_input_title.focus();
    }
    */


    public async createAndShow() {
        console.log('start CaS');
        await this.stateMgr.syncState();
        this.stateMgr.setIsVisible(true);
        await this.stateMgr.createUpdateTabareaDataItems();
        //helper to init with currentState and default template
        this.initDefaultUI();
        this.uiMgr.attachOverlay();
        this.uiMgr.refreshPopupLocation(this.stateMgr.exportState());
        //const uiObjects = uiMgr.getModules() - references to module containers (and what they contain?)
        //eventMgr.attachEvents(uiObjects)
        //TODO: implement this behavior as uiMgr holding a list of 
        //  ui from top to bottom, then it can be passed here in order to
        //  attach events depending on what type of module it is, e.g.
        //      tabarea, repositionHandle, searchbar, etc.
        await this.eventMgr.initPopupEvents(this);
    }

    public destroyAndHide() {
        this.uiMgr.destroyOverlay();
        this.stateMgr.setIsVisible(false);
    }

    private initDefaultUI(template?: HTMLTemplateElement) {
        const localTemplate: HTMLTemplateElement = template ?? this.backgroundMgr.getTemplate('mainPopupmenuTemplate')!;
        const currentState: PopupMenuState = this.stateMgr.exportState();
        //const tabareaItemInstances = this.stateMgr.getTabareaItems();
        this.uiMgr.initUIFromTemplate(localTemplate, currentState);
    }


    public toggleVisibility(): string {
        if (this.stateMgr.getIsVisible()) {
            this.destroyAndHide();
            return "hidden";
        } else {
            this.createAndShow();
            return "shown";
        }
    }


    public focusSearchbar() {
        if (!this.stateMgr.getIsVisible()) { return; }
        this.uiMgr.focusSearchbar();
    }




    /* createSubtabItem (still has some eventListeners i need to replicate)
    private createSubtabItem(type: string, item_data: { id: string, name: string, query: string, tags: string[] }) {
        //OPTIONS BUTTONS
        const options_button = document.createElement('a');
        options_button.textContent = "⚙︎";
        options_button.classList.add('subtab-item-edit-input-button', 'subtab-item-edit-options');
        const expand_options_listener = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            //change option button icon/behavior
            options_button.textContent = "⮞";
            options_button.removeEventListener('click', expand_options_listener);
            options_button.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const opts_buttons = item.querySelectorAll('.subtab-item-edit-input-button');
                opts_buttons.forEach((button) => {
                    if (!button.classList.contains('subtab-item-edit-options')) {
                        button.remove();
                    } else {
                        button.textContent = "⚙︎";
                        button.addEventListener('click', (ev) => expand_options_listener(ev as PointerEvent));
                    }
                });


            });

            //make delete, edit, fill buttons
            const delete_button = document.createElement('a');
            const edit_button = document.createElement('a');
            const fill_button = document.createElement('a');

            delete_button.classList.add('subtab-item-edit-input-button', 'subtab-item-edit-delbtn');
            edit_button.classList.add('subtab-item-edit-input-button', 'subtab-item-edit-editbtn');
            fill_button.classList.add('subtab-item-edit-input-button', 'subtab-item-edit-fillbtn');

            delete_button.textContent = "✖";
            edit_button.textContent = "✏";
            fill_button.textContent = "⤒";

            delete_button.addEventListener('click', async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();

                const tab_data = await dm.get(type);
                const rm_id = item.dataset.ssaItemId!;
                for (let i = 0; i < tab_data.length; i++) {
                    if (tab_data[i].id === rm_id) {
                        tab_data.splice(i, 1);
                        break;
                    }
                }
                if (type === 'userRules') {
                    if (rm_id in this.activeRules) {
                        delete this.activeRules[rm_id];
                        this.updateSearchbar();
                    }
                }
                await dm.set(type, tab_data);
                item.remove();
                this.saveCurrentState();
                this.populateTabArea(type);
            });

            edit_button.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                this.enterItemEditor('edit', type, item);
            })

            fill_button.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const sb = this.shadow?.querySelector('#popup-searchbar-input') as HTMLInputElement;
                const q_text = query_span.textContent;
                sb.value += ` ${q_text}`;

                options_button.click();

            });


            item.insertBefore(delete_button, options_button);
            item.insertBefore(edit_button, options_button);
            item.insertBefore(fill_button, options_button);


        }
        options_button.addEventListener('click', expand_options_listener);
        item.appendChild(options_button);




        if (type === 'userRules') {
            if (item_data.id in this.activeRules) {
                item.classList.add('popup-active-rule-item');
            }

            item.addEventListener('click', (e) => {
                const addedRule = this.toggleActiveRule({ id: item_data.id, name: item_data.name, query: item_data.query });
                this.updateSearchbar();
                if (addedRule) {
                    item.classList.add('popup-active-rule-item');
                } else {
                    item.classList.remove('popup-active-rule-item');
                }
            })

        } else if (type === 'userPinned' || type === 'userRecent') {

            item.addEventListener('dblclick', (e) => {

                const form = document.querySelector('.header-search') as HTMLFormElement;
                const input = document.getElementById('header-search-field') as HTMLInputElement;
                input.value = item_data.query;
                form.submit();
            });
        }


        //logic for reconstructing all hidden input fields,
        //TODO: allow user to mutate hidden fields

        //const sc_unique = (document.getElementById('#unique') as HTMLInputElement)?.value ?? null;
        //const sc_as = (document.getElementById('#as') as HTMLInputElement)?.value ?? null;
        //const sc_order = (document.getElementById('#order') as HTMLInputElement)?.value ?? null;

        //const search_obj = new URLSearchParams();
        //search_obj.append("q", item_data.query);
        //search_obj.append("unique", sc_unique);
        //search_obj.append("as", sc_as);
        //search_obj.append("order", sc_order);

        //const sc_input = document.querySelector('#header-search-field') as HTMLInputElement;
        //sc_input.value = item_data.query;


        return item;
    }

    */


    public searchformSubmit() {

        const searchInput = this.uiMgr.getOverlay()?.querySelector('#popup-searchbar-input') ?? null;
        const popupTextInput = !searchInput ? "" : (searchInput as HTMLInputElement).value;

        let value = `${popupTextInput}`;
        let rulesStr = '';
        for (let [ruleId, ruleData] of Object.entries(this.stateMgr.getActiveRules())) {
            rulesStr += `${ruleData.query} `;
        }
        value = rulesStr + value;

        const sfForm = document.querySelector('.header-search') as HTMLFormElement;
        const sfInput = document.getElementById('header-search-field') as HTMLInputElement;
        sfInput.value = value;
        sfForm.submit();
    }

}

