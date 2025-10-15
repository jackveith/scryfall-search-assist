
import popupmenu_template_html from '../../assets/components/popupmenu_template.html?raw';
import popupmenu_template_css from '../../assets/components/popupmenu_template.css?inline';




//random helpers
//TODO: move these out to utils?
function constructStyleElement(content: string): HTMLStyleElement {

    const sty_el = document.createElement('style');
    sty_el.textContent = content;
    return sty_el;

}

function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

type DMMessageType = 'DM_GET' | 'DM_SET' | 'DM_DELETE' | 'DM_CLEAR' | 'DM_BROADCAST';
type DMResponse<T = any> = { id: string; ok: boolean; recipient: string; value?: T; error?: string; };

interface DMRequest {
    id: string;
    type: DMMessageType;
    key?: string;
    value?: any;
    options?: Record<string, any>;
}


function sendMessage<T = any>(request: DMRequest): Promise<DMResponse<T>> {

    const win: any = window as any;
    return new Promise((resolve, reject) => {
        //chrome specific callback; c.rt.sendMessage may not call back in MV3 SW if error
        const cb = (resp: DMResponse<T>) => {
            const err = win.chrome?.runtime?.lastError;
            if (err) {
                reject(err);
                return;
            }
            resolve(resp);
        };
        //try to use messaging API based on browser
        try {
            if (win.chrome && win.chrome.runtime && win.chrome.runtime.sendMessage) {
                win.chrome.runtime.sendMessage(request, cb);
            } else if (win.browser && win.browser.runtime && win.browser.runtime.sendMessage) {
                win.browser.runtime.sendMessage(request).then(cb).catch(reject);
            } else {
                reject(new Error('No runtime messaging API.'))
            }
        } catch (e) {
            reject(e);
        }
    });
}

export class DataManager {
    private cache = new Map<string, any>();
    private dirty = new Set<string>();
    private broadcastPrefix = 'DM_BCAST_';
    private contextName: string;
    private storageListenerAttached = false;
    private runtimeListenerAttached = false;


    constructor(contextName?: string) {
        this.contextName = contextName || genId('ctx_');
        this.attachRuntimeListener();
    }

    private attachRuntimeListener() {
        //attach once, receives broadcasts and direct messages
        if (this.runtimeListenerAttached) { return; }
        const win: any = window as any;

        const messageHandler = (message: any, sender: any, sendResponse: any) => {
            try {
                //check if message?, if BROADCAST or for us, and key?
                if (message && (message.type === 'DM_BROADCAST' || (message.recipient && message.recipient == this.contextName))
                    && message.key !== undefined) {

                    //update cache
                    const { key, value } = message;
                    this.cache.set(key, value);
                    this.dirty.delete(key);
                }
            } catch (e) {
                //ignore error
            }
        };
        if (win.chrome && win.chrome.runtime && win.chrome.runtime.onMessage) {
            win.chrome.runtime.onMessage.addListener(messageHandler);
            this.runtimeListenerAttached = true;
        } else if (win.browser && win.browser.runtime && win.browser.runtime.onMessage) {
            win.browser.runtime.onMessage.addListener(messageHandler);
            this.runtimeListenerAttached = true;
        }
    }

    public async get<T = any>(key: string, opts: { force?: boolean } = {}): Promise<T | undefined> {
        //unless forced, try to find in cache not dirty
        if (!opts.force) {
            if (this.cache.has(key) && !this.dirty.has(key)) {
                return this.cache.get(key) as T;
            }
        }

        const p = (async () => {
            try {
                const id = genId('req_');
                const resp = await sendMessage<T>({ id: id, type: 'DM_GET', key });
                if (!resp.ok) {
                    throw new Error(resp.error || 'Database get request failed');
                }
                //data retrieved
                this.cache.set(key, resp.value);
                this.dirty.delete(key);

                return resp.value as T | undefined;

            } finally {

                //TODO: manage in-flight get requests and dedupe them,
                //remove value in this.inFlights when we receive message
                //because we deduped above and we are the only get req for this data
            }
        })();

        //TODO: set this key as in-flight after calling async fxn above
        return p;
    }


}
//END DATAMANAGER CLASS
const dm = new DataManager(`content_${location.href}`);











//POPUPMENU Management interface/class definitions and implementations

interface PopupmenuState {
    isVisible: boolean,
    template_name: string,
    active_tab: number;
}

class PopupMenu {
    //TemplateElement containing template for the popup
    private template: HTMLTemplateElement | null = null;
    //Div that controls popup visibility
    private overlay: HTMLDivElement | null = null;
    //shadow root
    private shadow: ShadowRoot | null = null;

    private isVisible!: boolean;
    private template_name!: string;
    private active_tab!: number;


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
        const tab_buttons = shell.getElementsByClassName('popup-subtab-selector-btn');

