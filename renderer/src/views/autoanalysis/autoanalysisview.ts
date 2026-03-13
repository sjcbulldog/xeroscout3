import { XeroApp } from "../../apps/xeroapp.js";
import { IPCAutoAnalysisAuto, IPCAutoAnalysisMatchRow, IPCAutoAnalysisPayload, IPCAutoAnalysisSelection, IPCAutoAnalysisTeamSummary } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";

export class AutoAnalysisView extends XeroView {
    private payload_: IPCAutoAnalysisPayload = {
        teams: [],
        autosByTeam: {},
        matchesByTeam: {},
        plannerTags: [],
        selectorTags: [],
    } ;
    private filterText_: string = '' ;
    private selectedTeam_: number | undefined = undefined ;
    private selectedMatchKey_: string | undefined = undefined ;

    public constructor(app: XeroApp) {
        super(app, 'xero-auto-analysis-view') ;

        this.registerCallback('send-auto-analysis-data', this.receivedData.bind(this)) ;
        this.request('get-auto-analysis-data') ;
    }

    private receivedData(data: IPCAutoAnalysisPayload) {
        this.payload_ = data ;
        const filtered = this.getFilteredTeams() ;
        if (this.selectedTeam_ === undefined || !filtered.some(team => team.teamNumber === this.selectedTeam_)) {
            this.selectedTeam_ = filtered.length > 0 ? filtered[0].teamNumber : undefined ;
            this.selectedMatchKey_ = undefined ;
        }
        this.render() ;
    }

    private getFilteredTeams() : IPCAutoAnalysisTeamSummary[] {
        const query = this.filterText_.trim().toLowerCase() ;
        if (query.length === 0) {
            return this.payload_.teams ;
        }

        return this.payload_.teams.filter((team) => {
            return team.teamNumber.toString().includes(query) ||
                   (team.teamName || '').toLowerCase().includes(query) ;
        }) ;
    }

    private render() {
        this.reset() ;

        this.elem.style.width = '100%' ;
        this.elem.style.height = '100%' ;
        this.elem.style.display = 'flex' ;
        this.elem.style.flexDirection = 'column' ;

        const container = document.createElement('div') ;
        container.style.display = 'flex' ;
        container.style.width = '100%' ;
        container.style.height = '100%' ;
        container.style.overflow = 'hidden' ;

        container.appendChild(this.createTeamPanel()) ;
        container.appendChild(this.createDetailPanel()) ;

        this.elem.appendChild(container) ;
    }

    private createTeamPanel() : HTMLDivElement {
        const panel = document.createElement('div') ;
        panel.style.width = '300px' ;
        panel.style.borderRight = '1px solid #d7dee8' ;
        panel.style.padding = '12px' ;
        panel.style.boxSizing = 'border-box' ;
        panel.style.display = 'flex' ;
        panel.style.flexDirection = 'column' ;
        panel.style.gap = '10px' ;

        const title = document.createElement('div') ;
        title.textContent = 'Auto Analysis' ;
        title.style.fontSize = '24px' ;
        title.style.fontWeight = '700' ;
        panel.appendChild(title) ;

        const search = document.createElement('input') ;
        search.type = 'search' ;
        search.placeholder = 'Filter teams' ;
        search.value = this.filterText_ ;
        search.style.padding = '8px 10px' ;
        search.style.border = '1px solid #cbd5e1' ;
        search.style.borderRadius = '8px' ;
        search.addEventListener('input', () => {
            this.filterText_ = search.value ;
            const filtered = this.getFilteredTeams() ;
            if (!filtered.some(team => team.teamNumber === this.selectedTeam_)) {
                this.selectedTeam_ = filtered.length > 0 ? filtered[0].teamNumber : undefined ;
                this.selectedMatchKey_ = undefined ;
            }
            this.render() ;
        }) ;
        panel.appendChild(search) ;

        const list = document.createElement('div') ;
        list.style.display = 'flex' ;
        list.style.flexDirection = 'column' ;
        list.style.gap = '8px' ;
        list.style.overflowY = 'auto' ;
        list.style.flex = '1' ;
        panel.appendChild(list) ;

        const teams = this.getFilteredTeams() ;
        if (teams.length === 0) {
            const empty = document.createElement('div') ;
            empty.textContent = 'No teams match the current filter.' ;
            empty.style.color = '#64748b' ;
            list.appendChild(empty) ;
        }
        else {
            for (const team of teams) {
                list.appendChild(this.createTeamButton(team)) ;
            }
        }

        return panel ;
    }

