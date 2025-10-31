
import type { NamedQuery, PopupMenuState } from "../types/ssa_types";
import type { BackgroundManager } from "./backgroundmanager";
import { TabareaDataItem, DatabaseNotInitializedError } from "../types/ssa_types";

import dm from './datamanager';
import { genId } from "../utils/utils";

const TAB_NAME_TO_ID_MAP: { [id: string]: string } = {
    'userRules': 'tab-selector-rules-btn',
    'userPinned': 'tab-selector-pinned-btn',
    'userRecents': 'tab-selector-recents-btn'
}



export class PopupMenuStateManager {

    private backgroundMgr: BackgroundManager;

    private isVisible = false;
    private activeTab = 'userRules';
    private activeRules: { [id: string]: NamedQuery } = {};
    private position: {
        left: number,
        top: number,
        width: number,
        height: number
    } = { left: 512, top: 64, width: 420, height: 400 };

    private tabareaItems: TabareaDataItem[] = [];


    constructor(bk: BackgroundManager) {
        this.backgroundMgr = bk;

    }


    public getIsVisible() {
        return this.isVisible;
    }

    public setIsVisible(v: boolean) {
        this.isVisible = v;
        (async () => {
            const exp = this.exportState();
            dm.set('popupMenuState', exp);
        })();
    }

    public getActiveRules() {
        return this.activeRules;
    }

    public getActiveTab() {
        return this.activeTab;
    }

    public setActiveTab(t: string) {
        if (t in TAB_NAME_TO_ID_MAP) {
            this.activeTab = t;
        }
    }

    public getTabareaItems() {
        return this.tabareaItems;
    }

    public setPosition(l?: number, t?: number, w?: number, h?: number) {
        this.position = {
            left: l ?? this.position.left,
            top: t ?? this.position.top,
            width: w ?? this.position.width,
            height: h ?? this.position.height
        }
    }

    public async trySyncState() {
        const sharedState: PopupMenuState | null = await dm.get('popupMenuState') ?? null;
        if (!sharedState) { return; }
        await this.syncState();

    }

    public async syncState(fillTabareaItems: boolean = false) {
        const sharedState: PopupMenuState | null = await dm.get('popupMenuState') ?? null;
        if (!sharedState) { return; }
        //TODO: reassign only the members indicated should be synced by user options
        this.isVisible = sharedState.isVisible;
        this.activeTab = sharedState.activeTab;
        this.activeRules = sharedState.activeRules;
        this.position = sharedState.position;
        if (!fillTabareaItems) { return }


        //this.tabareaItems
        //  TabareaDataItem elementRef likely to be stale.
        //  recompute here? 
    }

    public exportState() {
        const exp: PopupMenuState = {
            isVisible: this.isVisible,
            activeTab: this.activeTab,
            activeRules: this.activeRules,
            position: this.position,
            tabareaItems: this.tabareaItems
        };
        return exp;
    }

    public async saveState() {
        const exp = this.exportState();
        const sv = {
            ...exp,
            tabareaItems: exp.tabareaItems.map(tItem => tItem.id)
        };
        await dm.set('popupMenuState', sv);
    }

    public async syncAndReturnState() {
        this.syncState();
    }

    public toggleActiveRule(ruleId: string): boolean {

        const item: TabareaDataItem | null = this.tabareaItems.find(i => i.id === ruleId) ?? null;
        if (!item) { throw new Error(`tabareaItems does not contain item with id ${ruleId}`) }

        let rv: boolean;
        if (ruleId in this.activeRules) {
            delete this.activeRules[ruleId];
            rv = false;
        } else {
            this.activeRules[ruleId] = item.data;
            rv = true;
        }

        this.saveState();
        return rv;
    }

    public async deleteNamedQueryById(id: string, actTab: string) {

        const queryIndex = this.tabareaItems.findIndex(q => q.id === id);
        if (queryIndex === -1) { return false }

        const dmTabData = await dm.get(actTab);
        const dmIndex = dmTabData.findIndex((q: NamedQuery) => q.id === id);
        if (dmIndex === -1) { return false }

        if (actTab === 'userRules') {
            if (id in this.activeRules) {
                delete this.activeRules[id];
            }
        }

        dmTabData.splice(dmIndex, 1);
        await dm.set(actTab, dmTabData);
        this.tabareaItems.splice(queryIndex, 1);
        this.saveState();

        return true;
    }

    public generateTabareaItems(tabData: NamedQuery[]) {
        const newItems: TabareaDataItem[] = [];

        for (let i = 0; i < tabData.length; i++) {
            const item = new TabareaDataItem(tabData[i]!);
            newItems.push(item);
        }
        this.tabareaItems = newItems;

    }

    public async createUpdateTabareaDataItems() {
        const tabData: NamedQuery[] | null = await dm.get(this.activeTab) ?? null;
        if (!tabData) {
            throw new DatabaseNotInitializedError(`${this.activeTab} tabs not initialized.`);
        }
        this.generateTabareaItems(tabData);
        this.saveState();
    }

    public async createNewTabareaItem(itemName: string, itemQuery: string, actTab: string) {
        const idPrefix = actTab === 'userRules' ? 'rul_'
            : actTab === 'userPinned' ? 'pin_'
                : actTab === 'userRecents' ? 'rec_' : 'ite_';
        const itemId = genId(idPrefix);
        const newNamedQuery: NamedQuery = {
            id: itemId,
            name: itemName,
            query: itemQuery,
            tags: [] as string[]
        }
        const dataItem = new TabareaDataItem(newNamedQuery);
        this.tabareaItems.unshift(dataItem);
        const tabData = await dm.get(actTab);
        tabData.unshift(newNamedQuery);
        await dm.set(actTab, tabData);

        return dataItem;
    }

    public async mutateTabareaItem(itemId: string, name?: string, query?: string, tags?: string[], isActive: boolean | null = null) {
        const dataItem = this.tabareaItems.find(i => i.id === itemId)!;
        if (name) { dataItem.data.name = name }
        if (query) { dataItem.data.query = query }
        if (tags) { dataItem.data.tags = tags }
        if (isActive !== null) {
            dataItem.isActive = isActive;
            if (isActive && !(itemId in this.activeRules)) {
                this.activeRules[itemId] = dataItem.data;

            } else if (!isActive && (itemId in this.activeRules)) {
                delete this.activeRules[itemId];

            }
        }

        this.saveState();
        return dataItem;

    }

}
