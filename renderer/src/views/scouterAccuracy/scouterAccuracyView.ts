import { XeroApp } from "../../apps/xeroapp.js";
import { XeroView } from "../xeroview.js";
import { IPCColumnDesc, IPCDatabaseData, IPCTypedDataValue, IPCFormula } from "../../shared/ipc.js";
import { DataValue } from "../../shared/datavalue.js";
import { Expr } from "../../shared/expr.js";

interface ScouterConfig {
    id: string;
    name: string;
    scouterColumn: string;
    scoreFormulaName?: string;
    scoreFormula?: string;
    pointsFormulaName?: string;
    pointsFormula?: string;
    // legacy fields
    formulaName?: string;
    varianceFormula?: string;
}

interface GraphPoint {
    label: string;
    order: number;
    red?: number;
    blue?: number;
}

interface TableEntry {
    matchLabel: string;
    value: number;
}

interface ContributionEntry {
    name: string;
    matches: number;
    contribution?: number;
}

interface ScouterAnalysis {
    graphPoints: GraphPoint[];
    redRows: TableEntry[];
    blueRows: TableEntry[];
    contributions: ContributionEntry[];
    statusMessage?: string;
    scoreFormulaName?: string;
    scoreFormulaDesc?: string;
    pointsFormulaName?: string;
    pointsFormulaDesc?: string;
}

export class ScouterAccuracyView extends XeroView {
    private static readonly storageKey = "scouterAccuracyConfigs";

    private columns_: IPCColumnDesc[] = [];
    private rows_: Record<string, IPCTypedDataValue>[] = [];
    private configs_: ScouterConfig[] = [];
    private formulas_: IPCFormula[] = [];
    private formulasLoaded_ = false;
    private selectedConfigId_: string | undefined;
    private graphCanvas_: HTMLCanvasElement | undefined;
    private graphPoints_: GraphPoint[] = [];
    private resizeHandler_: (() => void) | undefined;
    private graphRenderPending_ = false;
    private dataLoaded_ = false;
    private teamColumns_: IPCColumnDesc[] = [];
    private teamRows_: Record<string, IPCTypedDataValue>[] = [];
    private teamRowByKey_: Map<string, Record<string, IPCTypedDataValue>> = new Map();
    private teamRowByNumber_: Map<number, Record<string, IPCTypedDataValue>> = new Map();
    private teamDataLoaded_ = false;

    public constructor(app: XeroApp) {
        super(app, "xero-scouter-accuracy-view");
        this.elem.classList.add("xero-scouter-accuracy-view");
        this.elem.style.width = "100%";
        this.elem.style.height = "100%";
        this.elem.style.display = "flex";
        this.elem.style.padding = "16px";
        this.elem.style.boxSizing = "border-box";
        this.elem.style.backgroundColor = "#f5f6fb";
        this.registerCallback("send-match-db", this.receiveMatchData.bind(this));
        this.registerCallback("send-team-db", this.receiveTeamData.bind(this));
        this.registerCallback("send-formulas", this.receivedFormulas.bind(this));
        this.request("get-match-db");
        this.request("get-team-db");
        this.request("get-formulas");
        this.loadConfigs();
        this.resizeHandler_ = this.onWindowResize.bind(this);
        window.addEventListener("resize", this.resizeHandler_);
        this.render();
    }

    public close() {
        if (this.resizeHandler_) {
            window.removeEventListener("resize", this.resizeHandler_);
            this.resizeHandler_ = undefined;
        }
        super.close();
    }

    private receiveMatchData(data: IPCDatabaseData) {
        this.columns_ = data.column_definitions || [];
        this.rows_ = Array.isArray(data.data)
            ? (data.data as Record<string, IPCTypedDataValue>[]).map((row) => row)
            : [];
        this.dataLoaded_ = true;
        this.render();
    }

    private receiveTeamData(data: IPCDatabaseData) {
        this.teamColumns_ = data.column_definitions || [];
        this.teamRows_ = Array.isArray(data.data)
            ? (data.data as Record<string, IPCTypedDataValue>[]).map((row) => row)
            : [];
        this.buildTeamIndices();
        this.teamDataLoaded_ = true;
        this.render();
    }

    private buildTeamIndices() {
        this.teamRowByKey_.clear();
        this.teamRowByNumber_.clear();

        for (const row of this.teamRows_) {
            const key = this.getString(row["key"]) ?? this.getString(row["team_key"]);
            if (key) {
                this.teamRowByKey_.set(key, row);
            }

            const teamNumber = this.getNumber(row["team_number"]);
            if (typeof teamNumber === "number" && !Number.isNaN(teamNumber)) {
                this.teamRowByNumber_.set(Math.trunc(teamNumber), row);
            }
        }
    }

    private receivedFormulas(data: IPCFormula[]) {
        this.formulas_ = Array.isArray(data) ? data : [];
        this.formulasLoaded_ = true;
        this.render();
    }

