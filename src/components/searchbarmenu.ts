
import api from '../api';
import dm from './datamanager';
import popupmenu from './popupmenu';


export class SearchbarMenu {

    private menu!: HTMLAnchorElement;
    private toolbar_container!: HTMLDivElement;

    constructor() {
        this.constructMenu();
        this.attachMenu();
        this.mutateDivider();
    }

    private async constructMenu() {

        //find find Scryfall HTML elements for editing + inserting my own HTML
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

        //CONSTRUCT MENU + append to native container
        menu_link.appendChild(menu_icon);
        menu_link.appendChild(menu_label);
        this.menu = menu_link;
    }

    private attachMenu() {
        this.toolbar_container.prepend(this.menu);
    }

    //adjust native divider for visual clarity
    private mutateDivider() {
        const links_divider_left = this.toolbar_container.children[0] ?? null;
        if (!links_divider_left) return;

        (links_divider_left as HTMLElement).style.setProperty('margin-left', '6px');
    }
}

const sbm = new SearchbarMenu();
export default sbm;


