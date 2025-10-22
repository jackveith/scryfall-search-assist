import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
const api: typeof browser | typeof chrome =
    typeof browser !== undefined ? browser
        : typeof chrome !== undefined ? chrome
            : (() => {
                throw new Error("no browser api found.")
            })();

console.log(api);

function handleMessage(request: DMRequest, sender: any, sendResponse: (r: any) => void) {

    (async () => {
        try {
            switch (request.type) {
                case 'DM_GET': {
                    const res = await api?.storage.local.get(request.key);
                    sendResponse({ id: request.id, ok: true, value: res ? res[request.key!] : undefined });
                    break;
                }
                case 'DM_SET': {
                    await api?.storage.local.set({ [request.key!]: request.value });
                    broadcastUpdate(request.key!, request.value);
                    sendResponse({ id: request.id, ok: true });
                    break;
                }
                default: {
                    sendResponse({ id: request.id, ok: false, error: 'Unknown DMRequest type' });
                }
            }

        } catch (err: any) {
            sendResponse({ id: request.id, ok: false, error: err?.message || String(err) });
        }
    })();

    //indicate we will call sendResponse asynchronously
    return true;
}
async function broadcastUpdate(key: string, value: any) {
    const bcast = { id: genId('bcast_'), type: 'DM_BROADCAST' as DMMessageType, key: key, value: value };
    const tabs = await api.tabs.query({});
    for (const tab of tabs) {
        if (tab.id) {
            try {
                await api.tabs.sendMessage(tab.id, bcast);
            } catch (err) {
                //tab doesnt have content script loaded
            }
        }
    }
}



function genId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

api?.runtime.onMessage.addListener(handleMessage);

