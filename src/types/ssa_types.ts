
export type DMMessageType = 'DM_GET' | 'DM_SET' | 'DM_DELETE' | 'DM_CLEAR' | 'DM_BROADCAST';
export type DMResponse<T = any> = { id: string; ok: boolean; recipient: string; value?: T; error?: string; };

export interface DMRequest {
    id: string;
    type: DMMessageType;
    key?: string;
    value?: any;
    options?: Record<string, any>;
}

//data type for saved Rules, Pinned, Recents
export interface NamedQuery {
    id: string;
    name: string;
    query: string;
    tags: string[];
}

//state object that stateMgr saves to extension storage,
//and exports for use by other PopupMenu components
export interface PopupMenuState {
    isVisible: boolean,
    activeTab: string,
    activeRules: { [id: string]: NamedQuery };
    position: {
        left: number,
        top: number,
        width: number,
        height: number
    };
    tabareaItems: TabareaDataItem[];
}

//object containing position data needed by both stateMgr
//and uiMgr when moving/resizing popup
export interface PopupMutatorObject {
    startMouseX: number,
    startMouseY: number,
    startPopupX: number,
    startPopupY: number,
    startPopupW?: number,
    startPopupH?: number
}

//Data class holding NamedQuery and reference to UI element for
//each item in the tabarea
export class TabareaDataItem {
    public id: string;
    public elementRef: HTMLDivElement;
    public data: NamedQuery;
    public isActive = false;

    constructor(data: NamedQuery, ref?: HTMLDivElement, isActive = false) {
        this.id = data.id;
        this.elementRef = ref ?? document.createElement('div');
        this.data = data;
        this.isActive = isActive;
    }
}
