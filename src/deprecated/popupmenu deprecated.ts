
import popupmenu_template_html from '../../assets/components/popupmenu_template.html?raw';
import popupmenu_template_css from '../../assets/components/popupmenu_template.css?inline';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage, constructSVGElement, haltEventPropogation } from '../utils/utils';

import api from '../utils/api';
import dm from './datamanager';

const tab_data_enum = ['userRules', 'userPinned', 'userRecent'];

export interface PopupmenuState {
    isVisible: boolean,
    active_tab: number,
    activeRules: { [id: string]: { name: string, query: string } };
    positionX: number,
    positionY: number,
    width: number,
    height: number

}

export class PopupMenu {

    private template: HTMLTemplateElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private shadow: ShadowRoot | null = null;

    private isVisible: boolean = false;
    private active_tab: number = 1;
    private activeRules: { [id: string]: { name: string, query: string } } = {};
    private isResizing: boolean = false;
    private isRepositioning: boolean = false;
    private positionX = 512;
    private positionY = 64;
    private width = 420;
    private height = 400;

    //private uiMgr: PopupMenuUIManager;
    //private stateMgr: PopupMenuStateManager

    private savedState: PopupmenuState | null = null;


    private static readonly default_state: PopupmenuState = {
        isVisible: false,
        active_tab: 1,
        activeRules: {},
        positionX: 512,
        positionY: 64,
        width: 420,
        height: 400
    };

    constructor() {
        this.ensureTemplate();
        this.initShadowRoot();
    }


    public initState(partial_state?: Partial<PopupmenuState>) {
        const temp_state = { ...PopupMenu.default_state, ...partial_state } as PopupmenuState;

        this.isVisible = temp_state.isVisible;
        this.active_tab = temp_state.active_tab;
        this.activeRules = temp_state.activeRules;
        this.positionX = temp_state.positionX;
        this.positionY = temp_state.positionY;
        this.width = temp_state.width;
        this.height = temp_state.height;

        if (this.isVisible) {
            this.show();
        }

        this.saveCurrentState();
    }


    private createState(): PopupmenuState {
        return {
            isVisible: this.isVisible,
            active_tab: this.active_tab,
            activeRules: this.activeRules,
            positionX: this.positionX,
            positionY: this.positionY,
            width: this.width,
            height: this.height
        }
    }

    private saveCurrentState() {
        this.savedState = this.createState();
        dm.set('popupSavedState', this.savedState);
    }

    //TODO: this isn't popupmenu behavior so move it somewhere else
    //TODO: harden against tampering with the shadow root/DOM
    private initShadowRoot() {

        let shadow_entry = document.getElementById('ssa-shadow-entry') as HTMLDivElement;
        if (!shadow_entry) {

            shadow_entry = document.createElement('div');
            shadow_entry.id = 'ssa-shadow-entry';
            this.shadow = shadow_entry.attachShadow({ mode: 'open' });
            //TODO: separate out style injections
            const style_element = constructStyleElement(popupmenu_template_css);
            this.shadow.appendChild(style_element);
            document.body.appendChild(shadow_entry);
        }
        this.shadow = shadow_entry.shadowRoot!;
    }

    private ensureTemplate(): HTMLTemplateElement {
        //make and insert popup template into DOM (invisible by default)
        let template = document.getElementById('ssa-injected-popupmenu-template') as HTMLTemplateElement;
        if (!template) {
            const temp_container = document.createElement('div');
            temp_container.innerHTML = `${popupmenu_template_html}`;
            template = document.body.appendChild(temp_container.firstElementChild!) as HTMLTemplateElement;
        }
        this.template = template;
        return template;
    }


    private ensureOverlay(): HTMLDivElement {

        let ovr = document.getElementById('ssa-popupmenu-overlay') as HTMLDivElement | null;
        if (!ovr || !(this.overlay === ovr)) {
            ovr?.remove();
            ovr = document.createElement('div');
            ovr.id = 'ssa-popupmenu-overlay';
            this.overlay = ovr;
        }
        return ovr as HTMLDivElement;
    }

