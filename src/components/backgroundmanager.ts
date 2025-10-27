
import popupmenu_template_html from '../../assets/components/popupmenu_template.html?raw';
import popupmenu_template_css from '../../assets/components/popupmenu_template.css?inline';

import tabarea_item_html from '../../assets/components/tabarea_item.html?raw';
import tabarea_edit_form_html from '../../assets/components/tabarea_edit_form.html?raw';

import { constructStyleElement } from '../utils/utils';


export class BackgroundManager {

    private shadowWrapper!: HTMLDivElement;
    private shadow!: ShadowRoot;
    private templates: { [id: string]: HTMLTemplateElement } = {};

    constructor() {
        this.initShadowRoot();
        this.initPopupTemplate();
        this.initHelperTemplates();
    }

    //call after DOMContentLoaded
    public init() {
        this.attach();

    }

    public attach() {
        this.attachShadow();
    }

    private initShadowRoot() {
        this.shadowWrapper = document.createElement('div');
        this.shadowWrapper.id = 'ssa-shadow-entry';
        this.shadow = this.shadowWrapper.attachShadow({ mode: 'open' });
        const style_element = constructStyleElement(popupmenu_template_css);
        this.shadow.appendChild(style_element);

    }

    private initPopupTemplate() {
        this.storeTemplate('mainPopupmenuTemplate', popupmenu_template_html);
        this.storeTemplate('mainPopupMenuTemplate', popupmenu_template_html);
    }

    private initHelperTemplates() {
        this.storeTemplate('tabareaItem', tabarea_item_html);
        this.storeTemplate('tabareaEditForm', tabarea_edit_form_html);
    }

    private storeTemplate(key: string, html: string) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        this.templates[key] = t;
    }

    private attachShadow() {
        document.body.appendChild(this.shadowWrapper);
    }

    public getTemplate(key: string) {
        return key in this.templates
            ? this.templates[key]
            : null
    }

    public getTemplateContent(key: string) {
        if (!(key in this.templates)) { return }
        //clone template's subtree and return
        return this.templates[key]!.content.firstElementChild!.cloneNode(true) as HTMLElement;
    }

    public getShadow() {
        return this.shadow;

    }

}
