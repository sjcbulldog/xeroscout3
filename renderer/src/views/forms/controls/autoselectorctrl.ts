import { IPCAutoSelectorItem, IPCScoutResult, IPCTypedDataValue } from "../../../shared/ipc.js";
import { XeroRect } from "../../../shared/xerogeom.js";
import { DataValue } from "../../../shared/datavalue.js";
import { XeroView } from "../../xeroview.js";
import { EditFormControlDialog } from "../dialogs/editformctrldialog.js";
import { EditAutoSelectorDialog } from "../dialogs/editautoselectorctrldialog.js";
import { ImageDataSource } from "../../../apps/imagesrc.js";
import { FormControl } from "./formctrl.js";
import { XeroDialog } from "../../../widgets/xerodialog.js";

interface AutoPlanNode {
    id: string;
    action: string;
    x: number;
    y: number;
    end?: boolean;
}

interface AutoPlanEdge {
    id: string;
    from: string;
    to: string;
    cx?: number;
    cy?: number;
}

interface AutoPlan {
    id: string;
    name: string;
    nodes: AutoPlanNode[];
    edges: AutoPlanEdge[];
}

interface ParsedAutoTab {
    key: string;
    sourceTag: string;
    autoName: string;
    tabLabel: string;
    nodes: AutoPlanNode[];
    edges: AutoPlanEdge[];
}

class AutoSelectorDialog extends XeroDialog {
    private readonly autos_: ParsedAutoTab[];
    private readonly image_src_: ImageDataSource;
    private readonly field_image_name_: string;
    private readonly on_selected_: (autoName: string) => void;

    private tabs_?: HTMLDivElement;
    private canvas_?: HTMLDivElement;
    private field_?: HTMLImageElement;
    private svg_?: SVGSVGElement;
    private nodes_layer_?: HTMLDivElement;
    private empty_?: HTMLDivElement;
    private select_button_?: HTMLButtonElement;

    private selected_index_: number = -1;

    constructor(
        autos: ParsedAutoTab[],
        imageSrc: ImageDataSource,
        fieldImageName: string,
        selectedAutoName: string,
        onSelected: (autoName: string) => void,
    ) {
        super('Auto Selector');
        this.autos_ = autos;
        this.image_src_ = imageSrc;
        this.field_image_name_ = fieldImageName;
        this.on_selected_ = onSelected;

        if (this.autos_.length > 0) {
            const preferred = this.autos_.findIndex((a) => a.autoName === selectedAutoName);
            this.selected_index_ = preferred >= 0 ? preferred : 0;
        }
    }

    protected populateDialog(div: HTMLDivElement): void {
        const wrapper = document.createElement('div');
        wrapper.className = 'xero-autoselector-modal';

        this.tabs_ = document.createElement('div');
        this.tabs_.className = 'xero-autoselector-tabs';
        wrapper.appendChild(this.tabs_);

        this.canvas_ = document.createElement('div');
        this.canvas_.className = 'xero-autoselector-canvas';

        this.field_ = document.createElement('img');
        this.field_.className = 'xero-autoselector-field';
        this.canvas_.appendChild(this.field_);

        this.svg_ = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg_.classList.add('xero-autoselector-svg');
        this.canvas_.appendChild(this.svg_);

        this.nodes_layer_ = document.createElement('div');
        this.nodes_layer_.className = 'xero-autoselector-nodes';
        this.canvas_.appendChild(this.nodes_layer_);

        wrapper.appendChild(this.canvas_);

        this.empty_ = document.createElement('div');
        this.empty_.className = 'xero-autoselector-empty';
        this.empty_.innerHTML = '<b>No autos are available for this team.</b><br/>Sync with Central and ensure Team Form Auto Planner data exists.';
        wrapper.appendChild(this.empty_);

        div.appendChild(wrapper);
    }

    public populateButtons(div: HTMLDivElement): void {
        this.select_button_ = document.createElement('button');
        this.select_button_.innerText = 'Select';
        this.select_button_.className = 'xero-popup-form-edit-dialog-button';
        this.select_button_.addEventListener('click', () => {
            const active = this.getActiveAuto();
            if (!active) {
                return;
            }
            this.on_selected_(active.autoName);
            this.close(true);
        });
        div.appendChild(this.select_button_);

        const close = document.createElement('button');
        close.innerText = 'Close';
        close.className = 'xero-popup-form-edit-dialog-button';
        close.addEventListener('click', this.cancelButton.bind(this));
        div.appendChild(close);
    }

