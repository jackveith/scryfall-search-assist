
import api from '../utils/api';
import dm from './datamanager';
import popupmenu from './popupmenu';
import { genId } from '../utils/utils';


export class SearchbarMenu {

    private menu: HTMLAnchorElement | null = null;
    private toolbar_container: HTMLDivElement | null = null;

    constructor() {

    }

    public async init() {
        await this.constructMenu();
    }

    private async constructMenu() {

        const toolbar_links_div = document.querySelector(".header-links");
        if (!toolbar_links_div) { throw new Error("header-links element not found.") }
        this.toolbar_container = toolbar_links_div as HTMLDivElement;


        //MENU CONTAINER (LINK)
        const menu_link = document.createElement('a');
        menu_link.className = "header-link";
        menu_link.style.setProperty('background-color', '#F77C34');
        menu_link.id = "ssa-main-container-link";
        //toggle popup visibility
        menu_link.addEventListener('click', (event) => {
            event.preventDefault();
            popupmenu.toggleVisibility();

            if (popupmenu.getIsVisible()) {
                popupmenu.updatePosition();
            }
        });

        //MENU SVG
        const menu_icon = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        //fetch SVG data from file and insert into new SVG
        const icon_url = api.runtime.getURL('assets/icons/soul-icon.svg');
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

        //MENU PIN BUTTON
        const menu_pin = document.createElement('a');
        menu_pin.className = "header-link";
        menu_pin.style.setProperty('background-color', '#F77C34');
        menu_pin.addEventListener('click', async (e) => {
            const refreshSubtabList = popupmenu.getActiveTab() === 1 ? true : false;
            await pinNativeSearchValue();
        })
        menu_pin.style.setProperty('padding-left', '2px');
        menu_pin.style.setProperty('padding-right', '2px');

        //MENU PIN SVG
        const pin_icon = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        const pin_icon_url = api.runtime.getURL('assets/icons/pin-icon.svg');
        const pin_icon_file = await fetch(pin_icon_url);
        const pin_icon_filetext = await pin_icon_file.text();
        const pin_icon_path = new DOMParser().parseFromString(pin_icon_filetext, 'image/svg+xml').querySelector('path');
        const pin_svg_from_text = pin_icon_path?.cloneNode(true) as SVGPathElement;
        pin_icon.appendChild(pin_svg_from_text);
        //icon visuals
        pin_icon.setAttributeNS(null, "width", "32px");
        pin_icon.setAttributeNS(null, "height", "32px");
        pin_icon.setAttributeNS(null, "fill", '#000000');
        pin_icon.setAttributeNS(null, "viewBox", '0 0 36 53');
        pin_icon.setAttributeNS(null, "transform", 'scale(1.3, 1.3)');
        //accessability considerations
        pin_icon.setAttributeNS(null, "aria-hidden", "true");
        pin_icon.setAttributeNS(null, "focusable", "false");

        const menus_divider = document.createElement('div');
        menus_divider.classList.add('header-link-divider');
        menus_divider.style.setProperty("border-right", '2px solid #1e1714');
        menus_divider.style.setProperty("margin-right", '0px');


        const links_divider_left = this.toolbar_container?.children[0] ?? null;
        if (!links_divider_left) return;

        (links_divider_left as HTMLElement).style.setProperty('margin-left', '6px');

        //CONSTRUCT MENU + append to native container
        menu_link.appendChild(menu_icon);
        menu_link.appendChild(menu_label);
        this.menu = menu_link;
        menu_pin.appendChild(pin_icon);
        this.toolbar_container.prepend(this.menu);
        this.toolbar_container.prepend(menus_divider);
        this.toolbar_container.prepend(menu_pin);


    }

}

async function pinNativeSearchValue(refreshSubtabList: boolean = true) {
    const sb = document.getElementById('header-search-field') as HTMLInputElement;
    if (!sb?.value) { return; }

    const pin_name = genId('p_');
    const pin_query = sb.value;
    const pin_tags: string[] = [];

    console.log(sb.value);

    let db_get: Object[] | null = await dm.get('userPinned', { force: true }) ?? null;
    console.log(db_get);
    if (!db_get) {
        db_get = [];
    }
    db_get.unshift({ name: pin_name, query: pin_query, tags: pin_tags });
    await dm.set('userPinned', db_get);


    if (refreshSubtabList) {
        popupmenu.changeTab(1);
    }
}

const sbm = new SearchbarMenu();
export default sbm;


