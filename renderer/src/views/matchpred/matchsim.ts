import { XeroApp } from "../../apps/xeroapp.js";
import { IPCFormula, IPCMatchInfo, IPCMatchPredictorData, IPCPredictConfig } from "../../shared/ipc.js";
import { XeroView } from "../xeroview.js";

type MatchSimConfig = IPCPredictConfig & {
    matchsim_mode: 'matchsim';
    matchsim_auto_formula: string;
    matchsim_teleop_formula: string;
    matchsim_endgame_formula: string;
    matchsim_average_formula: string;
};

export class XeroMatchSimView extends XeroView {
    private configs_: MatchSimConfig[] = [];
    private formulas_: string[] = [];
    private matches_: IPCMatchInfo[] = [];

    private configs_received_: boolean = false;
    private formulas_received_: boolean = false;
    private matches_received_: boolean = false;

    private selected_config_index_: number = -1;

    private config_list_!: HTMLDivElement;
    private match_select_!: HTMLSelectElement;
    private config_name_!: HTMLInputElement;
    private auto_select_!: HTMLSelectElement;
    private teleop_select_!: HTMLSelectElement;
    private endgame_select_!: HTMLSelectElement;
    private average_select_!: HTMLSelectElement;
    private results_div_!: HTMLDivElement;

    private pending_predictor_?: {
        resolve: (data: IPCMatchPredictorData) => void;
        reject: (err: Error) => void;
        timer: any;
    };

    constructor(app: XeroApp) {
        super(app, 'xero-single-team-view');

        this.elem.style.width = '100%';
        this.elem.style.height = '100%';
        this.elem.style.display = 'flex';
        this.elem.style.flexDirection = 'column';

        this.registerCallback('send-matchsim-configs', this.receivedConfigs.bind(this));
        this.registerCallback('send-formulas', this.receivedFormulas.bind(this));
        this.registerCallback('send-match-data', this.receivedMatches.bind(this));
        this.registerCallback('send-match-predictor-data', this.receivedPredictorData.bind(this));

        this.request('get-matchsim-configs');
        this.request('get-formulas');
        this.request('get-match-data');
    }

    private checkAll(): void {
        if (this.configs_received_ && this.formulas_received_ && this.matches_received_) {
            this.createUI();
            this.renderConfigList();
            this.refreshEditorsFromConfig();
        }
    }

    private receivedConfigs(configs: IPCPredictConfig[]): void {
        const incoming = Array.isArray(configs) ? configs : [];
        this.configs_ = incoming.map((c: any) => this.normalizeConfig(c));

        if (this.configs_.length === 0) {
            this.configs_.push(this.makeDefaultConfig('Default MatchSim'));
            this.selected_config_index_ = 0;
        } else if (this.selected_config_index_ < 0 || this.selected_config_index_ >= this.configs_.length) {
            this.selected_config_index_ = 0;
        }

        this.configs_received_ = true;
        this.checkAll();
    }

    private receivedFormulas(formulas: IPCFormula[]): void {
        this.formulas_ = formulas.map(f => f.name).sort();
        this.formulas_received_ = true;
        this.checkAll();
    }

    private receivedMatches(matches: IPCMatchInfo[]): void {
        const order: Record<string, number> = { qm: 1, sf: 2, f: 3 };
        this.matches_ = [...matches].sort((a, b) => {
            const o1 = order[a.comp_level] ?? 999;
            const o2 = order[b.comp_level] ?? 999;
            if (o1 !== o2) {
                return o1 - o2;
            }
            if (a.set_number !== b.set_number) {
                return a.set_number - b.set_number;
            }
            return a.match_number - b.match_number;
        });
        this.matches_received_ = true;
        this.checkAll();
    }