    protected onInit(): void {
        this.disableEnterKeyProcessing();
        this.renderTabs();
        this.updateFieldImage();
        this.renderContent();
    }

    private getActiveAuto(): ParsedAutoTab | undefined {
        if (this.selected_index_ < 0 || this.selected_index_ >= this.autos_.length) {
            return undefined;
        }
        return this.autos_[this.selected_index_];
    }

    private renderTabs(): void {
        if (!this.tabs_) {
            return;
        }

        this.tabs_.innerHTML = '';
        for (let i = 0; i < this.autos_.length; i++) {
            const auto = this.autos_[i];
            const tab = document.createElement('button');
            tab.className = 'xero-autoselector-tab';
            tab.innerText = auto.tabLabel;
            if (i === this.selected_index_) {
                tab.classList.add('selected');
            }
            tab.addEventListener('click', () => {
                this.selected_index_ = i;
                this.renderTabs();
                this.renderContent();
            });
            this.tabs_.appendChild(tab);
        }
    }

    private updateFieldImage(): void {
        if (!this.field_) {
            return;
        }

        const imgname = this.field_image_name_.replace(/\.png$/i, '');
        this.image_src_.getImageData(imgname)
            .then((data) => {
                if (data && data.data && this.field_) {
                    this.field_.src = `data:image/png;base64,${data.data}`;
                }
            })
            .catch(() => {
                // Keep an empty field image on errors.
            });
    }

    private renderContent(): void {
        if (!this.empty_ || !this.canvas_ || !this.select_button_) {
            return;
        }

        const active = this.getActiveAuto();
        const hasData = active !== undefined;

        this.empty_.style.display = hasData ? 'none' : 'block';
        this.canvas_.style.display = hasData ? 'block' : 'none';
        this.select_button_.disabled = !hasData;

        if (!active) {
            return;
        }

        this.renderEdges(active);
        this.renderNodes(active);
    }

    private renderEdges(active: ParsedAutoTab): void {
        if (!this.svg_ || !this.canvas_) {
            return;
        }

        this.svg_.innerHTML = '';

        const rect = this.canvas_.getBoundingClientRect();
        this.svg_.setAttribute('width', rect.width.toString());
        this.svg_.setAttribute('height', rect.height.toString());
        this.svg_.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

        const markerId = `xero-autoselector-arrow-${Date.now()}`;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', markerId);
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '8');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        marker.setAttribute('markerUnits', 'strokeWidth');

        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.setAttribute('d', 'M0,0 L0,6 L9,3 z');
        arrow.setAttribute('fill', '#79b1ff');
        marker.appendChild(arrow);
        defs.appendChild(marker);
        this.svg_.appendChild(defs);

        for (const edge of active.edges) {
            const from = active.nodes.find((n) => n.id === edge.from);
            const to = active.nodes.find((n) => n.id === edge.to);
            if (!from || !to) {
                continue;
            }

            const p1 = this.nodeToPixel(from, rect);
            const p2 = this.nodeToPixel(to, rect);

            let cx = edge.cx;
            let cy = edge.cy;
            if (cx === undefined || cy === undefined) {
                cx = (from.x + to.x) / 2;
                cy = (from.y + to.y) / 2;
            }
            const cp = this.nodeToPixel({ x: cx, y: cy }, rect);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`);
            path.setAttribute('class', 'xero-autoselector-edge');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', `url(#${markerId})`);
            this.svg_.appendChild(path);
        }
    }

    private renderNodes(active: ParsedAutoTab): void {
        if (!this.nodes_layer_ || !this.canvas_) {
            return;
        }

        this.nodes_layer_.innerHTML = '';
        const rect = this.canvas_.getBoundingClientRect();

        for (const node of active.nodes) {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'xero-autoselector-node';
            nodeEl.innerText = node.end ? `${node.action} / End` : node.action;

            const pos = this.nodeToPixel(node, rect);
            nodeEl.style.left = `${pos.x}px`;
            nodeEl.style.top = `${pos.y}px`;

            this.nodes_layer_.appendChild(nodeEl);
        }
    }

