
function injectUI() {
    injectSearchbarMenu();
}

async function injectSearchbarMenu() {

    //TODO: propogate Error or define default handling if the elements are (somehow) not found

    //find find Scryfall HTML elements for editing + inserting my own HTML
    const toolbar_links_div = document.querySelector(".header-links");
    if (!toolbar_links_div) return;
    const links_divider_left = toolbar_links_div.children[0] ?? null;
    if (!links_divider_left) return;


    //LINK (CONTAINER)
    const menu_link = document.createElement('a');
    menu_link.className = "header-link";
    menu_link.style.setProperty('background-color', '#F77C34');

    //SVG ICON
    const menu_icon = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    //fetch SVG data from file and insert into new SVG
    const icon_url = browser.runtime.getURL('assets/icons/soul-icon.svg');
    const icon_svg_file = await fetch(icon_url);
    const icon_svg_filetext = await icon_svg_file.text();
    const icon_svg_path = new DOMParser().parseFromString(icon_svg_filetext, 'image/svg+xml').querySelector('path');
    //TODO: handle !path with a fallback thing to do (even though path should always exist if local file?)
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

    //LABEL
    const menu_label = document.createElement('span');
    menu_label.textContent = "SSA";
    menu_label.style.setProperty('font-weight', '700');
    menu_label.style.setProperty('padding-left', '2px');
    menu_label.style.setProperty('padding-right', '2px');



    //MENU CONSTRUCTION
    menu_link.appendChild(menu_icon);
    menu_link.appendChild(menu_label);
    //stick our menu inside native container
    toolbar_links_div.prepend(menu_link);

    //add margin to element next to our menu for some personal space
    (links_divider_left as HTMLElement).style.setProperty('margin-left', '6px');


}

if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