    private createUI(): void {
        this.reset();

        const main = document.createElement('div');
        main.style.display = 'flex';
        main.style.height = '100%';
        main.style.width = '100%';

        const leftPanel = document.createElement('div');
        leftPanel.style.width = '280px';
        leftPanel.style.borderRight = '1px solid #d0d7de';
        leftPanel.style.padding = '10px';
        leftPanel.style.display = 'flex';
        leftPanel.style.flexDirection = 'column';
        leftPanel.style.gap = '8px';

        const title = document.createElement('h3');
        title.textContent = 'MatchSim Configs';
        title.style.margin = '0 0 4px 0';
        leftPanel.appendChild(title);

        this.config_list_ = document.createElement('div');
        this.config_list_.style.flex = '1';
        this.config_list_.style.overflowY = 'auto';
        this.config_list_.style.border = '1px solid #e5e7eb';
        this.config_list_.style.padding = '6px';
        leftPanel.appendChild(this.config_list_);

        const actions = document.createElement('div');
        actions.style.display = 'grid';
        actions.style.gridTemplateColumns = '1fr 1fr 1fr';
        actions.style.gap = '6px';

        actions.appendChild(this.makeButton('Add', () => this.addConfig()));
        actions.appendChild(this.makeButton('Delete', () => this.deleteConfig()));
        actions.appendChild(this.makeButton('Save', () => this.saveConfigs()));
        leftPanel.appendChild(actions);

        const rightPanel = document.createElement('div');
        rightPanel.style.flex = '1';
        rightPanel.style.padding = '12px';
        rightPanel.style.display = 'flex';
        rightPanel.style.flexDirection = 'column';
        rightPanel.style.gap = '10px';

        const controls = document.createElement('div');
        controls.style.display = 'grid';
        controls.style.gridTemplateColumns = '180px 1fr';
        controls.style.gap = '8px 10px';
        controls.style.alignItems = 'center';

        this.match_select_ = document.createElement('select');
        this.populateMatchSelect();

        this.config_name_ = document.createElement('input');
        this.config_name_.type = 'text';
        this.config_name_.addEventListener('change', () => {
            const cfg = this.getSelectedConfig();
            if (!cfg) {
                return;
            }
            cfg.name = this.config_name_.value.trim() || cfg.name;
            this.renderConfigList();
        });

        this.auto_select_ = document.createElement('select');
        this.teleop_select_ = document.createElement('select');
        this.endgame_select_ = document.createElement('select');
        this.average_select_ = document.createElement('select');
        this.populateFormulaSelect(this.auto_select_);
        this.populateFormulaSelect(this.teleop_select_);
        this.populateFormulaSelect(this.endgame_select_);
        this.populateFormulaSelect(this.average_select_);

        this.auto_select_.addEventListener('change', () => this.updateConfigFromEditors());
        this.teleop_select_.addEventListener('change', () => this.updateConfigFromEditors());
        this.endgame_select_.addEventListener('change', () => this.updateConfigFromEditors());
        this.average_select_.addEventListener('change', () => this.updateConfigFromEditors());

        controls.appendChild(this.makeLabel('Match'));
        controls.appendChild(this.match_select_);
        controls.appendChild(this.makeLabel('Config Name'));
        controls.appendChild(this.config_name_);
        controls.appendChild(this.makeLabel('Auto Formula'));
        controls.appendChild(this.auto_select_);
        controls.appendChild(this.makeLabel('Teleop Formula'));
        controls.appendChild(this.teleop_select_);
        controls.appendChild(this.makeLabel('Endgame Formula'));
        controls.appendChild(this.endgame_select_);
        controls.appendChild(this.makeLabel('Average Formula'));
        controls.appendChild(this.average_select_);
        rightPanel.appendChild(controls);

        const runBtn = this.makeButton('Run MatchSim', () => {
            this.runSimulation().catch((err: Error) => {
                this.renderError(err.message);
            });
        });
        runBtn.style.width = '160px';
        rightPanel.appendChild(runBtn);

        this.results_div_ = document.createElement('div');
        this.results_div_.style.flex = '1';
        this.results_div_.style.overflow = 'auto';
        this.results_div_.style.borderTop = '1px solid #e5e7eb';
        this.results_div_.style.paddingTop = '10px';
        rightPanel.appendChild(this.results_div_);

        main.appendChild(leftPanel);
        main.appendChild(rightPanel);
        this.elem.appendChild(main);
    }

    private makeLabel(text: string): HTMLLabelElement {
        const label = document.createElement('label');
        label.textContent = text;
        label.style.fontWeight = '600';
        label.style.fontSize = '13px';
        return label;
    }

    private makeButton(text: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '6px 8px';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', onClick);
        return btn;
    }

    private populateMatchSelect(): void {
        this.match_select_.innerHTML = '';
        const def = document.createElement('option');
        def.value = '';
        def.textContent = '-- Select Match --';
        this.match_select_.appendChild(def);

        for (const m of this.matches_) {
            const v = `${m.comp_level}-${m.match_number}-${m.set_number}`;
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            this.match_select_.appendChild(opt);
        }
    }

