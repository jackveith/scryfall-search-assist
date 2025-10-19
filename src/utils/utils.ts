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
            } else if (api === browser) {
                browser.runtime.sendMessage(request).then(cb).catch(reject);
            } else if (api === chrome) {
                chrome.runtime.sendMessage(request, cb);
            }

        } catch (e) {
            reject(e);
        }
    });
}
