
function injectUI() {
    injectSearchbarMenu();
}

function injectSearchbarMenu() {
    const toolbar_links_div = document.querySelector(".header-links");
    if (!toolbar_links_div) return;

    //find HTML props from Scryfall Elements -> apply to my own things -> insert into DOM
    //TODO: propogate Error or define default handling if the elements are (somehow) not found
    const links_divider_left = toolbar_links_div.children[0] ?? null;
    const h_link_advanced = toolbar_links_div.children[1] ?? null;

    if (!links_divider_left || !h_link_advanced) return;
    //console.log(`h_l_cName: ${h_link_advanced.className}    l_d_width: ${links_divider_left.attributes}`);

    //TODO: actually construct the injected menu


    //TODO: probably needs span directly under a for coloring as button, and padding inside of span
    const menu_link = document.createElement('a');
    menu_link.className = "header-link";



    //TODO: define svg attrs and figure out how to use my own svg in the ext
    const menu_icon = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    const icon_url = browser.runtime.getURL('assets/icons/soul-icon.svg');


    const menu_label = document.createElement('span');
    menu_label.textContent = "SSA";

}

if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