    private populateFormulaSelect(sel: HTMLSelectElement): void {
        sel.innerHTML = '';
        const def = document.createElement('option');
        def.value = '';
        def.textContent = '-- Select Formula --';
        sel.appendChild(def);

        for (const f of this.formulas_) {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            sel.appendChild(opt);
        }
    }

    private makeDefaultConfig(name: string): MatchSimConfig {
        return {
            k: -5 / 8,
            name,
            xlabel: '',
            yleft: '',
            yright: '',
            title: '',
            type: 'bar',
            teams: [],
            leftitems: [],
            rightitems: [],
            owner: this.app.appType,
            matchsim_mode: 'matchsim',
            matchsim_auto_formula: '',
            matchsim_teleop_formula: '',
            matchsim_endgame_formula: '',
            matchsim_average_formula: ''
        };
    }

    private normalizeConfig(cfg: any): MatchSimConfig {
        const base = this.makeDefaultConfig(cfg?.name ?? 'MatchSim Config');
        return {
            ...base,
            ...cfg,
            matchsim_mode: 'matchsim',
            matchsim_auto_formula: cfg?.matchsim_auto_formula ?? '',
            matchsim_teleop_formula: cfg?.matchsim_teleop_formula ?? '',
            matchsim_endgame_formula: cfg?.matchsim_endgame_formula ?? '',
            matchsim_average_formula: cfg?.matchsim_average_formula ?? ''
        };
    }

    private renderConfigList(): void {
        if (!this.config_list_) {
            return;
        }
        this.config_list_.innerHTML = '';

        for (let i = 0; i < this.configs_.length; i++) {
            const cfg = this.configs_[i];
            const item = document.createElement('div');
            item.style.padding = '6px';
            item.style.marginBottom = '4px';
            item.style.border = '1px solid #e5e7eb';
            item.style.cursor = 'pointer';
            item.style.background = i === this.selected_config_index_ ? '#dbeafe' : '#fff';
            item.textContent = cfg.name;
            item.addEventListener('click', () => {
                this.selected_config_index_ = i;
                this.renderConfigList();
                this.refreshEditorsFromConfig();
            });
            this.config_list_.appendChild(item);
        }
    }

    private getSelectedConfig(): MatchSimConfig | undefined {
        if (this.selected_config_index_ < 0 || this.selected_config_index_ >= this.configs_.length) {
            return undefined;
        }
        return this.configs_[this.selected_config_index_];
    }

    private refreshEditorsFromConfig(): void {
        const cfg = this.getSelectedConfig();
        if (!cfg) {
            return;
        }

        this.config_name_.value = cfg.name;
        this.auto_select_.value = cfg.matchsim_auto_formula;
        this.teleop_select_.value = cfg.matchsim_teleop_formula;
        this.endgame_select_.value = cfg.matchsim_endgame_formula;
        this.average_select_.value = cfg.matchsim_average_formula;
    }

    private updateConfigFromEditors(): void {
        const cfg = this.getSelectedConfig();
        if (!cfg) {
            return;
        }

        cfg.matchsim_auto_formula = this.auto_select_.value;
        cfg.matchsim_teleop_formula = this.teleop_select_.value;
        cfg.matchsim_endgame_formula = this.endgame_select_.value;
        cfg.matchsim_average_formula = this.average_select_.value;
    }

    private addConfig(): void {
        const name = `MatchSim ${this.configs_.length + 1}`;
        this.configs_.push(this.makeDefaultConfig(name));
        this.selected_config_index_ = this.configs_.length - 1;
        this.renderConfigList();
        this.refreshEditorsFromConfig();
    }

    private deleteConfig(): void {
        if (this.selected_config_index_ < 0 || this.configs_.length === 0) {
            return;
        }

        this.configs_.splice(this.selected_config_index_, 1);
        if (this.configs_.length === 0) {
            this.configs_.push(this.makeDefaultConfig('Default MatchSim'));
            this.selected_config_index_ = 0;
        } else {
            this.selected_config_index_ = Math.max(0, Math.min(this.selected_config_index_, this.configs_.length - 1));
        }

        this.renderConfigList();
        this.refreshEditorsFromConfig();
    }

    private saveConfigs(): void {
        this.updateConfigFromEditors();
        this.request('update-matchsim-configs', this.configs_);
    }