    private loadConfigs() {
        const stored = window.localStorage.getItem(ScouterAccuracyView.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    this.configs_ = parsed.map((cfg: ScouterConfig) => ({
                        ...cfg,
                        scoreFormulaName: cfg.scoreFormulaName ?? cfg.formulaName,
                        scoreFormula: cfg.scoreFormula ?? cfg.varianceFormula,
                        pointsFormulaName: cfg.pointsFormulaName ?? cfg.formulaName,
                        pointsFormula: cfg.pointsFormula ?? cfg.varianceFormula,
                    }));
                }
            } catch (err) {
                console.warn("Invalid scouter accuracy config", err);
            }
        }
        if (!this.selectedConfigId_ && this.configs_.length > 0) {
            this.selectedConfigId_ = this.configs_[0].id;
        }
    }

    private saveConfigs() {
        window.localStorage.setItem(ScouterAccuracyView.storageKey, JSON.stringify(this.configs_));
    }

    private deleteConfig(config: ScouterConfig) {
        const confirmed = window.confirm(`Delete configuration '${config.name}'?`);
        if (!confirmed) {
            return;
        }
        this.configs_ = this.configs_.filter((cfg) => cfg.id !== config.id);
        if (this.selectedConfigId_ === config.id) {
            this.selectedConfigId_ = this.configs_[0]?.id;
        }
        this.saveConfigs();
        this.render();
    }

    private getSelectedConfig(): ScouterConfig | undefined {
        if (!this.selectedConfigId_ && this.configs_.length > 0) {
            this.selectedConfigId_ = this.configs_[0].id;
        }
        return this.configs_.find((cfg) => cfg.id === this.selectedConfigId_);
    }

    private render() {
        this.reset();

        if (!this.formulasLoaded_) {
            this.elem.appendChild(this.createMessage("Loading formulas..."));
            return;
        }

        if (!this.formulas_.length) {
            this.elem.appendChild(
                this.createMessage("No formulas are available. Add a formula from the Formulas view first.")
            );
            return;
        }

        if (!this.dataLoaded_) {
            this.elem.appendChild(this.createMessage("Loading match data..."));
            return;
        }

        if (!this.columns_.length) {
            this.elem.appendChild(this.createMessage("Match columns have not been loaded yet."));
            return;
        }

        if (!this.rows_.length) {
            this.elem.appendChild(this.createMessage("No match data has been recorded yet."));
            return;
        }

        if (!this.teamDataLoaded_) {
            this.elem.appendChild(this.createMessage("Loading team database..."));
            return;
        }

        if (!this.configs_.length) {
            this.elem.appendChild(this.createMessage("Create a configuration to start analyzing scouter variance."));
            return;
        }

        const config = this.getSelectedConfig();
        if (!config) {
            this.elem.appendChild(this.createMessage("Choose a configuration from the list."));
            return;
        }

        const analysis = this.buildAnalysis(config);

        const layout = document.createElement("div");
        layout.style.display = "flex";
        layout.style.width = "100%";
        layout.style.height = "100%";
        layout.style.gap = "20px";
        layout.style.boxSizing = "border-box";

        layout.appendChild(this.createSidebar(config));
        layout.appendChild(this.createContent(analysis));

        this.elem.appendChild(layout);
    }

    private createMessage(text: string): HTMLElement {
        const message = document.createElement("div");
        message.className = "scouter-accuracy-empty";
        message.textContent = text;
        return message;
    }

    private createStatus(text: string): HTMLElement {
        const status = document.createElement("div");
        status.className = "scouter-accuracy-status";
        status.textContent = text;
        return status;
    }

    private createSidebar(config: ScouterConfig): HTMLElement {
        const sidebar = document.createElement("div");
        sidebar.style.width = "260px";
        sidebar.style.minWidth = "220px";
        sidebar.style.height = "100%";
        sidebar.style.backgroundColor = "#ffffff";
        sidebar.style.borderRadius = "18px";
        sidebar.style.padding = "20px";
        sidebar.style.display = "flex";
        sidebar.style.flexDirection = "column";
        sidebar.style.gap = "10px";
        sidebar.style.boxSizing = "border-box";
        sidebar.style.border = "1px solid #e2e8f0";
        sidebar.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";

        const heading = document.createElement("div");
        heading.textContent = "Accuracy configs";
        heading.style.fontSize = "18px";
        heading.style.fontWeight = "700";
        heading.style.color = "#0f172a";
        sidebar.appendChild(heading);

        const subtitle = document.createElement("div");
        subtitle.textContent = "Select a configuration to compare scouter variance.";
        subtitle.style.fontSize = "12px";
        subtitle.style.color = "#94a3b8";
        sidebar.appendChild(subtitle);

        const list = document.createElement("div");
        list.style.flexGrow = "1";
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.gap = "10px";
        list.style.overflowY = "auto";
        list.style.paddingRight = "4px";
        sidebar.appendChild(list);

        for (const cfg of this.configs_) {
            const configButton = document.createElement("button");
            configButton.type = "button";
            configButton.style.border = "1px solid #e5e7eb";
            configButton.style.borderRadius = "12px";
            configButton.style.padding = "14px 12px";
            configButton.style.backgroundColor = cfg.id === config.id ? "#dbeafe" : "#ffffff";
            configButton.style.cursor = "pointer";
            configButton.style.display = "flex";
            configButton.style.flexDirection = "column";
            configButton.style.alignItems = "flex-start";
            configButton.style.gap = "4px";
            configButton.style.textAlign = "left";
            if (cfg.id === config.id) {
                configButton.style.borderColor = "#a5b4fc";
                configButton.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.2)";
            }
            configButton.addEventListener("click", () => {
                this.selectedConfigId_ = cfg.id;
                this.render();
            });

            const nameLabel = document.createElement("span");
            nameLabel.textContent = cfg.name;
            nameLabel.style.fontWeight = "600";
            nameLabel.style.fontSize = "14px";
            nameLabel.style.color = "#0f172a";
            configButton.appendChild(nameLabel);

            const columnLabel = document.createElement("span");
            columnLabel.textContent = cfg.scouterColumn;
            columnLabel.style.fontSize = "11px";
            columnLabel.style.color = "#475569";
            columnLabel.style.textTransform = "uppercase";
            configButton.appendChild(columnLabel);

            const formulaLabel = document.createElement("span");
            const scoreLabelText = cfg.scoreFormulaName ?? "Score formula";
            const pointsLabelText = cfg.pointsFormulaName ?? "Points formula";
            formulaLabel.textContent = `${scoreLabelText} | ${pointsLabelText}`;
            formulaLabel.style.fontSize = "11px";
            formulaLabel.style.color = "#94a3b8";
            configButton.appendChild(formulaLabel);

            list.appendChild(configButton);
        }

        const meta = document.createElement("div");
        meta.style.fontSize = "11px";
        meta.style.color = "#475569";
        meta.style.marginTop = "8px";
        meta.textContent = `Column: ${config.scouterColumn}`;
        sidebar.appendChild(meta);

        const formulaMeta = document.createElement("div");
        formulaMeta.style.fontSize = "11px";
        formulaMeta.style.color = "#475569";
        const scoreMeta = config.scoreFormulaName ?? "Score formula";
        const pointsMeta = config.pointsFormulaName ?? "Points formula";
        formulaMeta.textContent = `Score: ${scoreMeta} | Points: ${pointsMeta}`;
        sidebar.appendChild(formulaMeta);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.flexDirection = "column";
        actions.style.gap = "8px";
        actions.style.marginTop = "6px";

        const createActionButton = (text: string, primary?: boolean) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = text;
            button.style.padding = "10px 14px";
            button.style.borderRadius = "12px";
            button.style.border = primary ? "1px solid #2563eb" : "1px solid #cbd5f5";
            button.style.cursor = "pointer";
            button.style.fontWeight = "600";
            button.style.fontSize = "13px";
            button.style.transition = "transform 120ms";
            if (primary) {
                button.style.backgroundColor = "#2563eb";
                button.style.color = "#ffffff";
                button.addEventListener("mouseover", () => (button.style.transform = "translateY(-1px)"));
                button.addEventListener("mouseout", () => (button.style.transform = "translateY(0)"));
            } else {
                button.style.backgroundColor = "#f5f6fb";
                button.style.color = "#0f172a";
            }
            return button;
        };

        const newButton = createActionButton("Add config", true);
        newButton.addEventListener("click", () => this.openConfigDialog());
        actions.appendChild(newButton);

        const editButton = createActionButton("Edit config");
        if (!config) {
            editButton.disabled = true;
            editButton.style.opacity = "0.6";
            editButton.style.cursor = "not-allowed";
        } else {
            editButton.addEventListener("click", () => this.openConfigDialog(config));
        }
        actions.appendChild(editButton);

        const deleteButton = createActionButton("Delete config");
        deleteButton.style.backgroundColor = "#fef3f2";
        deleteButton.style.borderColor = "#f87171";
        deleteButton.style.color = "#b91c1c";
        if (!config) {
            deleteButton.disabled = true;
            deleteButton.style.opacity = "0.6";
            deleteButton.style.cursor = "not-allowed";
        } else {
            deleteButton.addEventListener("click", () => this.deleteConfig(config));
        }
        actions.appendChild(deleteButton);

        sidebar.appendChild(actions);
        return sidebar;
    }

    private createContent(analysis: ScouterAnalysis): HTMLElement {
        const container = document.createElement("div");
        container.style.flexGrow = "1";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "16px";
        container.style.height = "100%";
        container.style.overflow = "hidden";

        if (analysis.statusMessage) {
            const status = this.createStatus(analysis.statusMessage);
            status.style.margin = "0";
            container.appendChild(status);
        }

        container.appendChild(this.createGraphCard(analysis));

        const tablesArea = document.createElement("div");
        tablesArea.style.flexGrow = "1";
        tablesArea.style.overflowY = "auto";
        tablesArea.style.paddingRight = "4px";
        tablesArea.appendChild(this.createTables(analysis));
        container.appendChild(tablesArea);

        return container;
    }

    private createGraphCard(analysis: ScouterAnalysis): HTMLElement {
        const card = document.createElement("div");
        card.style.backgroundColor = "#ffffff";
        card.style.borderRadius = "18px";
        card.style.padding = "20px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "10px";
        card.style.border = "1px solid #e2e8f0";
        card.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";
        card.style.minHeight = "360px";
        card.style.boxSizing = "border-box";

        const summary = document.createElement("div");
        summary.style.display = "flex";
        summary.style.flexDirection = "column";
        summary.style.gap = "4px";

        const averageValue = this.computeAverageDifference(analysis.graphPoints);
        const averageDisplay = averageValue !== undefined ? this.formatValue(averageValue) : "n/a";
        const averageLabel = document.createElement("div");
        averageLabel.innerHTML = `<span style="font-size:20px;font-weight:700;color:#0f172a;">Average per match difference:</span> <span style="font-size:20px;font-weight:700;color:#2563eb;">${averageDisplay}</span>`;
        summary.appendChild(averageLabel);

        const formulaLabel = document.createElement("div");
        formulaLabel.style.fontSize = "12px";
        formulaLabel.style.color = "#475569";
        formulaLabel.style.display = "flex";
        formulaLabel.style.flexWrap = "wrap";
        formulaLabel.style.gap = "8px";

        const scoreFormulaLabel = document.createElement("span");
        scoreFormulaLabel.textContent = `Score: ${analysis.scoreFormulaName ?? "Custom formula"}`;
        scoreFormulaLabel.style.fontWeight = "600";
        formulaLabel.appendChild(scoreFormulaLabel);

        const pointsFormulaLabel = document.createElement("span");
        pointsFormulaLabel.textContent = `Points: ${analysis.pointsFormulaName ?? "Custom formula"}`;
        pointsFormulaLabel.style.fontWeight = "600";
        formulaLabel.appendChild(pointsFormulaLabel);

        const matchCount = document.createElement("span");
        matchCount.textContent = `${analysis.graphPoints.length} matches`;
        formulaLabel.appendChild(matchCount);

        const formulaDescription = document.createElement("span");
        const descriptionParts: string[] = [];
        if (analysis.scoreFormulaDesc) {
            descriptionParts.push(`Score: ${analysis.scoreFormulaDesc}`);
        }
        if (analysis.pointsFormulaDesc) {
            descriptionParts.push(`Points: ${analysis.pointsFormulaDesc}`);
        }
        formulaDescription.textContent = descriptionParts.join(" | ");
        formulaDescription.style.color = "#94a3b8";
        formulaDescription.style.fontSize = "11px";
        formulaDescription.style.marginTop = "4px";
        summary.appendChild(formulaLabel);
        if (descriptionParts.length > 0) {
            summary.appendChild(formulaDescription);
        }

        card.appendChild(summary);

        const subtitle = document.createElement("div");
        subtitle.textContent = "average absolute difference per alliance";
        subtitle.style.fontSize = "12px";
        subtitle.style.letterSpacing = "0.1em";
        subtitle.style.textTransform = "uppercase";
        subtitle.style.color = "#64748b";
        card.appendChild(subtitle);

        card.appendChild(this.createGraphSection(analysis.graphPoints));
        return card;
    }

    private computeAverageDifference(points: GraphPoint[]): number | undefined {
        const values: number[] = [];
        for (const point of points) {
            if (typeof point.red === "number") {
                values.push(point.red);
            }
            if (typeof point.blue === "number") {
                values.push(point.blue);
            }
        }
        if (!values.length) {
            return undefined;
        }
        const total = values.reduce((sum, value) => sum + value, 0);
        return total / values.length;
    }

    private createGraphSection(points: GraphPoint[]): HTMLElement {
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "10px";
        container.style.flexGrow = "1";
        container.style.minHeight = "260px";
        container.style.backgroundColor = "#f8fafc";
        container.style.borderRadius = "14px";
        container.style.padding = "12px";
        container.style.boxSizing = "border-box";

        const legend = document.createElement("div");
        legend.style.display = "flex";
        legend.style.alignItems = "center";
        legend.style.gap = "10px";
        legend.style.fontSize = "12px";
        legend.style.color = "#475569";
        legend.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:#dc2626;display:inline-block;"></span> Red <span style="width:10px;height:10px;border-radius:50%;background:#2563eb;display:inline-block;margin-left:8px;"></span> Blue`;
        container.appendChild(legend);

        const canvas = document.createElement("canvas");
        canvas.style.flexGrow = "1";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.borderRadius = "10px";
        canvas.style.backgroundColor = "#ffffff";
        container.appendChild(canvas);

        this.graphCanvas_ = canvas;
        this.graphPoints_ = points;
        this.requestGraphRender();

        return container;
    }

    private createTables(analysis: ScouterAnalysis): HTMLElement {
        const wrapper = document.createElement("div");
        wrapper.style.display = "grid";
        const tableMinWidth = Math.round(260 * 0.7);
        wrapper.style.gridTemplateColumns = `repeat(auto-fit, minmax(${tableMinWidth}px, 1fr))`;
        wrapper.style.gap = "14px";
        wrapper.style.width = "100%";
        wrapper.style.boxSizing = "border-box";
        wrapper.style.paddingTop = "4px";

        wrapper.appendChild(this.renderTable("Red Alliance", analysis.redRows));
        wrapper.appendChild(this.renderTable("Contributed Variance", analysis.contributions, true));
        wrapper.appendChild(this.renderTable("Blue Alliance", analysis.blueRows));

        return wrapper;
    }

    private renderTable(
        title: string,
        rows: TableEntry[] | ContributionEntry[],
        contributions = false
    ): HTMLElement {
        const container = document.createElement("div");
        container.style.backgroundColor = "#ffffff";
        container.style.borderRadius = "16px";
        container.style.border = "1px solid #e5e7eb";
        container.style.boxShadow = "0 8px 24px rgba(15,23,42,0.08)";
        container.style.overflow = "hidden";
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.boxSizing = "border-box";

        const label = document.createElement("div");
        const headerColors = this.getTableHeaderColors(title);
        label.textContent = title;
        label.style.padding = "10px 14px";
        label.style.fontWeight = "600";
        label.style.fontSize = "13px";
        label.style.textTransform = "uppercase";
        label.style.background = headerColors.background;
        label.style.color = headerColors.text;
        container.appendChild(label);

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.borderSpacing = "0";
        table.style.margin = "0";
        table.style.fontSize = "13px";
        table.style.color = "#0f172a";

        const thead = document.createElement("thead");
        thead.style.backgroundColor = "#f8fafc";
        thead.style.color = "#475569";
        const headerRow = document.createElement("tr");

        const thMatch = document.createElement("th");
        thMatch.textContent = contributions ? "Scouter" : "Match";
        thMatch.style.padding = "10px 12px";
        thMatch.style.textAlign = "left";
        thMatch.style.fontSize = "12px";
        thMatch.style.fontWeight = "600";
        headerRow.appendChild(thMatch);

        const thValue = document.createElement("th");
        thValue.textContent = contributions ? "Matches" : "Value";
        thValue.style.padding = "10px 12px";
        thValue.style.textAlign = "left";
        thValue.style.fontSize = "12px";
        thValue.style.fontWeight = "600";
        headerRow.appendChild(thValue);

        if (contributions) {
            const thContribution = document.createElement("th");
            thContribution.textContent = "Contribution";
            thContribution.style.padding = "10px 12px";
            thContribution.style.textAlign = "left";
            thContribution.style.fontSize = "12px";
            thContribution.style.fontWeight = "600";
            headerRow.appendChild(thContribution);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        if (rows.length === 0) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = contributions ? 3 : 2;
            emptyCell.textContent = "No data";
            emptyCell.style.textAlign = "center";
            emptyCell.style.padding = "16px 12px";
            emptyCell.style.color = "#94a3b8";
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
        } else {
            for (const row of rows) {
                const tr = document.createElement("tr");
                tr.style.borderTop = "1px solid #f1f5f9";

                const tdLabel = document.createElement("td");
                tdLabel.textContent = contributions
                    ? (row as ContributionEntry).name
                    : (row as TableEntry).matchLabel;
                tdLabel.style.padding = "10px 12px";
                tdLabel.style.fontSize = "13px";
                tdLabel.style.color = "#0f172a";
                tr.appendChild(tdLabel);

                const tdCount = document.createElement("td");
                tdCount.textContent = contributions
                    ? String((row as ContributionEntry).matches)
                    : this.formatValue((row as TableEntry).value);
                tdCount.style.padding = "10px 12px";
                tdCount.style.fontSize = "13px";
                tr.appendChild(tdCount);

                if (contributions) {
                    const tdContribution = document.createElement("td");
                    const value = (row as ContributionEntry).contribution;
                    tdContribution.textContent =
                        value === undefined || Number.isNaN(value)
                            ? "n/a"
                            : this.formatValue(value);
                    tdContribution.style.padding = "10px 12px";
                    tdContribution.style.fontSize = "13px";
                    tr.appendChild(tdContribution);
                }

                tbody.appendChild(tr);
            }
        }

        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    private getTableHeaderColors(title: string): { background: string; text: string } {
        const normalized = title.toLowerCase();
        if (normalized.includes("red")) {
            return { background: "#dc2626", text: "#ffffff" };
        }
        if (normalized.includes("blue")) {
            return { background: "#2563eb", text: "#ffffff" };
        }
        if (normalized.includes("contributed")) {
            return { background: "#7c3aed", text: "#ffffff" };
        }
        return { background: "#475569", text: "#ffffff" };
    }

    private buildAnalysis(config: ScouterConfig): ScouterAnalysis {
        const resolved = this.resolveFormulas(config);
        const missingParts: string[] = [];
        if (!resolved.scoreExpression) {
            missingParts.push("score formula");
        }
        if (!resolved.pointsExpression) {
            missingParts.push("points formula");
        }
        if (missingParts.length) {
            const conjunction = missingParts.join(" and ");
            return {
                graphPoints: [],
                redRows: [],
                blueRows: [],
                contributions: [],
                statusMessage: `The ${conjunction} ${missingParts.length === 1 ? "is" : "are"} required to compute differences.`,
            };
        }

        const scoreExpr = Expr.parse(resolved.scoreExpression!);
        if (scoreExpr.hasError()) {
            return {
                graphPoints: [],
                redRows: [],
                blueRows: [],
                contributions: [],
                statusMessage: `Score formula error: ${scoreExpr.getErrorMessage()}`,
            };
        }

        const pointsExpr = Expr.parse(resolved.pointsExpression!);
        if (pointsExpr.hasError()) {
            return {
                graphPoints: [],
                redRows: [],
                blueRows: [],
                contributions: [],
                statusMessage: `Points formula error: ${pointsExpr.getErrorMessage()}`,
            };
        }

        const buckets = new Map<
            string,
            {
                label: string;
                order: number;
                alliance: "red" | "blue";
                matchKey: string;
                scoreSum: number;
                scoreCount: number;
                pointsSum: number;
                pointsCount: number;
                scouters: string[];
            }
        >();
        const scouterMatches = new Map<string, Set<string>>();

        for (const rawRow of this.rows_) {
            const row = rawRow || {};
            const alliance = this.getString(row["alliance"])?.toLowerCase();
            const compLevel = this.getString(row["comp_level"])?.toLowerCase() ?? "unknown";
            const setNumber = this.getNumber(row["set_number"]) || 0;
            const matchNumber = this.getNumber(row["match_number"]) || 0;
            if (alliance !== "red" && alliance !== "blue") {
                continue;
            }

            const teamRow = this.findTeamRowForMatch(row);
            const scoreValue = this.evaluateRow(row, scoreExpr, teamRow);
            const pointsValue = this.evaluateRow(row, pointsExpr, teamRow);
            if (scoreValue === undefined && pointsValue === undefined) {
                continue;
            }

            const matchKey =
                this.getString(row["key"]) ?? `${compLevel}|${setNumber}|${matchNumber}`;
            const bucketKey = `${matchKey}|${alliance}`;
            const label = this.formatMatchLabel(compLevel, setNumber, matchNumber);
            const order = this.computeOrder(compLevel, setNumber, matchNumber);

            const bucket =
                buckets.get(bucketKey) ||
                {
                    label,
                    order,
                    alliance,
                    matchKey,
                    scoreSum: 0,
                    scoreCount: 0,
                    pointsSum: 0,
                    pointsCount: 0,
                    scouters: [],
                };
            if (typeof scoreValue === "number" && !Number.isNaN(scoreValue)) {
                bucket.scoreSum += scoreValue;
                bucket.scoreCount++;
            }
            if (typeof pointsValue === "number" && !Number.isNaN(pointsValue)) {
                bucket.pointsSum += pointsValue;
                bucket.pointsCount++;
            }

            const scouterName = this.getScouterName(row[config.scouterColumn]);
            if (scouterName) {
                bucket.scouters.push(scouterName);
                if (!scouterMatches.has(scouterName)) {
                    scouterMatches.set(scouterName, new Set());
                }
                scouterMatches.get(scouterName)!.add(matchKey);
            }

            buckets.set(bucketKey, bucket);
        }

        const matchMap = new Map<string, GraphPoint>();
        const equations: { coefficients: number[]; value: number }[] = [];
        const uniqueScouters = Array.from(scouterMatches.keys());
        const varIndices = new Map<string, number>();
        uniqueScouters.forEach((name, idx) => varIndices.set(name, idx));

        for (const bucket of buckets.values()) {
            const scoreAvg = bucket.scoreCount > 0 ? bucket.scoreSum / bucket.scoreCount : undefined;
            const pointsAvg = bucket.pointsCount > 0 ? bucket.pointsSum / bucket.pointsCount : undefined;
            if (scoreAvg === undefined || pointsAvg === undefined) {
                continue;
            }
            const difference = Math.abs(scoreAvg - pointsAvg);

            const entry =
                matchMap.get(bucket.matchKey) ||
                ({
                    label: bucket.label,
                    order: bucket.order,
                    red: undefined,
                    blue: undefined,
                } as GraphPoint);
            entry[bucket.alliance] = (entry[bucket.alliance] ?? 0) + difference;
            matchMap.set(bucket.matchKey, entry);

            if (bucket.scouters.length === 0) {
                continue;
            }

            const coeffs = new Array(uniqueScouters.length).fill(0);
            for (const scouter of bucket.scouters) {
                const index = varIndices.get(scouter);
                if (index !== undefined) {
                    coeffs[index] += 1;
                }
            }
            equations.push({
                coefficients: coeffs,
                value: difference,
            });
        }

        const graphPoints = Array.from(matchMap.values()).sort((a, b) => a.order - b.order);

        const contributions = this.solveContributions(uniqueScouters, equations, scouterMatches);

        let statusMessage: string | undefined;
        if (uniqueScouters.length === 0) {
            statusMessage = "No scouter initials were found for the selected column.";
        } else if (equations.length === 0) {
            statusMessage = "Scouter initials were found but no difference values have been recorded yet.";
        }

        return {
            graphPoints,
            redRows: graphPoints
                .filter((pt) => typeof pt.red === "number")
                .map((pt) => ({ matchLabel: pt.label, value: pt.red! })),
            blueRows: graphPoints
                .filter((pt) => typeof pt.blue === "number")
                .map((pt) => ({ matchLabel: pt.label, value: pt.blue! })),
            contributions,
            scoreFormulaName: resolved.scoreFormula?.name,
            scoreFormulaDesc: resolved.scoreFormula?.desc,
            pointsFormulaName: resolved.pointsFormula?.name,
            pointsFormulaDesc: resolved.pointsFormula?.desc,
            statusMessage,
        };
    }

    private solveContributions(
        scouters: string[],
        equations: { coefficients: number[]; value: number }[],
        matchMap: Map<string, Set<string>>
    ): ContributionEntry[] {
        if (scouters.length === 0) {
            return [];
        }

        const m = scouters.length;
        const AtA = Array.from({ length: m }, () => new Array<number>(m).fill(0));
        const Atb = new Array<number>(m).fill(0);

        for (const eq of equations) {
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    AtA[i][j] += eq.coefficients[i] * eq.coefficients[j];
                }
                Atb[i] += eq.coefficients[i] * eq.value;
            }
        }

        const solution = this.solveLinearSystem(AtA, Atb);
        return scouters.map((name, idx) => ({
            name,
            matches: matchMap.get(name)?.size ?? 0,
            contribution: solution ? solution[idx] : undefined,
        }));
    }

    private solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
        const n = matrix.length;
        if (n === 0) {
            return [];
        }

        const augmented = matrix.map((row, idx) => [...row, vector[idx]]);

        for (let i = 0; i < n; i++) {
            let pivot = i;
            for (let r = i + 1; r < n; r++) {
                if (Math.abs(augmented[r][i]) > Math.abs(augmented[pivot][i])) {
                    pivot = r;
                }
            }
            if (Math.abs(augmented[pivot][i]) < 1e-9) {
                return null;
            }
            if (pivot !== i) {
                const temp = augmented[i];
                augmented[i] = augmented[pivot];
                augmented[pivot] = temp;
            }

            const divisor = augmented[i][i];
            for (let col = i; col <= n; col++) {
                augmented[i][col] /= divisor;
            }

            for (let row = 0; row < n; row++) {
                if (row === i) {
                    continue;
                }
                const factor = augmented[row][i];
                for (let col = i; col <= n; col++) {
                    augmented[row][col] -= factor * augmented[i][col];
                }
            }
        }

        return augmented.map((row) => row[n]);
    }

    private requestGraphRender() {
        if (!this.graphCanvas_) {
            return;
        }
        if (this.graphRenderPending_) {
            return;
        }
        this.graphRenderPending_ = true;
        window.requestAnimationFrame(() => {
            this.graphRenderPending_ = false;
            if (this.graphCanvas_) {
                const width = this.graphCanvas_.parentElement?.clientWidth ?? 600;
                this.graphCanvas_.width = Math.max(width - 20, 400);
                this.graphCanvas_.height = 260;
                this.drawGraph(this.graphCanvas_, this.graphPoints_);
            }
        });
    }

    private drawGraph(canvas: HTMLCanvasElement, points: GraphPoint[]) {
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!points.length) {
            ctx.fillStyle = "#475569";
            ctx.font = "16px sans-serif";
            ctx.fillText("No data to display", canvas.width / 2 - 60, canvas.height / 2);
            return;
        }

        const values: number[] = [];
        points.forEach((pt) => {
            if (typeof pt.red === "number") {
                values.push(pt.red);
            }
            if (typeof pt.blue === "number") {
                values.push(pt.blue);
            }
        });

        if (!values.length) {
            ctx.fillStyle = "#475569";
            ctx.font = "16px sans-serif";
            ctx.fillText("No numeric values yet", canvas.width / 2 - 70, canvas.height / 2);
            return;
        }

        const padding = 32;
        const xSpan = Math.max(points.length - 1, 1);
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = Math.max(1, maxValue - minValue);

        const valueToY = (value: number) =>
            canvas.height - padding - ((value - minValue) / range) * height;

        ctx.lineWidth = 1;
        ctx.strokeStyle = "#94a3b8";
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();

        const drawLine = (color: string, accessor: (pt: GraphPoint) => number | undefined) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            let started = false;
            points.forEach((pt, index) => {
                const value = accessor(pt);
                if (typeof value === "number") {
                    const x = padding + (index / xSpan) * width;
                    const y = valueToY(value);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    started = false;
                }
            });
            ctx.stroke();
        };

        drawLine("#dc2626", (pt) => pt.red);
        drawLine("#2563eb", (pt) => pt.blue);

        ctx.fillStyle = "#475569";
        ctx.font = "12px sans-serif";
        points.forEach((pt, index) => {
            const x = padding + (index / xSpan) * width;
            ctx.fillText(pt.label, x - 12, canvas.height - padding + 18);
        });
    }

    private openConfigDialog(existing?: ScouterConfig) {
        const backdrop = document.createElement("div");
        backdrop.className = "scouter-accuracy-dialog-backdrop";

        const dialog = document.createElement("div");
        dialog.className = "scouter-accuracy-dialog";

        const title = document.createElement("div");
        title.className = "scouter-accuracy-dialog-title";
        title.textContent = existing ? "Edit Config" : "New Config";
        dialog.appendChild(title);

        const nameInput = this.createDialogField("Name", existing?.name ?? "");
        dialog.appendChild(nameInput.wrapper);

        const columnSelect = document.createElement("select");
        const columnWrapper = document.createElement("div");
        columnWrapper.className = "scouter-accuracy-dialog-field";
        const columnLabel = document.createElement("label");
        columnLabel.textContent = "Scouter Initials Column";
        columnWrapper.appendChild(columnLabel);
        columnSelect.className = "scouter-accuracy-dialog-input";
        for (const desc of this.columns_) {
            const option = document.createElement("option");
            option.value = desc.name;
            option.textContent = desc.name;
            columnSelect.appendChild(option);
        }
        columnSelect.value = existing?.scouterColumn ?? this.columns_[0]?.name ?? "";
        columnWrapper.appendChild(columnSelect);
        dialog.appendChild(columnWrapper);

        const scoreFormulaField = this.createFormulaSelectionField(
            "Alliance score formula",
            existing?.scoreFormulaName ?? existing?.formulaName,
            existing?.scoreFormula ?? existing?.varianceFormula
        );
        dialog.appendChild(scoreFormulaField.wrapper);

        const pointsFormulaField = this.createFormulaSelectionField(
            "Alliance points formula",
            existing?.pointsFormulaName ?? existing?.formulaName,
            existing?.pointsFormula ?? existing?.varianceFormula
        );
        dialog.appendChild(pointsFormulaField.wrapper);

        const errorMessage = document.createElement("div");
        errorMessage.className = "scouter-accuracy-dialog-error";
        dialog.appendChild(errorMessage);

        const actions = document.createElement("div");
        actions.className = "scouter-accuracy-dialog-actions";
        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        cancelButton.className = "scouter-accuracy-dialog-button secondary";
        cancelButton.addEventListener("click", () => backdrop.remove());
        actions.appendChild(cancelButton);

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.textContent = "Save";
        saveButton.className = "scouter-accuracy-dialog-button";
        saveButton.addEventListener("click", () => {
            const name = (nameInput.input as HTMLInputElement).value.trim();
            const column = columnSelect.value;
            const scoreFormulaName = (scoreFormulaField.select as HTMLSelectElement).value;
            const pointsFormulaName = (pointsFormulaField.select as HTMLSelectElement).value;
            const scoreFormula = this.formulas_.find((formula) => formula.name === scoreFormulaName);
            const pointsFormula = this.formulas_.find((formula) => formula.name === pointsFormulaName);
            if (!name) {
                errorMessage.textContent = "Name is required.";
                return;
            }
            if (!column) {
                errorMessage.textContent = "Select a column.";
                return;
            }
            if (!scoreFormula) {
                errorMessage.textContent = "Select a score formula.";
                return;
            }
            if (!pointsFormula) {
                errorMessage.textContent = "Select a points formula.";
                return;
            }

            const scoreParsed = Expr.parse(scoreFormula.formula);
            if (scoreParsed.hasError()) {
                errorMessage.textContent = `Score formula error: ${scoreParsed.getErrorMessage()}`;
                return;
            }

            const pointsParsed = Expr.parse(pointsFormula.formula);
            if (pointsParsed.hasError()) {
                errorMessage.textContent = `Points formula error: ${pointsParsed.getErrorMessage()}`;
                return;
            }

            const config: ScouterConfig = existing
                ? {
                      ...existing,
                      name,
                      scouterColumn: column,
                      scoreFormulaName: scoreFormula.name,
                      scoreFormula: scoreFormula.formula,
                      pointsFormulaName: pointsFormula.name,
                      pointsFormula: pointsFormula.formula,
                      formulaName: scoreFormula.name,
                      varianceFormula: scoreFormula.formula,
                  }
                : {
                      id:
                          typeof crypto !== "undefined" && "randomUUID" in crypto
                              ? (crypto as Crypto).randomUUID()
                              : String(Date.now()),
                      name,
                      scouterColumn: column,
                      scoreFormulaName: scoreFormula.name,
                      scoreFormula: scoreFormula.formula,
                      pointsFormulaName: pointsFormula.name,
                      pointsFormula: pointsFormula.formula,
                      formulaName: scoreFormula.name,
                      varianceFormula: scoreFormula.formula,
                  };

            if (existing) {
                this.configs_ = this.configs_.map((cfg) => (cfg.id === config.id ? config : cfg));
            } else {
                this.configs_ = [...this.configs_, config];
            }
            this.selectedConfigId_ = config.id;
            this.saveConfigs();
            backdrop.remove();
            this.render();
        });
        actions.appendChild(saveButton);
        dialog.appendChild(actions);

        backdrop.appendChild(dialog);
        this.elem.appendChild(backdrop);
    }

    private createDialogField(labelText: string, value: string) {
        const wrapper = document.createElement("div");
        wrapper.className = "scouter-accuracy-dialog-field";

        const label = document.createElement("label");
        label.textContent = labelText;
        wrapper.appendChild(label);

        const input = document.createElement("input");
        input.className = "scouter-accuracy-dialog-input";
        input.type = "text";
        (input as HTMLInputElement).value = value;
        wrapper.appendChild(input);

        return { wrapper, input };
    }

    private createFormulaSelectionField(
        labelText: string,
        selectedName?: string,
        expression?: string
    ) {
        const wrapper = document.createElement("div");
        wrapper.className = "scouter-accuracy-dialog-field";

        const label = document.createElement("label");
        label.textContent = labelText;
        wrapper.appendChild(label);

        const select = document.createElement("select");
        select.className = "scouter-accuracy-dialog-input";
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "-- select formula --";
        placeholderOption.disabled = true;
        select.appendChild(placeholderOption);

        for (const formula of this.formulas_) {
            const option = document.createElement("option");
            option.value = formula.name;
            option.textContent = formula.name;
            select.appendChild(option);
        }

        let initialValue: string | undefined;
        if (selectedName && this.formulas_.some((formula) => formula.name === selectedName)) {
            initialValue = selectedName;
        } else if (expression) {
            const matched = this.formulas_.find((formula) => formula.formula === expression);
            if (matched) {
                initialValue = matched.name;
            }
        }
        if (!initialValue && this.formulas_.length) {
            initialValue = this.formulas_[0].name;
        }
        if (initialValue) {
            select.value = initialValue;
        }
        wrapper.appendChild(select);

        const preview = document.createElement("div");
        preview.className = "scouter-accuracy-dialog-formula-preview";
        preview.style.fontFamily = "monospace";
        preview.style.fontSize = "12px";
        preview.style.backgroundColor = "#f4f4f4";
        preview.style.border = "1px solid #d1d5db";
        preview.style.borderRadius = "4px";
        preview.style.padding = "6px";
        preview.style.marginTop = "6px";
        wrapper.appendChild(preview);

        const description = document.createElement("div");
        description.className = "scouter-accuracy-dialog-formula-description";
        description.style.fontSize = "12px";
        description.style.color = "#475569";
        description.style.marginTop = "4px";
        wrapper.appendChild(description);

        const refreshPreview = () => {
            const selected = this.formulas_.find((formula) => formula.name === select.value);
            preview.textContent = selected ? selected.formula : "";
            description.textContent = selected?.desc ?? "";
        };

        select.addEventListener("change", refreshPreview);
        refreshPreview();

        return { wrapper, select, preview, description };
    }

    private evaluateRow(
        row: Record<string, IPCTypedDataValue>,
        expr: Expr,
        teamRow?: Record<string, IPCTypedDataValue>
    ): number | undefined {
        const variables = new Map<string, IPCTypedDataValue>();
        this.assignRowVariables(row, variables);
        if (teamRow) {
            this.assignRowVariables(teamRow, variables, true);
        }
        const evaluated = expr.evaluate(variables);
        if (DataValue.isInteger(evaluated) || DataValue.isReal(evaluated)) {
            return DataValue.toReal(evaluated);
        }
        if (DataValue.isBoolean(evaluated)) {
            return evaluated.value ? 1 : 0;
        }
        return undefined;
    }

    private assignRowVariables(
        row: Record<string, IPCTypedDataValue>,
        variables: Map<string, IPCTypedDataValue>,
        skipExisting = false
    ) {
        for (const [key, raw] of Object.entries(row)) {
            if (!key) {
                continue;
            }
            if (skipExisting && variables.has(key)) {
                continue;
            }
            const typed = this.toTypedValue(raw);
            if (typed) {
                variables.set(key, typed);
            }
        }
    }

    private findTeamRowForMatch(row: Record<string, IPCTypedDataValue>): Record<string, IPCTypedDataValue> | undefined {
        const teamKey = this.getString(row["team_key"]) ?? this.getString(row["key"]);
        if (teamKey) {
            const match = this.teamRowByKey_.get(teamKey);
            if (match) {
                return match;
            }
        }

        const teamNumber = this.getNumber(row["team_number"]);
        if (typeof teamNumber === "number" && !Number.isNaN(teamNumber)) {
            const match = this.teamRowByNumber_.get(Math.trunc(teamNumber));
            if (match) {
                return match;
            }
        }

        return undefined;
    }

    private toTypedValue(value: any): IPCTypedDataValue | undefined {
        if (value && typeof value === "object" && "type" in value && "value" in value) {
            return value as IPCTypedDataValue;
        }
        if (typeof value === "number") {
            return Number.isInteger(value) ? DataValue.fromInteger(value) : DataValue.fromReal(value);
        }
        if (typeof value === "boolean") {
            return DataValue.fromBoolean(value);
        }
        if (typeof value === "string") {
            return DataValue.fromString(value);
        }
        if (value === null) {
            return DataValue.fromNull();
        }
        return undefined;
    }

    private getString(value: IPCTypedDataValue | undefined): string | undefined {
        if (!value) {
            return undefined;
        }
        if (DataValue.isString(value)) {
            return DataValue.toString(value);
        }
        if (DataValue.isInteger(value)) {
            return String(DataValue.toInteger(value));
        }
        if (DataValue.isReal(value)) {
            return String(DataValue.toReal(value));
        }
        if (DataValue.isBoolean(value)) {
            return String(DataValue.toBoolean(value));
        }
        return DataValue.toDisplayString(value);
    }

    private getNumber(value: IPCTypedDataValue | undefined): number | undefined {
        if (!value) {
            return undefined;
        }
        if (DataValue.isInteger(value) || DataValue.isReal(value)) {
            return DataValue.toReal(value);
        }
        return undefined;
    }

    private getScouterName(value: IPCTypedDataValue | undefined): string | undefined {
        const text = this.getString(value);
        if (!text) {
            return undefined;
        }
        const trimmed = text.trim();
        if (!trimmed || trimmed.toLowerCase() === "null") {
            return undefined;
        }
        return trimmed;
    }

    private formatMatchLabel(compLevel: string, setNumber: number, matchNumber: number): string {
        const level = compLevel.toUpperCase();
        const parts = [level];
        if (setNumber > 0) {
            parts.push(`S${setNumber}`);
        }
        parts.push(`M${matchNumber}`);
        return parts.join(" ");
    }

    private computeOrder(compLevel: string, setNumber: number, matchNumber: number): number {
        const weights: Record<string, number> = {
            qm: 0,
            qf: 100,
            sf: 200,
            f: 300,
        };
        const levelWeight = weights[compLevel] ?? 500;
        return levelWeight * 1000 + setNumber * 100 + matchNumber;
    }

    private formatValue(value: number): string {
        if (Number.isInteger(value)) {
            return value.toString();
        }
        return value.toFixed(2);
    }

    private resolveFormulas(config: ScouterConfig): {
        scoreExpression?: string;
        scoreFormula?: IPCFormula;
        pointsExpression?: string;
        pointsFormula?: IPCFormula;
    } {
        const score = this.resolveFormulaDescriptor(config.scoreFormulaName, config.scoreFormula);
        if (score.formula) {
            config.scoreFormulaName = score.formula.name;
            config.scoreFormula = score.formula.formula;
        } else if (score.expression) {
            config.scoreFormula = score.expression;
        }

        const points = this.resolveFormulaDescriptor(config.pointsFormulaName, config.pointsFormula);
        if (points.formula) {
            config.pointsFormulaName = points.formula.name;
            config.pointsFormula = points.formula.formula;
        } else if (points.expression) {
            config.pointsFormula = points.expression;
        }

        return {
            scoreExpression: score.expression,
            scoreFormula: score.formula,
            pointsExpression: points.expression,
            pointsFormula: points.formula,
        };
    }

    private resolveFormulaDescriptor(
        name?: string,
        expression?: string
    ): { expression?: string; formula?: IPCFormula } {
        if (name) {
            const matched = this.formulas_.find((formula) => formula.name === name);
            if (matched) {
                return { expression: matched.formula, formula: matched };
            }
        }
        if (expression) {
            const matched = this.formulas_.find((formula) => formula.formula === expression);
            if (matched) {
                return { expression: matched.formula, formula: matched };
            }
            return { expression };
        }
        return {};
    }

    private onWindowResize() {
        this.requestGraphRender();
    }
}
