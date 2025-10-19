
import popupmenu_template_html from '../../assets/components/popupmenu_template.html?raw';
import popupmenu_template_css from '../../assets/components/popupmenu_template.css?inline';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { constructStyleElement, genId, sendMessage } from '../utils/utils';

import api from '../utils/api';
import dm from './datamanager';

const tab_data_enum = ['userRules', 'userPinned', 'userRecent'];

export interface PopupmenuState {
    isVisible: boolean,
    template_name: string,
    active_tab: number;
}

export class PopupMenu {

    private template: HTMLTemplateElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private shadow: ShadowRoot | null = null;

    private isVisible!: boolean;
    private template_name!: string;
    private active_tab!: number;
    private isResizing: boolean = false;
    private positionX = 512;
    private positionY = 64;


    private static readonly default_state: PopupmenuState = {
        isVisible: false,
        template_name: "default_template",
        active_tab: 1,
    };

    constructor(partial_state?: Partial<PopupmenuState>) {
        this.initState(partial_state);
        this.ensureTemplate();
        //TODO: remember previous visibility state and show accordingly
        this.initShadowRoot();
    }

    private initState(partial_state?: Partial<PopupmenuState>) {
        const temp_state = { ...PopupMenu.default_state, ...partial_state } as PopupmenuState;

        this.isVisible = temp_state.isVisible;
        this.template_name = temp_state.template_name;
        this.active_tab = temp_state.active_tab;
    }
    //TODO: function() = construct a Partial<PopupmenuState> to export/save

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
        //retrieve then store template in class attr
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
        const main_search_form = shell.querySelector('#ssa-popup-searchform');
        if (main_search_form) {
            main_search_form.addEventListener('keydown', haltEventPropogation, true);
            main_search_form.addEventListener('keyup', haltEventPropogation, true);
            main_search_form.addEventListener('keypress', haltEventPropogation, true);
        }

        //
        const tab_buttons = shell.getElementsByClassName('popup-subtab-selector-btn');
        if (tab_buttons[this.active_tab]) {
            tab_buttons[this.active_tab]!.classList.add('popup-subtab-active-btn');
        }
        for (let i = 0; i <= tab_buttons.length; i++) {
            //TODO: make a function factory that maps i to tab_data_enum
            tab_buttons[i]?.addEventListener('click', () => this.changeTab(i));
        }
        if (!(this.active_tab < tab_data_enum.length)) { return; }
        this.populateTabArea(tab_data_enum[this.active_tab]!);

        const resize_handles = shell.querySelectorAll('.ssa-footer-resize');
        resize_handles.forEach((item) => {
            const side = item.id === 'ssa-footer-resize-left' ? 'left' : 'right';
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const mouse_e = (e as MouseEvent);
                const wrapper = shell.querySelector('#ssa-popupmenu-outer-container-div') as HTMLDivElement;
                console.log(wrapper);
                if (!wrapper) { return; }
                const coords = {
                    startX: mouse_e.clientX,
                    startY: mouse_e.clientY,
                    startW: parseInt(window.getComputedStyle(wrapper).width, 10),
                    startH: parseInt(window.getComputedStyle(wrapper).height, 10)
                }
                this.isResizing = true;

                console.log(this);
                const cb_resize = (e: MouseEvent) => this.resize(e, wrapper, coords, side);
                const cb_stopResize = (e: MouseEvent) => this.stopResize(cb_resize, cb_stopResize);


                document.addEventListener('mousemove', cb_resize);
                document.addEventListener('mouseup', cb_stopResize);

            })

        }, this);


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
        console.log(tab_data_enum[active]);
        await this.populateTabArea(tab_data_enum[active]!);
    }

    private async populateTabArea(active: string) {
        console.log(`pop active ${active}`);
        //const tab_data_key = tab_data_enum[active] ?? 'userPinned';
        const tab_data_key = 'userPinned'; //testing
        //use DataManager to retrieve tab data (should be an array of entries to populate grid)
        const tab_data = await dm.get(tab_data_key);

        console.log(tab_data);
        if (tab_data) {
            const subtab_area = this.shadow?.getElementById('ssa-popup-subtabarea-grid-outer');
            subtab_area?.replaceChildren();

            for (let i = 0; i <= tab_data.length; i++) {

                let new_item = createSubtabItem(tab_data[i]);
                subtab_area?.appendChild(new_item);
            }
        }
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

        this.isVisible = true;
        this.focusSearchbar();
    }

    public hide(): void {
        this.overlay?.remove();
        this.overlay = null;
        this.isVisible = false;
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
        const search_input = search_form.elements[0] as HTMLInputElement;
        if (search_input) {
            search_input.focus();
        }

    }


    //TODO: always snaps to SearchbarMenu, needs to care about offset
    //when resize/reposition are fleshed out
    public updatePosition() {
        if (!this.isVisible) { return; }
        const ref = document.getElementById('ssa-main-container-link');
        const popup_wrapper = this.overlay?.querySelector('#ssa-popupmenu-wrapper') as HTMLDivElement;

        if (popup_wrapper && ref) {
            const rect = ref.getBoundingClientRect();
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
            //clamp
            newW = Math.min(Math.max(newW, minW), maxW);
            // Move X so that right side stays still
            if (newW > minW) {
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

        if (side === "left") {
            this.positionX = newX;
            this.updatePosition();
        }

        const subtab_area = wrapper.querySelector('#ssa-popup-subtabarea-grid-outer') as HTMLElement;
        void subtab_area?.offsetHeight;

    }

    public stopResize(listener1: (e: MouseEvent) => void, listener2: (e: MouseEvent) => void) {
        this.isResizing = false;
        document.removeEventListener('mousemove', listener1 as EventListenerOrEventListenerObject);
        document.removeEventListener('mouseup', listener2 as EventListenerOrEventListenerObject);
    }

}

export function createSubtabItem(item_data: { name: string, query: string, tags: [string] }) {
    const item = document.createElement('div');
    item.classList.add('ssa-popup-subtabarea-item');
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
    //
    //


    item.addEventListener('dblclick', (e) => {

        const form = document.querySelector('.header-search') as HTMLFormElement;
        const input = document.getElementById('header-search-field') as HTMLInputElement;
        input.value = item_data.query;
        form.submit();
    })


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

const haltEventPropogation = (e: Event) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
}

const pm = new PopupMenu();
export default pm;
