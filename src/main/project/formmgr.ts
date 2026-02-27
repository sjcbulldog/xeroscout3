import { Manager } from "./manager";
import winston from "winston";
import fs from "fs";
import path from "path";
import { DataManager } from "./datamgr";
import { dialog } from "electron";
import { IPCChoice, IPCChoicesItem, IPCColumnDesc, IPCForm, IPCFormControlType, IPCFormItem, IPCFormPurpose } from "../../shared/ipc";
import { TabletDB } from "../../shared/tabletdb";
import { RulesEngine } from "../../shared/rulesengine";

export class FormInfo {
	public teamform_?: string; // The path to the form for team scouting
	public matchform_?: string; // The path to the form for match scouting
}

export class FormManager extends Manager {
	private location_: string;
	private info_: FormInfo;
	private data_mgr_: DataManager;

	constructor(logger: winston.Logger, writer: () => void, info: FormInfo, dir: string, datamgr: DataManager) {
		super(logger, writer);
		this.info_ = info;
		this.location_ = dir;
		this.data_mgr_ = datamgr;

		this.checkForms() ;
	}

	public setTeamForm(filename: string): Error | undefined {
		let target = path.join(this.location_, path.basename(filename));
		fs.copyFileSync(filename, target);

		this.info_.teamform_ = path.basename(filename);

		this.write();
		return undefined;
	}