    private populatePopupShell(shell: HTMLDivElement) {

        //suppress other key events in search form
        //TODO: fix catching the form submit so we can do our own search w/ rules
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

    private reposition(e: MouseEvent, wrapper: HTMLDivElement, coords: { startX: number, startY: number, popupX: number, popupY: number }) {

        if (!this.isRepositioning) { return; }

        const deltaX = e.clientX - coords.startX;
        const deltaY = e.clientY - coords.startY;
        this.positionX = coords.popupX + deltaX;
        this.positionY = coords.popupY + deltaY;

        this.updatePosition();
    }

    private stopReposition(listener1: (e: MouseEvent) => void, listener2: (e: MouseEvent) => void) {
        this.isRepositioning = false;
        document.removeEventListener('mousemove', listener1 as EventListenerOrEventListenerObject);
        document.removeEventListener('mouseup', listener2 as EventListenerOrEventListenerObject);
        this.saveCurrentState();
    }

    //TODO: make this based on a string enum ['Rules', 'Pinned', 'Recents']
    public async changeTab(active: number) {
        //if (this.active_tab == active) { return; }
        const tab_buttons = this.shadow?.querySelectorAll('.popup-subtab-selector-btn');
        if (!tab_buttons) { return; }

        //update button styles
        for (let i = 0; i <= tab_buttons.length; i++) {
            tab_buttons[i]?.classList.remove("popup-subtab-active-btn");
            if (active == i) {
                tab_buttons[i]?.classList.add("popup-subtab-active-btn");
                this.active_tab = i;
            }
        }
        if (active >= tab_data_enum.length) { return; }

        await this.populateTabArea(tab_data_enum[active]!);
        this.saveCurrentState();
    }

    private async populateTabArea(active: string) {

        const tab_data_key = active ?? 'userPinned';
        const tab_data = await dm.get(tab_data_key);
        const subtab_area = this.shadow?.getElementById('ssa-popup-subtabarea-grid-outer') ?? null;
        const most_recent_state = await dm.get('popupSavedState');
        this.activeRules = most_recent_state.activeRules;
        this.updateSearchbar();

        //TODO: for Rules and UserPinned, add a button to create new entries

        if (tab_data) {
            subtab_area?.replaceChildren();

            for (let i = 0; i < tab_data.length; i++) {
                let new_item = this.createSubtabItem(active, tab_data[i]);
                subtab_area?.appendChild(new_item);
            }
        }

        if (tab_data_key === 'userRules' || tab_data_key === 'userPinned') {
            const create_button = document.createElement('div');
            create_button.classList.add('ssa-popup-subtabarea-create');
            const create_button_inner = document.createElement('div');
            create_button_inner.classList.add('ssa-popup-subtabarea-create-inner');
            const create_button_text = document.createElement('span');
            create_button_text.classList.add('ssa-popup-subtabarea-create-text');
            create_button_text.textContent = "+";

            create_button_inner.addEventListener('click', async (e) => {
                this.enterItemEditor('create', tab_data_enum[this.active_tab]!, create_button);

            });

            create_button_inner.appendChild(create_button_text);
            create_button.appendChild(create_button_inner);
            subtab_area?.prepend(create_button);
        }

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

    public createAndShow() {
        //stateMgr.syncState()
        //stateMgr.update() - isVisible gets true, 
        //const currentState: popupState = stateMgr.exportState()
        //const currentTemplate = backgroundMgr.getDefaultTemplate()
        //uiMgr.initUIFromTemplate(currentTemplate, currentState)
        //const uiObjects = uiMgr.getModules() - references to module containers (and what they contain?)
        //eventMgr.attachEvents(uiObjects)
        //uiMgr.attachOverlay()
    }

    public destroyAndHide() {
        //uiMgr.destroyOverlay()
        //stateMgr.update() - isVisible gets false
    }

    public show(): void {
        if (!this.template) { return };
        if (!this.shadow) { return };

        //add overlay wrapper to shadow DOM
        const wrapper_overlay = this.ensureOverlay();
        this.shadow.appendChild(wrapper_overlay);
        this.overlay = this.shadow.getElementById('ssa-popupmenu-overlay') as HTMLDivElement;

        //POPUP generation
        const clone = this.template.content.cloneNode(true) as DocumentFragment;
        this.overlay.appendChild(clone);
        const popup_shell = this.shadow.getElementById('ssa-popupmenu-wrapper') as HTMLDivElement;
        this.populatePopupShell(popup_shell);
        const popup = this.overlay.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
        popup.style.position = 'absolute';
        popup.style.left = `${this.positionX}px`;
        popup.style.top = `${this.positionY}px`;
        popup.style.width = `${this.width}px`;
        popup.style.height = `${this.height}px`;

        this.isVisible = true;
        this.focusSearchbar();
        this.saveCurrentState();
    }

    public hide(): void {
        this.overlay?.remove();
        this.overlay = null;
        this.isVisible = false;
        this.saveCurrentState();
    }

    public toggleVisibility(): string {
        if (this.overlay) {
            this.hide();
            return "hidden";
        } else {
            this.show();
            return "shown";
        }
    }

    public getShadowRoot() {
        return this.shadow;
    }
    public getIsVisible() {
        return this.isVisible;
    }
    public getOverlay() {
        return this.overlay;
    }
    public getActiveTab() {
        return this.active_tab;
    }

    public focusSearchbar() {
        if (!this.isVisible) { return; }
        if (!this.overlay) { return; }

        const search_form = this.overlay.querySelector('#ssa-popup-searchform') as HTMLFormElement;
        const search_input = search_form.querySelector('#popup-searchbar-input') as HTMLInputElement;
        if (search_input) {
            search_input.focus();
        }
    }


    //TODO: always snaps to SearchbarMenu, needs to care about offset
    //when resize/reposition are fleshed out
    public updatePosition() {
        if (!this.isVisible) { return; }
        const ref = document.getElementById('ssa-main-container-link');
        const popup_wrapper = this.overlay?.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;

        if (popup_wrapper && ref) {
            popup_wrapper.style.position = 'absolute';
            popup_wrapper.style.left = `${(this.positionX)}px`;
            popup_wrapper.style.top = `${(this.positionY)}px`;
        }
    }


    public resize(e: MouseEvent, wrapper: HTMLElement, coords: { startX: number, startY: number, startW: number, startH: number }, side: string) {

        if (!this.isResizing) { return; }
        const current_style = getComputedStyle(wrapper);
        const minW = parseInt(current_style.minWidth);
        const maxW = parseInt(current_style.maxWidth);
        const minH = parseInt(current_style.minHeight);
        const maxH = parseInt(current_style.maxHeight);

        let newW = coords.startW;
        let newH = coords.startH;
        let newX = this.positionX;

        const bounding_rect = wrapper.getBoundingClientRect();

        if (side === "right") {
            newW = coords.startW + (e.clientX - coords.startX);
            newW = Math.min(Math.max(newW, minW), maxW);
        } else if (side === "left") {
            // When dragging left, width increases as e.clientX decreases
            const deltaX = e.clientX - bounding_rect.left;
            newW = bounding_rect.width - deltaX;
            newW = Math.min(Math.max(newW, minW), maxW);
            // Move X so that right side stays still
            //TODO: if the resize ends up at minW or maxW,
            //do math to ensure that the position is correct if the mouse
            //moved farther than a few units (currently snaps strangely)
            if (newW == maxW && bounding_rect.width == maxW) {
                //dont change the position if resizing maxWidth popup
            } else if (newW > minW) {
                newX = this.positionX + deltaX;
            } else {
                const w_dif = bounding_rect.width - newW;
                newX = this.positionX + w_dif;
            }
        }

        // Handle vertical resize (if you ever add top/bottom)
        newH = coords.startH + (e.clientY - coords.startY);
        newH = Math.min(Math.max(newH, minH), maxH);

        wrapper.style.width = `${newW}px`;
        wrapper.style.height = `${newH}px`;
        this.width = newW;
        this.height = newH;

        if (side === "left") {
            this.positionX = newX;
        }
        this.updatePosition();

        const subtab_area = wrapper.querySelector('#ssa-popup-subtabarea-grid-outer') as HTMLElement;
        void subtab_area?.offsetHeight;
    }

    public stopResize(listener1: (e: MouseEvent) => void, listener2: (e: MouseEvent) => void) {
        this.isResizing = false;
        document.removeEventListener('mousemove', listener1 as EventListenerOrEventListenerObject);
        document.removeEventListener('mouseup', listener2 as EventListenerOrEventListenerObject);
        this.saveCurrentState();
    }

    public updateSearchbar() {
        if (!this.shadow) { return; }
        const container = this.shadow.querySelector('#popup-searchbar-container') as HTMLDivElement;
        const active_rules_len = Object.keys(this.activeRules).length;
        //TODO: make this more robust than using indices, for when structure becomes more complex
        if (active_rules_len == 0) {
            if (container.children.length == 2) {
                container.removeChild(container.children[0]!);
            }
            return;
        }

        if (container.children.length == 2) {
            const rules_link = container.children[0] as HTMLLinkElement;
            rules_link.textContent = `${active_rules_len}`;
        } else {
            const rules_link = document.createElement('a');
            rules_link.id = 'searchbar-rules-link';
            rules_link.textContent = `${active_rules_len}`;
            rules_link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.changeTab(0);
            });
            container.prepend(rules_link);
        }
    }