    private createTeamButton(team: IPCAutoAnalysisTeamSummary) : HTMLButtonElement {
        const button = document.createElement('button') ;
        button.type = 'button' ;
        button.style.textAlign = 'left' ;
        button.style.padding = '10px' ;
        button.style.borderRadius = '10px' ;
        button.style.border = team.teamNumber === this.selectedTeam_ ? '1px solid #2563eb' : '1px solid #d7dee8' ;
        button.style.background = team.teamNumber === this.selectedTeam_ ? '#eff6ff' : '#ffffff' ;
        button.style.cursor = 'pointer' ;
        button.addEventListener('click', () => {
            this.selectedTeam_ = team.teamNumber ;
            this.selectedMatchKey_ = undefined ;
            this.render() ;
        }) ;

        const name = document.createElement('div') ;
        name.textContent = team.teamName && team.teamName.length > 0 ? `${team.teamNumber} - ${team.teamName}` : `${team.teamNumber}` ;
        name.style.fontWeight = '700' ;
        button.appendChild(name) ;

        const meta = document.createElement('div') ;
        meta.textContent = `${team.autoCount} autos, ${team.matchCount} matches` ;
        meta.style.fontSize = '12px' ;
        meta.style.color = '#475569' ;
        meta.style.marginTop = '4px' ;
        button.appendChild(meta) ;

        return button ;
    }

    private createDetailPanel() : HTMLDivElement {
        const panel = document.createElement('div') ;
        panel.style.flex = '1' ;
        panel.style.padding = '12px' ;
        panel.style.boxSizing = 'border-box' ;
        panel.style.overflow = 'auto' ;

        if (this.selectedTeam_ === undefined) {
            const empty = document.createElement('div') ;
            empty.textContent = 'No team data is available.' ;
            empty.style.color = '#64748b' ;
            panel.appendChild(empty) ;
            return panel ;
        }

        const summary = this.payload_.teams.find(team => team.teamNumber === this.selectedTeam_) ;
        const autos = this.payload_.autosByTeam[this.selectedTeam_.toString()] || [] ;
        const matches = this.payload_.matchesByTeam[this.selectedTeam_.toString()] || [] ;

        const header = document.createElement('div') ;
        header.style.display = 'flex' ;
        header.style.justifyContent = 'space-between' ;
        header.style.alignItems = 'center' ;
        header.style.marginBottom = '12px' ;

        const title = document.createElement('div') ;
        title.textContent = summary && summary.teamName.length > 0 ?
            `Team ${summary.teamNumber} - ${summary.teamName}` :
            `Team ${this.selectedTeam_}` ;
        title.style.fontSize = '24px' ;
        title.style.fontWeight = '700' ;
        header.appendChild(title) ;

        const meta = document.createElement('div') ;
        meta.textContent = `${autos.length} stored autos | ${matches.length} scouted matches` ;
        meta.style.color = '#475569' ;
        header.appendChild(meta) ;

        panel.appendChild(header) ;
        panel.appendChild(this.createAutosSection(autos, matches)) ;
        panel.appendChild(this.createMatchesSection(matches)) ;
        return panel ;
    }

    private createAutosSection(autos: IPCAutoAnalysisAuto[], matches: IPCAutoAnalysisMatchRow[]) : HTMLDivElement {
        const section = document.createElement('div') ;
        section.style.marginBottom = '18px' ;

        const title = document.createElement('div') ;
        title.textContent = 'Stored Autos' ;
        title.style.fontSize = '18px' ;
        title.style.fontWeight = '700' ;
        title.style.marginBottom = '8px' ;
        section.appendChild(title) ;

        if (autos.length === 0) {
            section.appendChild(this.createEmptyState('No stored team auto planner data was found for this team.')) ;
            return section ;
        }

        const selectedKeys = this.getSelectedAutoKeys(matches) ;
        const groups = new Map<string, IPCAutoAnalysisAuto[]>() ;
        for (const auto of autos) {
            const existing = groups.get(auto.sourceTag) || [] ;
            existing.push(auto) ;
            groups.set(auto.sourceTag, existing) ;
        }

        for (const [tag, items] of groups.entries()) {
            const group = document.createElement('div') ;
            group.style.marginBottom = '16px' ;

            const groupTitle = document.createElement('div') ;
            groupTitle.textContent = tag ;
            groupTitle.style.fontWeight = '700' ;
            groupTitle.style.marginBottom = '8px' ;
            group.appendChild(groupTitle) ;

            const cards = document.createElement('div') ;
            cards.style.display = 'grid' ;
            cards.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))' ;
            cards.style.gap = '12px' ;