	public getTeamFormFullPath(): string | undefined {
		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			return path.join(this.location_, this.info_.teamform_);
		}
		return undefined;
	}

	public static validateForm(filename: string, type: string): string[] {
		let ret: string[] = [];

		let obj = FormManager.readJSONFile(filename) ;
		if (obj instanceof Error) {
			ret.push(filename + ": " + (obj as Error).message);
			return ret;
		}

		let fobj = obj as IPCForm ;
		if (!fobj.purpose) {
			ret.push(
				filename +
					': the form is missing the "purpose" field to indicate form type'
			);
			return ret ;
		}

		if (fobj.purpose !== type) {
			ret.push(filename +
					": the form type is not valid, expected '" +
					type +
					"' but form '" +
					obj.form +
					"'"
			);
			return ret ;
		}

		if (!fobj.sections) {
			ret.push(
				filename +
					": the form is missing the 'sections' field to indicate form type"
			);
			return ret ;
		}

		if (!Array.isArray(fobj.sections)) {
			ret.push (
					filename +
							": the form is missing the 'sections' field to indicate form type"
					);
			return ret ;
		}

		let rulesengine = new RulesEngine(fobj) ;
		rulesengine.doRulesWork(Number.MAX_SAFE_INTEGER) ;
		return rulesengine.errors ;
	}

	public setMatchForm(filename: string): Error | undefined {
		let target = path.join(this.location_, path.basename(filename));
		fs.copyFileSync(filename, target);

		this.info_.matchform_ = path.basename(filename);
		this.write();
		return undefined;
	}

	public getMatchFormFullPath(): string | undefined {
		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			return path.join(this.location_, this.info_.matchform_);
		}
		return undefined;
	}

	public hasTeamForm(): boolean {
		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			return true;
		}

		return false;
	}

	public hasMatchForm(): boolean {
		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			return true;
		}

		return false;
	}

	public hasForms(): boolean {
		return this.hasTeamForm() || this.hasMatchForm();
	}

	public extractTeamFormFields(): IPCColumnDesc[] | Error {
		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			return this.getFormColumnNamesTypes(this.info_.teamform_);
		}

		return new Error("No team form found");
	}

	public extractMatchFormFields(): IPCColumnDesc[] | Error {
		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			return this.getFormColumnNamesTypes(this.info_.matchform_);
		}

		return new Error("No match form found");
	}

	public populateDBWithForms(): Promise<void> {
		let ret = new Promise<void>((resolve, reject) => {
			if (!this.hasForms()) {
				reject(new Error("missing forms for event"));
				return;
			}

			let teamFields: IPCColumnDesc[] | Error = this.extractTeamFormFields();
			if (teamFields instanceof Error) {
				reject(teamFields);
				return;
			}

			let matchFields: IPCColumnDesc[] | Error = this.extractMatchFormFields();
			if (matchFields instanceof Error) {
				reject(matchFields);
				return;
			}
			

			// Remove any old columns from an old team scouting form
			this.data_mgr_!.removeFormColumns()
				.then(() => {
					this.write();
					this.data_mgr_!.createFormColumns(teamFields, matchFields)
						.then(() => {
							resolve();
						})
						.catch((err) => {
							reject(err);
						});
				})
				.catch((err) => {
					reject(err);
				});
		});

		return ret;
	}

	public createTeamForm() : boolean {
		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			let ans = dialog.showMessageBoxSync(
				{
					title: 'Replace Team Form',
					type: 'warning',
					buttons: ['Yes', 'No'],
					message: 'There is already a team form.  This will replace the current form.  Do you want to continue?',
				}) ;

			if (ans === 1) {
				return false ;
			}
		}

		this.info_.teamform_ = this.createFormInternal('team', 'team.json') ;
		this.write() ;

		return true ;
	}

	public saveForm(type: string, contents: any) {
		let target = path.join(this.location_, type + ".json");
		let jsonstr = JSON.stringify(contents, null, 4);
		fs.writeFileSync(target, jsonstr);
	}

	public createMatchForm() : boolean {
		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			let ans = dialog.showMessageBoxSync(
				{
					title: 'Replace Match Form',
					type: 'warning',
					buttons: ['Yes', 'No'],
					message: 'There is already a match form.  This will replace the current form.  Do you want to continue?',
				}) ;

			if (ans === 1) {
				return false ;
			}
		}

		this.info_.matchform_ = this.createFormInternal('match', 'match.json') ;
		this.write() ;

		return true ;
	}

	private createFormInternal(ftype: IPCFormPurpose, filename: string): string {
		let target = path.join(this.location_, filename);
		let jsonobj : IPCForm = {
			purpose: ftype,
			sections: [],
			tablet: TabletDB.getDefaultTablet(),
		};

		let jsonstr = JSON.stringify(jsonobj, null, 4);
		fs.writeFileSync(target, jsonstr);
		return filename ;
	}

	public getForm(type: string) : IPCForm | Error {
		let formfile: string | undefined = undefined;
		if (type === "team") {
			formfile = this.info_.teamform_;
		} else if (type === "match") {
			formfile = this.info_.matchform_;
		} else {
			return new Error("Invalid form type: " + type);
		}

		if (!formfile || formfile.length === 0) {
			return new Error("No form found for type: " + type);
		}

		let fullpath = path.join(this.location_, formfile);
		if (!fs.existsSync(fullpath)) {
			return new Error("Form file does not exist: " + fullpath);
		}
		let jsonobj = FormManager.readJSONFile(fullpath) as IPCForm ;
		if (jsonobj instanceof Error) {
			return jsonobj as Error ;
		}

		if (!jsonobj.tablet) {
			jsonobj.tablet = TabletDB.getDefaultTablet() ;
		}

		return jsonobj;
	}

	private static readJSONFile(filename: string): any {
		let jsonobj: Object | Error;
		try {
			let jsonstr = fs.readFileSync(filename).toString();
			let str = jsonstr.replace(/\/\/.*/g, "");
			jsonobj = JSON.parse(str);
		} catch (err) {
			jsonobj = err as Error;
		}

		return jsonobj;
	}

	private getFormColumnNamesTypes(filename: string): IPCColumnDesc[] | Error {
		let ret: IPCColumnDesc[] = [];

		let formfile = path.join(this.location_, filename);

		let addField = (field: IPCColumnDesc) => {
			if (ret.find((x) => x.name === field.name)) {
				return;
			}
			ret.push(field);
		};

		try {
			let jsonobj = FormManager.readJSONFile(formfile);
			if (jsonobj instanceof Error) {
				return jsonobj as Error ;
			}
			for (let section of jsonobj.sections) {
				if (section.items && Array.isArray(section.items)) {
						for (let obj of section.items) {
							let item = obj as IPCFormItem ;
							if (item.type === "image" || item.type === "label" || item.type === "box") {
								// Skip any control that does not provide data, as these are not stored in the database
								continue;
							}

						let choices: IPCChoice[] | undefined = undefined ;
						if (item.type === "choice" || item.type === "select") {
							let choice = item as IPCChoicesItem ;
							if (choice.choices && Array.isArray(choice.choices)) {
								choices = [...choice.choices] ;
							}
						}

							addField({
								name: item.tag,
								type: item.datatype,
								choices: choices,
								editable: true,
								source: 'form'
							});

							if (item.type === 'stopwatch') {
								addField({
									name: item.tag + '_segments',
									type: 'string',
									editable: true,
									source: 'form'
								});
							}
						}
					}
				}
			} catch (err) {
			return err as Error;
		}

		return ret;
	}

	public  checkFormsValid() : string[] {
		let ret: string[] = [] ;

		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			let form = path.join(this.location_, this.info_.teamform_);
			let err = FormManager.validateForm(form, "team");
			for(let e of err) {
				ret.push('team form: ' + e);
			}
		}

		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			let form = path.join(this.location_, this.info_.matchform_);
			let err = FormManager.validateForm(form, "match");
			for(let e of err) {
				ret.push('match form: ' + e);
			}
		}

		return ret ;	
	}

	public checkForms() {
		if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
			let form = path.join(this.location_, this.info_.teamform_);
			if (!fs.existsSync(form)) {
				this.logger_.warn(`team form file '${this.info_.teamform_}' was referenced in the project file but does not exist.  Removing reference to file`); 
				this.info_.teamform_ = undefined;
			}
		}

		if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
			let form = path.join(this.location_, this.info_.matchform_);
			if (!fs.existsSync(form)) {
				this.logger_.warn(`match form file '${this.info_.matchform_}' was referenced in the project file but does not exist.  Removing reference to file`); 
				this.info_.matchform_ = undefined;
			}
		}
	}
}
