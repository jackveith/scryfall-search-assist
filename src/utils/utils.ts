import type { DMRequest, DMResponse } from "../types/ssa_types";
import api from './api';

export function constructStyleElement(content: string): HTMLStyleElement {

    const sty_el = document.createElement('style');
    sty_el.textContent = content;
    return sty_el;
}

export function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}


export function sendMessage<T = any>(request: DMRequest): Promise<DMResponse<T>> {

    return new Promise((resolve, reject) => {
        //chrome specific callback; c.rt.sendMessage may not call back in MV3 SW if error
        const cb = (resp: DMResponse<T>) => {
            const err = api === chrome ? chrome?.runtime?.lastError : null;
            if (err) {
                reject(err);
                return;
            }
            resolve(resp);
        };
        //try to use messaging API based on browser
        try {
            if (!api) {
                reject(new Error('No runtime messaging API.'))
            } else {
                const result = api.runtime.sendMessage(request);
                //then is a fxn => Firefox
                if (result && typeof result.then === 'function') {
                    result.then(cb).catch(reject);

                    //not Promise-based => Chrome
                } else {
                    chrome.runtime.sendMessage(request, cb);
                }

            }

        } catch (e) {
            reject(e);
        }
    });
}

export async function constructSVGElement(path: string) {

    const svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    const svg_url = api.runtime.getURL(path);
    const svg_file = await fetch(svg_url);
    const svg_text = await svg_file.text();
    const svg_pathel = new DOMParser().parseFromString(svg_text, 'image/svg+xml').querySelector('path');
    const svg_path = svg_pathel?.cloneNode(true) as SVGPathElement;
    svg.appendChild(svg_path);
    return svg;
}

export function getDeepActiveElement() {
    let active = document.activeElement;

    // Traverse through shadow roots
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
        active = active.shadowRoot.activeElement;
    }

    return active;
}