    private getSelectedMatch(): IPCMatchInfo | undefined {
        const val = this.match_select_.value;
        if (!val) {
            return undefined;
        }
        const parts = val.split('-');
        if (parts.length !== 3) {
            return undefined;
        }
        const comp = parts[0];
        const num = parseInt(parts[1]);
        const set = parseInt(parts[2]);
        return this.matches_.find(m => m.comp_level === comp && m.match_number === num && m.set_number === set);
    }

    private async runSimulation(): Promise<void> {
        this.updateConfigFromEditors();

        const cfg = this.getSelectedConfig();
        if (!cfg) {
            this.renderError('Select a configuration first.');
            return;
        }

        const match = this.getSelectedMatch();
        if (!match) {
            this.renderError('Select a match first.');
            return;
        }

        const phaseDefs = [
            { key: 'auto', label: 'Auto', formula: cfg.matchsim_auto_formula },
            { key: 'teleop', label: 'Teleop', formula: cfg.matchsim_teleop_formula },
            { key: 'endgame', label: 'Endgame', formula: cfg.matchsim_endgame_formula },
            { key: 'average', label: 'Average', formula: cfg.matchsim_average_formula }
        ];

        for (const p of phaseDefs) {
            if (!p.formula || p.formula.trim().length === 0) {
                this.renderError(`Configuration "${cfg.name}" is missing a ${p.label} formula.`);
                return;
            }
        }

        this.results_div_.innerHTML = 'Running simulation...';

        const phaseResults: Record<string, IPCMatchPredictorData> = {};
        for (const p of phaseDefs) {
            const result = await this.requestPhaseData(match, p.formula);
            if (result.error) {
                this.renderError(`${p.label}: ${result.error}`);
                return;
            }
            phaseResults[p.key] = result;
        }

        this.renderResults(match, cfg, phaseResults);
    }

    private requestPhaseData(match: IPCMatchInfo, formula: string): Promise<IPCMatchPredictorData> {
        return new Promise<IPCMatchPredictorData>((resolve, reject) => {
            if (this.pending_predictor_) {
                reject(new Error('A predictor request is already pending.'));
                return;
            }

            const timer = setTimeout(() => {
                this.pending_predictor_ = undefined;
                reject(new Error('Timed out waiting for predictor data.'));
            }, 15000);

            this.pending_predictor_ = { resolve, reject, timer };

            this.request('get-match-predictor-data', {
                comp_level: match.comp_level,
                set_number: match.set_number,
                match_number: match.match_number,
                formula
            });
        });
    }

    private receivedPredictorData(data: IPCMatchPredictorData): void {
        if (!this.pending_predictor_) {
            return;
        }

        clearTimeout(this.pending_predictor_.timer);
        const pending = this.pending_predictor_;
        this.pending_predictor_ = undefined;
        pending.resolve(data);
    }

    private calcOdds(data: IPCMatchPredictorData, k: number): { red: number; blue: number } {
        if (!data.score_sd || data.score_sd <= 0) {
            return { red: 0.5, blue: 0.5 };
        }

        const normDiff = (data.red_score - data.blue_score) / data.score_sd;
        const red = 1 / (1 + Math.pow(10, k * normDiff));
        return { red, blue: 1 - red };
    }

    private renderError(msg: string): void {
        this.results_div_.innerHTML = '';
        const err = document.createElement('div');
        err.style.color = '#b91c1c';
        err.style.fontWeight = '600';
        err.textContent = msg;
        this.results_div_.appendChild(err);
    }