    private nodeToPixel(node: { x: number; y: number }, rect: DOMRect): { x: number; y: number } {
        return {
            x: rect.width * node.x,
            y: rect.height * node.y,
        };
    }
}

export class AutoSelectorControl extends FormControl {
    private static item_desc_: IPCAutoSelectorItem = {
        type: 'autoselector',
        tag: '',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        color: '#0f172a',
        background: '#e6eefb',
        fontFamily: 'Arial',
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'normal',
        datatype: 'string',
        transparent: false,
        fieldImage: 'field2025',
        showSourceTagInTab: true,
    };

    private image_src_: ImageDataSource;
    private selected_auto_name_: string = '';
    private dialog_?: AutoSelectorDialog;

    constructor(imsrc: ImageDataSource, view: XeroView, tag: string, bounds: XeroRect) {
        super(view, AutoSelectorControl.item_desc_);
        this.image_src_ = imsrc;
        this.setTag(tag);
        this.setBounds(bounds);
    }

    public copyObject(): FormControl {
        return new AutoSelectorControl(this.image_src_, this.view, this.item.tag, this.bounds);
    }

    public updateFromItem(editing: boolean, scale: number, xoff: number, yoff: number): void {
        if (!this.ctrl) {
            return;
        }

        this.setPosition(scale, xoff, yoff, 900);

        this.ctrl.style.fontFamily = this.item.fontFamily;
        this.ctrl.style.fontSize = this.item.fontSize + 'px';
        this.ctrl.style.fontStyle = this.item.fontStyle;
        this.ctrl.style.fontWeight = this.item.fontWeight;

        if (editing) {
            this.ctrl.style.background = 'rgba(30, 41, 59, 0.08)';
            this.ctrl.style.border = '2px dashed #51617d';
            this.ctrl.style.color = '#51617d';
            this.ctrl.innerText = 'Auto Selector';
        }
        else {
            const bg = this.item.transparent ? 'transparent' : this.item.background;
            this.ctrl.style.background = bg;
            this.ctrl.style.color = this.item.color;
            this.updateScoutText();
        }
    }

    public createForEdit(parent: HTMLElement, xoff: number, yoff: number): void {
        super.createForEdit(parent, xoff, yoff);

        this.ctrl = document.createElement('div');
        this.setClassList(this.ctrl, 'edit');
        this.ctrl.classList.add('xero-autoselector-edit-label');

        parent.appendChild(this.ctrl);
        this.updateFromItem(true, 1.0, xoff, yoff);
    }

    public createForScouting(parent: HTMLElement, scale: number, xoff: number, yoff: number): void {
        super.createForScouting(parent, scale, xoff, yoff);

        const btn = document.createElement('button');
        btn.type = 'button';
        this.ctrl = btn;
        this.setClassList(this.ctrl, 'scout');
        this.ctrl.classList.add('xero-autoselector-button');
        this.ctrl.addEventListener('click', this.openSelector.bind(this));

        parent.appendChild(this.ctrl);
        this.updateFromItem(false, scale, xoff, yoff);
    }

    public createEditDialog(): EditFormControlDialog {
        return new EditAutoSelectorDialog(this, this.image_src_.getImageNames());
    }

    public getData(): IPCTypedDataValue | undefined {
        return DataValue.fromString(this.selected_auto_name_);
    }

    public setData(data: IPCTypedDataValue): void {
        if (data && data.type === 'string' && typeof data.value === 'string') {
            this.selected_auto_name_ = data.value;
        }
        else {
            this.selected_auto_name_ = '';
        }

        this.updateScoutText();
    }

    private updateScoutText(): void {
        if (!this.ctrl) {
            return;
        }

        if (this.selected_auto_name_.length > 0) {
            this.ctrl.innerText = `Auto: ${this.selected_auto_name_}`;
        }
        else {
            this.ctrl.innerText = 'Auto: None selected';
        }
    }

    private openSelector(): void {
        if (this.dialog_) {
            return;
        }

        const item = this.item as IPCAutoSelectorItem;
        const autos = this.collectAutos(item.showSourceTagInTab !== false);

        const parent = this.ctrl?.parentElement || this.view.elem;
        this.dialog_ = new AutoSelectorDialog(
            autos,
            this.image_src_,
            item.fieldImage,
            this.selected_auto_name_,
            (autoName: string) => {
                this.selected_auto_name_ = autoName;
                this.updateScoutText();
            },
        );
        this.dialog_.on('closed', () => {
            this.dialog_ = undefined;
        });
        this.dialog_.showCentered(parent);
    }

