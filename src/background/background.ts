import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import api from '../api';


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

api?.runtime.onMessage.addListener(handleMessage);

console.log('background script?');