            for (const auto of items) {
                cards.appendChild(this.createAutoCard(auto, selectedKeys.has(auto.key))) ;
            }

            group.appendChild(cards) ;
            section.appendChild(group) ;
        }

        return section ;
    }

    private createAutoCard(auto: IPCAutoAnalysisAuto, selected: boolean) : HTMLDivElement {
        const card = document.createElement('div') ;
        card.style.border = selected ? '1px solid #2563eb' : '1px solid #d7dee8' ;
        card.style.background = selected ? '#eff6ff' : '#ffffff' ;
        card.style.borderRadius = '12px' ;
        card.style.padding = '10px' ;
        card.style.boxSizing = 'border-box' ;

        const title = document.createElement('div') ;
        title.textContent = auto.autoName ;
        title.style.fontWeight = '700' ;
        title.style.marginBottom = '8px' ;
        card.appendChild(title) ;

        const canvas = document.createElement('div') ;
        canvas.style.position = 'relative' ;
        canvas.style.height = '220px' ;
        canvas.style.borderRadius = '10px' ;
        canvas.style.overflow = 'hidden' ;
        canvas.style.background = '#f8fafc' ;
        canvas.style.border = '1px solid #e2e8f0' ;
        card.appendChild(canvas) ;

        const image = document.createElement('img') ;
        image.style.width = '100%' ;
        image.style.height = '100%' ;
        image.style.objectFit = 'contain' ;
        image.style.display = 'block' ;
        canvas.appendChild(image) ;
        image.addEventListener('load', () => {
            this.renderAutoPreview(auto, canvas, image, svg, nodesLayer) ;
        }) ;
        this.loadFieldImage(image, auto.fieldImage) ;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') ;
        svg.setAttribute('viewBox', '0 0 320 220') ;
        svg.style.position = 'absolute' ;
        svg.style.left = '0' ;
        svg.style.top = '0' ;
        svg.style.width = '100%' ;
        svg.style.height = '100%' ;
        canvas.appendChild(svg) ;

        const nodesLayer = document.createElement('div') ;
        nodesLayer.style.position = 'absolute' ;
        nodesLayer.style.left = '0' ;
        nodesLayer.style.top = '0' ;
        nodesLayer.style.width = '100%' ;
        nodesLayer.style.height = '100%' ;
        canvas.appendChild(nodesLayer) ;

        window.requestAnimationFrame(() => {
            this.renderAutoPreview(auto, canvas, image, svg, nodesLayer) ;
        }) ;
        return card ;
    }

    private async loadFieldImage(image: HTMLImageElement, fieldImage: string) {
        let normalized = (fieldImage || '').trim() ;
        if (normalized.length === 0) {
            normalized = 'field2025' ;
        }
        normalized = normalized.replace(/\.png$/i, '') ;

        try {
            const data = await this.app.imageSource!.getImageData(normalized) ;
            if (data && data.data) {
                image.src = `data:image/png;base64,${data.data}` ;
            }
        }
        catch {
        }
    }

    private renderAutoPreview(auto: IPCAutoAnalysisAuto, canvas: HTMLDivElement, image: HTMLImageElement, svg: SVGSVGElement, nodesLayer: HTMLDivElement) {
        svg.innerHTML = '' ;
        nodesLayer.innerHTML = '' ;

        const fieldRect = this.getContainedImageRect(canvas, image) ;
        svg.style.left = `${fieldRect.left}px` ;
        svg.style.top = `${fieldRect.top}px` ;
        svg.style.width = `${fieldRect.width}px` ;
        svg.style.height = `${fieldRect.height}px` ;
        svg.setAttribute('viewBox', `0 0 ${fieldRect.width} ${fieldRect.height}`) ;

        nodesLayer.style.left = `${fieldRect.left}px` ;
        nodesLayer.style.top = `${fieldRect.top}px` ;
        nodesLayer.style.width = `${fieldRect.width}px` ;
        nodesLayer.style.height = `${fieldRect.height}px` ;

        const markerId = `auto-analysis-arrow-${auto.key.replace(/[^a-zA-Z0-9_-]/g, '-')}` ;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs') ;
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker') ;
        marker.setAttribute('id', markerId) ;
        marker.setAttribute('markerWidth', '10') ;
        marker.setAttribute('markerHeight', '10') ;
        marker.setAttribute('refX', '8') ;
        marker.setAttribute('refY', '3') ;
        marker.setAttribute('orient', 'auto') ;
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path') ;
        arrow.setAttribute('d', 'M0,0 L0,6 L9,3 z') ;
        arrow.setAttribute('fill', '#2563eb') ;
        marker.appendChild(arrow) ;
        defs.appendChild(marker) ;
        svg.appendChild(defs) ;

        for (const edge of auto.edges) {
            const from = auto.nodes.find(node => node.id === edge.from) ;
            const to = auto.nodes.find(node => node.id === edge.to) ;
            if (!from || !to) {
                continue ;
            }

            const p1 = { x: from.x * fieldRect.width, y: from.y * fieldRect.height } ;
            const p2 = { x: to.x * fieldRect.width, y: to.y * fieldRect.height } ;
            const cp = {
                x: (edge.cx !== undefined ? edge.cx : (from.x + to.x) / 2) * fieldRect.width,
                y: (edge.cy !== undefined ? edge.cy : (from.y + to.y) / 2) * fieldRect.height,
            } ;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path') ;
            path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`) ;
            path.setAttribute('stroke', '#2563eb') ;
            path.setAttribute('stroke-width', '3') ;
            path.setAttribute('fill', 'none') ;
            path.setAttribute('marker-end', `url(#${markerId})`) ;
            svg.appendChild(path) ;
        }

        for (const node of auto.nodes) {
            const div = document.createElement('div') ;
            div.textContent = node.end ? `${node.action} / End` : node.action ;
            div.style.position = 'absolute' ;
            div.style.left = `${node.x * fieldRect.width}px` ;
            div.style.top = `${node.y * fieldRect.height}px` ;
            div.style.transform = 'translate(-50%, -50%)' ;
            div.style.padding = '4px 8px' ;
            div.style.borderRadius = '999px' ;
            div.style.background = '#0f172a' ;
            div.style.color = '#ffffff' ;
            div.style.fontSize = '12px' ;
            div.style.whiteSpace = 'nowrap' ;
            nodesLayer.appendChild(div) ;
        }
    }

    private getContainedImageRect(canvas: HTMLDivElement, image: HTMLImageElement) : { left: number, top: number, width: number, height: number } {
        const width = canvas.clientWidth ;
        const height = canvas.clientHeight ;
        if (width <= 0 || height <= 0) {
            return { left: 0, top: 0, width: 320, height: 220 } ;
        }

        const naturalWidth = image.naturalWidth ;
        const naturalHeight = image.naturalHeight ;
        if (naturalWidth <= 0 || naturalHeight <= 0) {
            return { left: 0, top: 0, width, height } ;
        }

        const imageAspect = naturalWidth / naturalHeight ;
        const canvasAspect = width / height ;

        if (imageAspect > canvasAspect) {
            const containedHeight = width / imageAspect ;
            return {
                left: 0,
                top: (height - containedHeight) / 2,
                width,
                height: containedHeight,
            } ;
        }

        const containedWidth = height * imageAspect ;
        return {
            left: (width - containedWidth) / 2,
            top: 0,
            width: containedWidth,
            height,
        } ;
    }

    private createMatchesSection(matches: IPCAutoAnalysisMatchRow[]) : HTMLDivElement {
        const section = document.createElement('div') ;
        const title = document.createElement('div') ;
        title.textContent = 'Match History' ;
        title.style.fontSize = '18px' ;
        title.style.fontWeight = '700' ;
        title.style.marginBottom = '8px' ;
        section.appendChild(title) ;

        if (matches.length === 0) {
            section.appendChild(this.createEmptyState('No scouted match auto selections were found for this team.')) ;
            return section ;
        }

        const wrapper = document.createElement('div') ;
        wrapper.style.border = '1px solid #d7dee8' ;
        wrapper.style.borderRadius = '12px' ;
        wrapper.style.overflow = 'hidden' ;
        section.appendChild(wrapper) ;

        const table = document.createElement('table') ;
        table.style.width = '100%' ;
        table.style.borderCollapse = 'collapse' ;
        wrapper.appendChild(table) ;

        const thead = document.createElement('thead') ;
        const headRow = document.createElement('tr') ;
        for (const titleText of ['Match', 'Alliance', ...this.payload_.selectorTags]) {
            const th = document.createElement('th') ;
            th.textContent = titleText ;
            th.style.textAlign = 'left' ;
            th.style.padding = '10px' ;
            th.style.background = '#f8fafc' ;
            th.style.borderBottom = '1px solid #d7dee8' ;
            headRow.appendChild(th) ;
        }
        thead.appendChild(headRow) ;
        table.appendChild(thead) ;

        const tbody = document.createElement('tbody') ;
        table.appendChild(tbody) ;

        for (const row of matches) {
            tbody.appendChild(this.createMatchRow(row)) ;
        }

        return section ;
    }

    private createMatchRow(row: IPCAutoAnalysisMatchRow) : HTMLTableRowElement {
        const tr = document.createElement('tr') ;
        tr.style.cursor = 'pointer' ;
        tr.style.background = this.matchKey(row) === this.selectedMatchKey_ ? '#eff6ff' : '#ffffff' ;
        tr.addEventListener('click', () => {
            this.selectedMatchKey_ = this.matchKey(row) ;
            this.render() ;
        }) ;

        tr.appendChild(this.createTextCell(this.formatMatch(row))) ;
        tr.appendChild(this.createTextCell(row.alliance || '')) ;

        for (const tag of this.payload_.selectorTags) {
            const selection = row.selections.find(one => one.tag === tag) || {
                tag: tag,
                value: '',
                status: 'blank',
                matchedAutoKeys: [],
            } ;

            const cell = this.createTextCell(selection.value || '') ;
            cell.appendChild(this.createBadge(selection)) ;
            tr.appendChild(cell) ;
        }

        return tr ;
    }

    private createTextCell(text: string) : HTMLTableCellElement {
        const td = document.createElement('td') ;
        td.style.padding = '10px' ;
        td.style.borderBottom = '1px solid #eef2f7' ;

        if (text.length > 0) {
            const div = document.createElement('div') ;
            div.textContent = text ;
            td.appendChild(div) ;
        }

        return td ;
    }

    private createBadge(selection: IPCAutoAnalysisSelection) : HTMLSpanElement {
        const badge = document.createElement('span') ;
        badge.style.display = 'inline-block' ;
        badge.style.marginTop = '6px' ;
        badge.style.padding = '2px 8px' ;
        badge.style.borderRadius = '999px' ;
        badge.style.fontSize = '11px' ;
        badge.style.fontWeight = '700' ;

        let label = 'Blank' ;
        let background = '#e2e8f0' ;
        let color = '#475569' ;

        if (selection.status === 'other') {
            label = 'Other' ;
            background = '#fef3c7' ;
            color = '#92400e' ;
        }
        else if (selection.status === 'matched') {
            label = 'Matched' ;
            background = '#dcfce7' ;
            color = '#166534' ;
        }
        else if (selection.status === 'ambiguous') {
            label = 'Ambiguous' ;
            background = '#fee2e2' ;
            color = '#991b1b' ;
        }
        else if (selection.status === 'unknown') {
            label = 'Unknown' ;
            background = '#ede9fe' ;
            color = '#5b21b6' ;
        }

        badge.textContent = label ;
        badge.style.background = background ;
        badge.style.color = color ;
        return badge ;
    }

    private createEmptyState(text: string) : HTMLDivElement {
        const empty = document.createElement('div') ;
        empty.textContent = text ;
        empty.style.padding = '12px' ;
        empty.style.border = '1px dashed #cbd5e1' ;
        empty.style.borderRadius = '10px' ;
        empty.style.color = '#64748b' ;
        return empty ;
    }

    private getSelectedAutoKeys(matches: IPCAutoAnalysisMatchRow[]) : Set<string> {
        const ret = new Set<string>() ;
        if (!this.selectedMatchKey_) {
            return ret ;
        }

        const row = matches.find(one => this.matchKey(one) === this.selectedMatchKey_) ;
        if (!row) {
            return ret ;
        }

        for (const selection of row.selections) {
            for (const key of selection.matchedAutoKeys) {
                ret.add(key) ;
            }
        }

        return ret ;
    }

    private formatMatch(row: IPCAutoAnalysisMatchRow) : string {
        if (row.comp_level === 'qm') {
            return `QM ${row.match_number}` ;
        }

        return `${row.comp_level.toUpperCase()} ${row.set_number}-${row.match_number}` ;
    }

    private matchKey(row: IPCAutoAnalysisMatchRow) : string {
        return `${row.comp_level}:${row.set_number}:${row.match_number}` ;
    }
}
