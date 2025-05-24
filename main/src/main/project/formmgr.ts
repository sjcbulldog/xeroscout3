import { ColumnDesc } from "../model/datamodel";
import { Manager } from "./manager";
import winston from "winston";
import fs from "fs";
import path from "path";
import { DataManager } from "./datamgr";
import { dialog } from "electron";
import { IPCFormControlType } from "../../shared/ipc";

export interface TagSource {
  form: string;
  section: string;
  type: IPCFormControlType
}

export interface TagInformation {
  tag: string;
  sources: TagSource[];
}

export class FormInfo {
  public teamform_?: string; // The path to the form for team scouting
  public matchform_?: string; // The path to the form for match scouting
  public team_form_columns_: ColumnDesc[] = []; // The list of columns that came from the team form
  public match_form_columns_: ColumnDesc[] = []; // The list of columns that came from the match form
}

export class FormManager extends Manager {
  private location_: string;
  private info_: FormInfo;
  private data_mgr_: DataManager;

  constructor(
    logger: winston.Logger,
    writer: () => void,
    info: FormInfo,
    dir: string,
    datamgr: DataManager
  ) {
    super(logger, writer);
    this.info_ = info;
    this.location_ = dir;
    this.data_mgr_ = datamgr;

    this.checkForms() ;
  }

  public lock() : undefined | Error{
    let result = this.extractTeamFormFields();
    if (result instanceof Error) {
      this.logger_.error("Error getting team form fields: " + result.message);
      return result;
    }
    this.info_.team_form_columns_ = result as ColumnDesc[];

    result = this.extractMatchFormFields();
    if (result instanceof Error) {
      this.logger_.error("Error getting match form fields: " + result.message);
      return result;
    }
    this.info_.match_form_columns_ = result as ColumnDesc[];

    this.write() ;    
    return undefined ;
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

  public getTeamFormFields(): ColumnDesc[] {
    return this.info_.team_form_columns_;
  }

  public getTeamFormFieldNames(): string[] {
    let ret: string[] = [];
    for (let field of this.info_.team_form_columns_) {
      ret.push(field.name);
    }

    return ret;
  }

  public static validateForm(filename: string, type: string): Error | undefined {
    let obj = FormManager.readJSONFile(filename);
    if (obj instanceof Error) {
      return obj as Error ;
    }

    if (!obj.form) {
      return new Error(
        filename +
          ': the form is missing the "form" field to indicate form type'
      );
    }

    if (obj.form !== type && type !== "*") {
      return new Error(
        filename +
          ": the form type is not valid, expected '" +
          type +
          "' but form '" +
          obj.form +
          "'"
      );
    }

    if (!obj.sections) {
      return new Error(
        filename +
          ": the form is missing the 'sections' field to indicate form type"
      );
    }

    if (!Array.isArray(obj.sections)) {
        return new Error(
            filename +
                ": the form is missing the 'sections' field to indicate form type"
            );
    }

    let num = 1;
    for (let sect of obj.sections) {
      let result = this.validateSection(filename, num, sect);
      if (result instanceof Error) {
        return result;
      }
      num++;
    }

    return undefined;
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

  public getMatchFormFields(): ColumnDesc[] {
    return this.info_.match_form_columns_;
  }

  public getMatchFormFieldNames(): string[] {
    let ret: string[] = [];
    for (let field of this.info_.match_form_columns_) {
      ret.push(field.name);
    }

    return ret;
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

  public extractTeamFormFields(): ColumnDesc[] | Error {
    if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
      return this.getFormColumnNamesTypes(this.info_.teamform_);
    }

    return new Error("No team form found");
  }

  public extractMatchFormFields(): ColumnDesc[] | Error {
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

      // Remove any old columns from an old team scouting form
      this.data_mgr_!.removeFormColumns(this.info_.team_form_columns_, this.info_.match_form_columns_)
        .then(() => {
          this.write();
          this.data_mgr_!.createFormColumns(
            this.getTeamFormFields(),
            this.getMatchFormFields()
          )
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

  public createTeamForm() {
    if (this.info_.teamform_ && this.info_.teamform_.length > 0) {
      let ans = dialog.showMessageBoxSync(
        {
          title: 'Replace Team Form',
          type: 'warning',
          buttons: ['Yes', 'No'],
          message: 'There is already a team form.  This will replace the current form.  Do you want to continue?',
        }) ;

      if (ans === 1) {
        return;
      }
    }

    this.info_.teamform_ = this.createFormInternal('team', 'team.json') ;
    this.write() ;
  }

  public saveForm(type: string, contents: any) {
    let target = path.join(this.location_, type + ".json");
    let jsonstr = JSON.stringify(contents, null, 4);
    fs.writeFileSync(target, jsonstr);
  }

  public createMatchForm() {
    if (this.info_.matchform_ && this.info_.matchform_.length > 0) {
      let ans = dialog.showMessageBoxSync(
        {
          title: 'Replace Match Form',
          type: 'warning',
          buttons: ['Yes', 'No'],
          message: 'There is already a match form.  This will replace the current form.  Do you want to continue?',
        }) ;

      if (ans === 1) {
        return;
      }
    }

    this.info_.matchform_ = this.createFormInternal('match', 'match.json') ;
    this.write() ;
  }

  private createFormInternal(ftype: string, filename: string): string {
    let target = path.join(this.location_, filename);
    let jsonobj = {
      form: ftype,
      sections: []
    };

    let jsonstr = JSON.stringify(jsonobj, null, 4);
    fs.writeFileSync(target, jsonstr);
    return filename ;
  }

  private static validateTag(tag: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(tag);
  }

  private static validateImageItem(
    filename: string,
    sectno: number,
    itemno: number,
    item: any
  ): Error | undefined {
    if (item.type === "multi") {
      if (item.datatype) {
        if (typeof item.datatype !== "string") {
          return new Error(
            filename +
              ": section " +
              sectno +
              " item " +
              itemno +
              "the field 'datatype' is defined but is not a string"
          );
        }

        let dt = item.datatype.toLowerCase();
        if (dt !== "integer" && dt !== "real") {
          return new Error(
            filename +
              ": section " +
              sectno +
              " item " +
              itemno +
              "the field 'datatype' is defined but is not a valid type: 'integer' or 'real'"
          );
        }
      }
    }
    return undefined;
  }

  private static validateItem(
    filename: string,
    sectno: number,
    itemno: number,
    item: any
  ): Error | undefined {
    if (!item.name) {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'name' is not defined"
      );
    }

    if (typeof item.name !== "string") {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'name' is defined, but is not a string"
      );
    }

    if (!item.type) {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'type' is not defined"
      );
    }

    if (typeof item.type !== "string") {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'type' is defined, but is not a string"
      );
    }

    if (
      item.type != "boolean" &&
      item.type != "text" &&
      item.type != "choice" &&
      item.type != "updown"
    ) {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'type' is " +
          item.type +
          " which is not valid.  Must be 'boolean', 'text', 'updown', 'choice', or 'select'"
      );
    }

    if (!item.tag) {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'tag' is not defined"
      );
    }

