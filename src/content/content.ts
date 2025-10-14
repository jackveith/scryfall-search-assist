
import popupmenu_template_html from '../../assets/components/popupmenu_template.html?raw';
import popupmenu_template_css from '../../assets/components/popupmenu_template.css?inline';

//POPUPMENU Management interface/class definitions and implementations

interface PopupmenuConfig {

}

class PopupmenuManager {
    //TemplateElement containing template for the popup
    private template: HTMLTemplateElement | null = null;
    //Div that controls popup visibility
    private overlay: HTMLDivElement | null = null;
    //shadow root
    private shadow: ShadowRoot | null = null;

    constructor() {
        this.initTemplate();
        //TODO: remember previous visibility state and show accordingly
        this.show();
    }

    private initTemplate(): void {
        //make and insert popup template into DOM (invisible by default)
        if (!document.getElementById('ssa-injected-popupmenu-template')) {
            const temp_container = document.createElement('div');
            temp_container.innerHTML = `${popupmenu_template_html}`;
            document.body.appendChild(temp_container.firstElementChild!);
        }
        //retrieve then store template in class attr
        this.template = document.getElementById('ssa-injected-popupmenu-template')! as HTMLTemplateElement;

        //append the shadow root to the body with just the style defined
        const wrapper_shadow = document.createElement('div');
        this.shadow = wrapper_shadow.attachShadow({ mode: 'open' });
        const style_element = document.createElement('style');
        style_element.textContent = popupmenu_template_css;
        this.shadow.appendChild(style_element);
        document.body.appendChild(wrapper_shadow);

    }

    public show(): void {
        //build popupmenu html element (with config options in future)
        if (!this.template) { return };

        //POPUP copy popupmenu template 
        const clone = this.template.content.cloneNode(true) as DocumentFragment;
        const popup = clone.getElementById('ssa-popupmenu-wrapper') as HTMLDivElement;

        //OVERLAY wrapper for visibility toggle
        const wrapper_overlay = document.createElement('div');
        wrapper_overlay.id = 'ssa-popupmenu-overlay';
        wrapper_overlay.appendChild(popup);

        //SHADOW wrapper for shadow DOM/styles
        if (!this.shadow) return;
        this.shadow.appendChild(wrapper_overlay);
        this.overlay = this.shadow.getElementById('ssa-popupmenu-overlay') as HTMLDivElement;

    }

    public hide(): void {
        this.overlay?.remove();
        this.overlay = null;
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

}
//END PopupmenuManager class dfn

//END POPUPMENU DEFS AND IMPLS

//init popup
let manager = new PopupmenuManager();

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
