
import api from '../utils/api';

import type { DMMessageType, DMResponse, DMRequest } from '../types/ssa_types'
import { genId, sendMessage } from '../utils/utils';


class DataManager {
    private cache = new Map<string, any>();
    private dirty = new Set<string>();
    private broadcastPrefix = 'DM_BCAST_';
    private contextName: string;
    private storageListenerAttached = false;
    private runtimeListenerAttached = false;


    constructor(contextName?: string) {
        this.contextName = contextName || genId('ctx_');
        this.attachRuntimeListener();
    }

    public setContextName(cn: string) {
        this.contextName = cn;
    }

    private attachRuntimeListener() {
        //attach once, receives broadcasts and direct messages
        if (this.runtimeListenerAttached) { return; }

        const messageHandler = (message: any, sender: any, sendResponse: any) => {
            try {
                //check if message?, if BROADCAST or for us, and key?
                if (message && (message.type === 'DM_BROADCAST' || (message.recipient && message.recipient == this.contextName))
                    && message.key !== undefined) {

                    //update cache
                    const { key, value } = message;
                    this.cache.set(key, value);
                    this.dirty.delete(key);
                }
            } catch (e) {
                //ignore error
            }
        };

        api?.runtime.onMessage.addListener(messageHandler);
        this.runtimeListenerAttached = true;
    }

    public async get<T = any>(key: string, opts: { force?: boolean } = {}): Promise<T | undefined> {
        //unless forced, try to find in cache not dirty
        if (!opts.force) {
            if (this.cache.has(key) && !this.dirty.has(key)) {
                return this.cache.get(key) as T;
            }
        }

        const p = (async () => {
            try {
                const id = genId('req_');
                const resp = await sendMessage<T>({ id: id, type: 'DM_GET', key });
                if (!resp.ok) {
                    throw new Error(resp.error || 'Database get request failed');
                }
                //data retrieved
                this.cache.set(key, resp.value);
                this.dirty.delete(key);

                return resp.value as T | undefined;

            } finally {

                //TODO: manage in-flight get requests and dedupe them,
                //remove value in this.inFlights when we receive message
                //because we deduped above and we are the only get req for this data
            }
        })();

        //TODO: set this key as in-flight after calling async fxn above
        return p;
    }

    //set value in storage, set cache immediately. sync = false delays sync (useful for batched writes)
    public async set(key: string, value: any, options: { sync?: boolean } = { sync: true }) {

        this.cache.set(key, value);

        //don't message background if sync = false
        if (!options.sync) {
            this.dirty.add(key);
            return;
        }

        //send message to update background store
        const id = genId('req_');
        const resp = await sendMessage({ id, type: 'DM_SET', key, value });
        if (!resp.ok) { throw new Error(resp.error || 'Database set request failed'); }
        this.dirty.delete(key);
    }
}

const dataManager = new DataManager();
export default dataManager;
