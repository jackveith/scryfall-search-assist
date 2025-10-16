

export function constructStyleElement(content: string): HTMLStyleElement {

    const sty_el = document.createElement('style');
    sty_el.textContent = content;
    return sty_el;
}

export function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