    if (typeof item.tag !== "string") {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'tag' is defined, but is not a string"
      );
    }

    if (!this.validateTag(item.tag)) {
      return new Error(
        filename +
          ": section " +
          sectno +
          " item " +
          itemno +
          "the field 'tag' has a value '" +
          item.tag +
          "'which is not valid, must start with a letter and be composed of letters, numbers, and underscores"
      );
    }

    if (item.type === "text") {
      if (item.maxlen === undefined) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'maxlen' is not defined and is required for an item of type 'text'"
        );
      }

      if (typeof item.maxlen !== "number") {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'maxlen' is defined but is not a number"
        );
      }
    } else if (item.type === "boolean") {
      // NONE
    } else if (item.type === "updown") {
      if (item.minimum === undefined) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'minimum' is not defined and is required for an item of type 'updown'"
        );
      }

      if (typeof item.minimum !== "number") {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'minimum' is defined but is not a number"
        );
      }

      if (item.maximum === undefined) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'maximum' is not defined and is required for an item of type 'updown'"
        );
      }

      if (typeof item.maximum !== "number") {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'maximum' is defined but is not a number"
        );
      }

      if (item.maximum <= item.minimum) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'maximum' is less than the field 'minimum'"
        );
      }
    } else if (item.type === "choice") {
      if (item.choices === undefined) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'choices' is not defined and is required for an item of type 'choice'"
        );
      }

      if (!Array.isArray(item.choices)) {
        return new Error(
          filename +
            ": section " +
            sectno +
            " item " +
            itemno +
            "the field 'choices' is defined but is not an array"
        );
      }

      let choiceno = 1;
      for (let choice of item.choices) {
        if (typeof choice !== "string" && typeof choice !== "number") {
          let msg: string =
            "choice " +
            choiceno +
            ": the value is neither a 'string', nor a 'number'";
          return new Error(
            filename + ": section " + sectno + " item " + itemno + msg
          );
        }
        choiceno++;
      }
    }

    return undefined;
  }

  private static validateSection(
    filename: string,
    num: number,
    sect: any
  ): Error | undefined {
    let isImage = false;

    if (!sect.name) {
      return new Error(
        filename + ": section " + num + "the field 'name' is not defined"
      );
    }

    if (typeof sect.name !== "string") {
      return new Error(
        filename +
          ": section " +
          num +
          "the field 'name' is defined, but is not a string"
      );
    }

    if (sect.image) {
      if (typeof sect.image !== "string") {
        return new Error(
          filename +
            ": section " +
            num +
            "the field 'image' is defined, but is not a string"
        );
      }
      isImage = true;
    }

    if (!sect.items) {
      return new Error(
        filename + ": section " + num + "the field 'items' is not defined"
      );
    }

    if (!Array.isArray(sect.items)) {
      return new Error(
        filename +
          ": section " +
          num +
          "the field 'items' is defined, but is not an array"
      );
    }

    let itemnum = 1;
    for (let item of sect.items) {
      if (isImage) {
        let err = this.validateImageItem(filename, num, itemnum, item);
        if (err) {
          return err;
        }
      } else {
        let err = this.validateItem(filename, num, itemnum, item);
        if (err) {
          return err;
        }
      }
      itemnum++;
    }

    return undefined;
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

  private getFormColumnNamesTypes(filename: string): ColumnDesc[] | Error {
    let ret: ColumnDesc[] = [];

    let formfile = path.join(this.location_, filename);

    try {
      let jsonobj = FormManager.readJSONFile(formfile);
      for (let section of jsonobj.sections) {
        if (section.items && Array.isArray(section.items)) {
          for (let item of section.items) {
            if (item.type === "image" || item.type === "label" || item.type === "box") {
              // Skip any control that does not provide data, as these are not stored in the database
              continue;
            }
            let field: ColumnDesc = {
              name: item.tag,
              type: item.datatype
            };
            ret.push(field);
          }
        }
      }
    } catch (err) {
      return err as Error;
    }

    return ret;
  }

  private checkOneForm(formname: string, tmap: Map<string, TagInformation>) {
    let formfile = path.join(this.location_, formname);    
    try {
      let jsonobj = FormManager.readJSONFile(formfile);
      for (let section of jsonobj.sections) {
        if (section.items && Array.isArray(section.items)) {
          for (let item of section.items) {
            if (item.type === "image" || item.type === "label" || item.type === "box") {
              // Skip any control that does not provide data, as these are not stored in the database
              // and do not need to be checked for duplicate tags
              this.logger_.debug(`Skipping item ${item.name} of type ${item.type} in form ${formname} section ${section.name}`) ;
              continue;
            }
            
            let tag = item.tag;
            if (tmap.has(tag)) {
              let info = tmap.get(tag);
              if (info) {
                info.sources.push({ form: formname, section: section.name, type: item.type });
              }
            } else {
              let info: TagInformation = { tag: tag, sources: [] };
              info.sources.push({ form: formname, section: section.name, type: item.type });
              tmap.set(tag, info);
            }
          }
        }
      }
    }
    catch (err) {
      this.logger_.error("Error reading form file " + formfile + ": " + err);
    }
  }

  public  checkDuplicateTags() : TagInformation[] {
    let tmap: Map<string, TagInformation> = new Map<string, TagInformation>() ;
    let ret : TagInformation[] = [] ;

    this.checkOneForm(this.info_.teamform_!, tmap) ;
    this.checkOneForm(this.info_.matchform_!, tmap) ;

    for(let values of tmap.values()) {
      if (values.sources.length > 1) {
        ret.push(values) ;
      }
    }

    return ret ;
  }

  checkForms() {
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