    private renderResults(match: IPCMatchInfo, cfg: MatchSimConfig, phaseResults: Record<string, IPCMatchPredictorData>): void {
        this.results_div_.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = `MatchSim ${match.comp_level}-${match.match_number}-${match.set_number} | ${cfg.name}`;
        title.style.marginTop = '0';
        this.results_div_.appendChild(title);

        const oddsGrid = document.createElement('div');
        oddsGrid.style.display = 'grid';
        oddsGrid.style.gridTemplateColumns = 'repeat(4, minmax(180px, 1fr))';
        oddsGrid.style.gap = '8px';
        oddsGrid.style.marginBottom = '12px';

        const k = cfg.k ?? -5 / 8;
        const cards = [
            { key: 'auto', label: 'Auto' },
            { key: 'teleop', label: 'Teleop' },
            { key: 'endgame', label: 'Endgame' },
            { key: 'average', label: 'Average' }
        ];

        for (const c of cards) {
            const data = phaseResults[c.key];
            const odds = this.calcOdds(data, k);
            const card = document.createElement('div');
            card.style.border = '1px solid #e5e7eb';
            card.style.padding = '8px';
            card.style.borderRadius = '4px';
            card.innerHTML = `<div style="font-weight:600; margin-bottom:4px;">${c.label} Win Odds</div>
                              <div style="color:#b91c1c;">Red: ${(odds.red * 100).toFixed(1)}%</div>
                              <div style="color:#1d4ed8;">Blue: ${(odds.blue * 100).toFixed(1)}%</div>`;
            oddsGrid.appendChild(card);
        }
        this.results_div_.appendChild(oddsGrid);

        const formulaLine = document.createElement('div');
        formulaLine.style.marginBottom = '8px';
        formulaLine.style.fontSize = '12px';
        formulaLine.style.color = '#374151';
        formulaLine.textContent = `Auto=${cfg.matchsim_auto_formula} | Teleop=${cfg.matchsim_teleop_formula} | Endgame=${cfg.matchsim_endgame_formula} | Average=${cfg.matchsim_average_formula}`;
        this.results_div_.appendChild(formulaLine);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = '13px';

        table.innerHTML = `<thead>
            <tr>
                <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px;">Alliance</th>
                <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px;">Pos</th>
                <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px;">Team</th>
                <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Auto</th>
                <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Teleop</th>
                <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Endgame</th>
                <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Average</th>
            </tr>
        </thead>`;

        const body = document.createElement('tbody');
        const alliances: Array<{ name: string; key: 'red' | 'blue' }> = [
            { name: 'Red', key: 'red' },
            { name: 'Blue', key: 'blue' }
        ];

        for (const alliance of alliances) {
            for (let i = 0; i < 3; i++) {
                const autoTeam = this.getTeamRow(phaseResults.auto, alliance.key, i);
                const teleopTeam = this.getTeamRow(phaseResults.teleop, alliance.key, i);
                const endgameTeam = this.getTeamRow(phaseResults.endgame, alliance.key, i);
                const averageTeam = this.getTeamRow(phaseResults.average, alliance.key, i);

                const teamNum = autoTeam?.team ?? teleopTeam?.team ?? endgameTeam?.team ?? averageTeam?.team ?? 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6;">${alliance.name}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6;">${i + 1}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6;">${teamNum > 0 ? teamNum : '-'}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6; text-align:right;">${this.formatAvg(autoTeam)}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6; text-align:right;">${this.formatAvg(teleopTeam)}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6; text-align:right;">${this.formatAvg(endgameTeam)}</td>
                    <td style="padding:6px; border-bottom:1px solid #f3f4f6; text-align:right;">${this.formatAvg(averageTeam)}</td>
                `;
                body.appendChild(tr);
            }
        }

        const totals = document.createElement('tr');
        totals.innerHTML = `
            <td style="padding:6px; font-weight:600;">Totals</td>
            <td style="padding:6px;"></td>
            <td style="padding:6px;"></td>
            <td style="padding:6px; text-align:right; font-weight:600;">R ${phaseResults.auto.red_score.toFixed(1)} / B ${phaseResults.auto.blue_score.toFixed(1)}</td>
            <td style="padding:6px; text-align:right; font-weight:600;">R ${phaseResults.teleop.red_score.toFixed(1)} / B ${phaseResults.teleop.blue_score.toFixed(1)}</td>
            <td style="padding:6px; text-align:right; font-weight:600;">R ${phaseResults.endgame.red_score.toFixed(1)} / B ${phaseResults.endgame.blue_score.toFixed(1)}</td>
            <td style="padding:6px; text-align:right; font-weight:600;">R ${phaseResults.average.red_score.toFixed(1)} / B ${phaseResults.average.blue_score.toFixed(1)}</td>
        `;
        body.appendChild(totals);

        table.appendChild(body);
        this.results_div_.appendChild(table);
    }

    private getTeamRow(data: IPCMatchPredictorData, alliance: 'red' | 'blue', idx: number): { team: number; average: number; matches: number } | undefined {
        const list = alliance === 'red' ? data.red : data.blue;
        return list[idx];
    }

    private formatAvg(row: { average: number; matches: number } | undefined): string {
        if (!row) {
            return '-';
        }
        return `${row.average.toFixed(1)} (${row.matches})`;
    }
}