    private createSubtabItem(type: string, item_data: { id: string, name: string, query: string, tags: string[] }) {
        const item = document.createElement('div');
        item.classList.add('ssa-popup-subtabarea-item');
        item.dataset.ssaItemId = item_data.id;
        //const top_row = document.createElement('div');
        //const bot_row = document.createElement('div');
        //top_row.classList.add('ssa-popup-sta-item-toprow');
        //bot_row.classList.add('ssa-popup-sta-item-botrow');

        const title_span = document.createElement('span');
        title_span.classList.add('ssa-sta-item-title');
        title_span.innerHTML = item_data.name;
        const query_span = document.createElement('span');
        query_span.classList.add('ssa-sta-item-query');
        query_span.innerHTML = item_data.query;

        /*
        const tags_span = document.createElement('span');
        tags_span.classList.add('ssa-sta-item-tags');
        if (item_data.tags.length > 0) {
            tags_span.innerHTML += item_data.tags[0];
            for (let i = 1; i < item_data.tags.length; i++) {
                tags_span.innerHTML += " · " + item_data.tags[i];
            }
        } else {
            tags_span.innerHTML = "untagged";
        }
        */

        item.appendChild(title_span);
        item.appendChild(query_span);
        //item.appendChild(tags_span);

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

    //toggles given rule in the activeRule list; returns true on append, false on remove
    private toggleActiveRule(d: { id: string, name: string, query: string }): boolean {
        const active_rules_len = Object.keys(this.activeRules).length;
        if (active_rules_len > 0 && d.id in this.activeRules) {
            //remove rule
            delete this.activeRules[d.id];
            this.saveCurrentState();
            return false;
        }
        //insert rule
        this.activeRules[d.id] = { name: d.name, query: d.query };
        this.saveCurrentState();
        return true;
    }

    private searchformSubmit() {
        const text_input = this.shadow?.querySelector('#popup-searchbar-input') as HTMLInputElement;
        if (!text_input) { return; }

        let value = `${text_input.value} `;
        let rules_str = '';
        for (let [rule_id, rule_data] of Object.entries(this.activeRules)) {
            rules_str += `${rule_data.query} `;
        }
        value = rules_str + value;

        const form = document.querySelector('.header-search') as HTMLFormElement;
        const input = document.getElementById('header-search-field') as HTMLInputElement;
        input.value = value;
        form.submit();
    }

}



const pm = new PopupMenu();
export default pm;
