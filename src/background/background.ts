import { get, set } from '../utils/storage';


type DMMessageType = 'DM_GET' | 'DM_SET' | 'DM_DELETE' | 'DM_CLEAR' | 'DM_BROADCAST';
type DMResponse<T = any> = { id: string; ok: boolean; recipient: string; value?: T; error?: string; };

interface DMRequest {
    id: string;
    type: DMMessageType;
    key?: string;
    value?: any;
    options?: Record<string, any>;
}

const api = (() => {
    return (typeof browser !== "undefined") ? browser
        : (typeof chrome !== "undefined") ? chrome
            : null;
})();

function handleMessage(request: DMRequest, sender: any, sendResponse: (r: any) => void) {

    (async () => {
        console.log('called handleMessage');
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