        if (tab_buttons[this.active_tab]) {
            tab_buttons[this.active_tab]!.classList.add('popup-subtab-active-btn');
        }
        for (let i = 0; i <= tab_buttons.length; i++) {
            tab_buttons[i]?.addEventListener('click', () => this.changeTab(i));
        }





    }

    public show(): void {
        //build popupmenu html element (with config options in future)
        if (!this.template) { return };
        if (!this.shadow) { return };

        //OVERLAY wrapper for visibility toggle
        const wrapper_overlay = this.ensureOverlay();
        //SHADOW wrapper for shadow DOM/styles
        this.shadow.appendChild(wrapper_overlay);
        this.overlay = this.shadow.getElementById('ssa-popupmenu-overlay') as HTMLDivElement;
        console.log(this.overlay);

        //POPUP generation
        const clone = this.template.content.cloneNode(true) as DocumentFragment;
        this.overlay.appendChild(clone);
        const popup_shell = this.shadow.getElementById('ssa-popupmenu-wrapper') as HTMLDivElement;
        console.log(popup_shell);
        this.populatePopupShell(popup_shell);

        this.isVisible = true;
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

    public printattributes() {
        console.log(this.overlay);
        console.log(this.shadow);
    }

    public getShadowRoot() {
        return this.shadow;
    }

    public async changeTab(active: number) {
        if (this.active_tab == active) { return; }
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

        this.repopulateTabArea(active);

        //TODO: reconstruct tab area for the new active tab
    }

    private async repopulateTabArea(active: number) {
        const tab_data_enum = ['userRules', 'userPinned', 'userRecent'];
        //const tab_data_key = tab_data_enum[active] ?? 'userPinned';
        const tab_data_key = 'userPinned'; //testing
        //use DataManager to retrieve tab data (should be an array of entries to populate grid)
        const tab_data = await dm.get(tab_data_key);
        console.log(tab_data);

    }



}
//END PopupMenu class dfn

//END POPUPMENU DEFS AND IMPLS

//init popup
let manager = new PopupMenu();

//TODO: save the element itself or figure out some sort of way to persist across
//searches and page loads/reloads

async function injectSearchbarMenu() {

    //TODO: propogate Error or define default handling if the elements are (somehow) not found

    //find find Scryfall HTML elements for editing + inserting my own HTML
    const toolbar_links_div = document.querySelector(".header-links");
    if (!toolbar_links_div) return;
    const links_divider_left = toolbar_links_div.children[0] ?? null;
    if (!links_divider_left) return;


    //MENU CONTAINER (LINK)
    const menu_link = document.createElement('a');
    menu_link.className = "header-link";
    menu_link.style.setProperty('background-color', '#F77C34');
    menu_link.id = "ssa-main-container-link";
    //toggle popup visibility
    menu_link.addEventListener('click', (event) => {
        event.preventDefault();
        console.log("menu button pressed.");
        //manager?.printattributes();
        manager?.toggleVisibility();
        updatePopupmenuPosition();
    });

    //MENU SVG ICON
    const menu_icon = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    //fetch SVG data from file and insert into new SVG
    //TODO: browser.runtime.getURL is firefox specific, generalize with polyfills or smth
    //(maybe DEFINE them as constants in a file at root, so other mods can share them?)
    const icon_url = browser.runtime.getURL('assets/icons/soul-icon.svg');
    const icon_svg_file = await fetch(icon_url);
    const icon_svg_filetext = await icon_svg_file.text();
    const icon_svg_path = new DOMParser().parseFromString(icon_svg_filetext, 'image/svg+xml').querySelector('path');
    const new_path_from_data = icon_svg_path?.cloneNode(true) as SVGPathElement;
    menu_icon.appendChild(new_path_from_data);
    //visual modifications
    menu_icon.setAttributeNS(null, "width", "32px");
    menu_icon.setAttributeNS(null, "height", "32px");
    menu_icon.setAttributeNS(null, "transform", "translate(0, -4)");
    menu_icon.setAttributeNS(null, "fill", '#000000');
    menu_icon.setAttributeNS(null, "overflow", 'visible');
    //accessability considerations
    menu_icon.setAttributeNS(null, "aria-hidden", "true");
    menu_icon.setAttributeNS(null, "focusable", "false");

    //MENU LABEL
    const menu_label = document.createElement('span');
    menu_label.textContent = "SSA";
    menu_label.style.setProperty('font-weight', '700');
    menu_label.style.setProperty('padding-left', '2px');
    menu_label.style.setProperty('padding-right', '2px');

    //CONSTRUCT MENU + append to native container
    menu_link.appendChild(menu_icon);
    menu_link.appendChild(menu_label);
    toolbar_links_div.prepend(menu_link);

    //add margin to element next to our menu for some personal space
    (links_divider_left as HTMLElement).style.setProperty('margin-left', '6px');

}

function updatePopupmenuPosition() {
    const ref = document.getElementById('ssa-main-container-link');
    const popup = manager.getShadowRoot()?.getElementById('ssa-popupmenu-wrapper');

    if (popup && ref) {
        const rect = ref?.getBoundingClientRect();
        popup.style.position = 'absolute';
        popup.style.left = `${(rect.left - 40)}px`;
        popup.style.top = `${(rect.bottom + 4)}px`;
    }
}

//TODO: custom keyboard shortcuts
function attachWindowEvents() {
    updatePopupmenuPosition();
    window.addEventListener('scroll', updatePopupmenuPosition);
    window.addEventListener('resize', updatePopupmenuPosition);

}

async function injectUI() {
    await injectSearchbarMenu();
    attachWindowEvents();
}


if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