    private collectAutos(showSourceTagInTab: boolean): ParsedAutoTab[] {
        const result = this.getActiveTeamResult();
        if (!result || !result.data || !Array.isArray(result.data)) {
            return [];
        }

        const autos: ParsedAutoTab[] = [];

        for (const tagged of result.data) {
            if (!tagged || !tagged.value || tagged.value.type !== 'string') {
                continue;
            }

            if (typeof tagged.value.value !== 'string' || tagged.value.value.length === 0) {
                continue;
            }

            let parsed: any;
            try {
                parsed = JSON.parse(tagged.value.value);
            }
            catch {
                continue;
            }

            const parsedAutos = this.extractAutos(parsed);
            if (parsedAutos.length === 0) {
                continue;
            }

            for (let i = 0; i < parsedAutos.length; i++) {
                const auto = parsedAutos[i];
                const name = auto.name && auto.name.length > 0 ? auto.name : `Auto ${i + 1}`;

                autos.push({
                    key: `${tagged.tag}:${auto.id || i}`,
                    sourceTag: tagged.tag,
                    autoName: name,
                    tabLabel: name,
                    nodes: auto.nodes,
                    edges: auto.edges,
                });
            }
        }

        const counts = new Map<string, number>();
        for (const auto of autos) {
            counts.set(auto.autoName, (counts.get(auto.autoName) || 0) + 1);
        }

        for (const auto of autos) {
            const duplicated = (counts.get(auto.autoName) || 0) > 1;
            if (duplicated || showSourceTagInTab) {
                auto.tabLabel = `${auto.autoName} (${auto.sourceTag})`;
            }
            else {
                auto.tabLabel = auto.autoName;
            }
        }

        return autos;
    }

    private extractAutos(parsed: any): AutoPlan[] {
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.autos)) {
            return [];
        }

        const autos: AutoPlan[] = [];
        for (const candidate of parsed.autos) {
            if (!candidate || typeof candidate !== 'object') {
                continue;
            }

            const nodes: AutoPlanNode[] = [];
            if (Array.isArray(candidate.nodes)) {
                for (const node of candidate.nodes) {
                    if (!node || typeof node !== 'object') {
                        continue;
                    }
                    if (typeof node.id !== 'string' || typeof node.action !== 'string') {
                        continue;
                    }
                    if (typeof node.x !== 'number' || typeof node.y !== 'number') {
                        continue;
                    }

                    nodes.push({
                        id: node.id,
                        action: node.action,
                        x: Math.max(0, Math.min(1, node.x)),
                        y: Math.max(0, Math.min(1, node.y)),
                        end: node.end === true,
                    });
                }
            }

            const edges: AutoPlanEdge[] = [];
            if (Array.isArray(candidate.edges)) {
                for (const edge of candidate.edges) {
                    if (!edge || typeof edge !== 'object') {
                        continue;
                    }
                    if (typeof edge.id !== 'string' || typeof edge.from !== 'string' || typeof edge.to !== 'string') {
                        continue;
                    }

                    const one: AutoPlanEdge = {
                        id: edge.id,
                        from: edge.from,
                        to: edge.to,
                    };

                    if (typeof edge.cx === 'number') {
                        one.cx = Math.max(0, Math.min(1, edge.cx));
                    }
                    if (typeof edge.cy === 'number') {
                        one.cy = Math.max(0, Math.min(1, edge.cy));
                    }

                    edges.push(one);
                }
            }

            if (nodes.length === 0) {
                continue;
            }

            autos.push({
                id: typeof candidate.id === 'string' ? candidate.id : `auto-${autos.length + 1}`,
                name: typeof candidate.name === 'string' ? candidate.name : `Auto ${autos.length + 1}`,
                nodes,
                edges,
            });
        }

        return autos;
    }

    private getActiveTeamResult(): IPCScoutResult | undefined {
        const view = this.view as any;
        if (view && typeof view.getActiveTeamResult === 'function') {
            return view.getActiveTeamResult();
        }
        return undefined;
    }
}
