import {
    IPCChoice,
    IPCColumnDesc,
    IPCDataItem,
    IPCDataSet,
    IPCForm,
    IPCFormControlType,
    IPCFormItem,
    IPCFormula,
    IPCGraphConfig,
    IPCNamedDataValue,
    IPCPickListConfig,
    IPCPlayoffStatus,
    IPCScoutResult,
    IPCScoutResults,
    IPCSection,
    IPCSyncedImageData,
    IPCTabletDefn,
    IPCTypedDataValue,
} from "./ipc";
import { BAEvent, BAMatch, BATeam } from "../main/extnet/badata";

type Validator<T> = (value: unknown, path: string, errors: string[]) => boolean;

export interface ValidationSuccess<T> {
    ok: true;
    value: T;
}

export interface ValidationFailure {
    ok: false;
    errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const appTypes = new Set(["central", "scout", "coach"]);
const purposes = new Set(["team", "match"]);
const typedValueTypes = new Set(["integer", "real", "string", "boolean", "array", "null", "error"]);
const imageExtensions = new Set(["png", "webp"]);
const controlTypes = new Set(["label", "text", "textarea", "boolean", "updown", "choice", "select", "timer", "stopwatch", "box", "image", "autoplan", "autoselector", "robotphoto", "robotviewer"]);
const matchLevels = new Set(["qm", "sf", "f"]);
const playoffAlliances = new Set(["red", "blue"]);
const graphTypes = new Set(["line", "bar", "scatter", "area"]);

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addError(errors: string[], path: string, message: string) {
    errors.push(`${path} ${message}`);
}

function summarizeScoutResultTags(value: unknown): string {
    if (!isObject(value) || !Array.isArray(value.data)) {
        return "";
    }

    const tags = value.data
        .filter((entry) => isObject(entry) && typeof entry.tag === "string" && entry.tag.trim().length > 0)
        .map((entry) => (entry as Record<string, unknown>).tag as string);

    if (tags.length === 0) {
        return "";
    }

    return `; data tags: ${tags.join(", ")}`;
}

function requireStrictObject(value: unknown, path: string, errors: string[], keys: string[]): value is Record<string, unknown> {
    if (!isObject(value)) {
        addError(errors, path, `expected object but got ${describeValue(value)}`);
        return false;
    }

    const allowed = new Set(keys);
    for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
            addError(errors, path, `contains unknown key '${key}'`);
        }
    }

    return true;
}

function describeValue(value: unknown): string {
    if (value === null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "array";
    }
    return typeof value;
}

function requireString(value: unknown, path: string, errors: string[], opts?: { allowEmpty?: boolean }): value is string {
    if (typeof value !== "string") {
        addError(errors, path, `expected string but got ${describeValue(value)}`);
        return false;
    }
    if (!opts?.allowEmpty && value.trim().length === 0) {
        addError(errors, path, "must be a non-empty string");
        return false;
    }
    return true;
}

function requireBoolean(value: unknown, path: string, errors: string[]): value is boolean {
    if (typeof value !== "boolean") {
        addError(errors, path, `expected boolean but got ${describeValue(value)}`);
        return false;
    }
    return true;
}

function requireFiniteNumber(value: unknown, path: string, errors: string[], opts?: { integer?: boolean }): value is number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        addError(errors, path, `expected finite number but got ${describeValue(value)}`);
        return false;
    }
    if (opts?.integer && !Number.isInteger(value)) {
        addError(errors, path, "must be an integer");
        return false;
    }
    return true;
}

function requireArray(value: unknown, path: string, errors: string[]): value is unknown[] {
    if (!Array.isArray(value)) {
        addError(errors, path, `expected array but got ${describeValue(value)}`);
        return false;
    }
    return true;
}

function requireEnum(value: unknown, path: string, errors: string[], values: Set<string>): value is string {
    if (!requireString(value, path, errors)) {
        return false;
    }
    if (!values.has(value)) {
        addError(errors, path, `must be one of ${[...values].join(", ")}`);
        return false;
    }
    return true;
}

function validateChoice(value: unknown, path: string, errors: string[]): value is IPCChoice {
    if (!requireStrictObject(value, path, errors, ["text", "value"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.text, `${path}.text`, errors) && ok;
    if (typeof obj.value !== "string" && !(typeof obj.value === "number" && Number.isFinite(obj.value))) {
        addError(errors, `${path}.value`, `expected string or finite number but got ${describeValue(obj.value)}`);
        ok = false;
    }
    return ok;
}

function validateTypedValue(value: unknown, path: string, errors: string[]): value is IPCTypedDataValue {
    if (!requireStrictObject(value, path, errors, ["type", "value"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = requireEnum(obj.type, `${path}.type`, errors, typedValueTypes);
    if (!ok) {
        return false;
    }

    switch (obj.type) {
        case "integer":
            ok = requireFiniteNumber(obj.value, `${path}.value`, errors, { integer: true }) && ok;
            break;
        case "real":
            ok = requireFiniteNumber(obj.value, `${path}.value`, errors) && ok;
            break;
        case "string":
            ok = typeof obj.value === "string" && ok;
            if (typeof obj.value !== "string") {
                addError(errors, `${path}.value`, `expected string but got ${describeValue(obj.value)}`);
            }
            break;
        case "boolean":
            ok = requireBoolean(obj.value, `${path}.value`, errors) && ok;
            break;
        case "array":
            ok = requireArray(obj.value, `${path}.value`, errors) && ok;
            break;
        case "null":
            if (obj.value !== null) {
                addError(errors, `${path}.value`, `expected null but got ${describeValue(obj.value)}`);
                ok = false;
            }
            break;
        case "error":
            ok = requireString(obj.value, `${path}.value`, errors, { allowEmpty: true }) && ok;
            break;
    }

    return ok;
}

function validateNamedDataValue(value: unknown, path: string, errors: string[]): value is IPCNamedDataValue {
    if (!requireStrictObject(value, path, errors, ["tag", "value"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.tag, `${path}.tag`, errors) && ok;
    ok = validateTypedValue(obj.value, `${path}.value`, errors) && ok;
    return ok;
}

function validateScoutItemId(value: string, path: string, errors: string[]) {
    if (value.startsWith("st-")) {
        const number = value.substring(3);
        if (!/^\d+$/.test(number) || Number(number) <= 0) {
            addError(errors, path, "must be a valid team item id like st-254");
        }
        return;
    }

    const match = /^sm-([^-]+)-(\d+)-(\d+)-(\d+)$/.exec(value);
    if (!match) {
        addError(errors, path, "must be a valid scout item id like st-254 or sm-qm-1-12-254");
        return;
    }

    if (!matchLevels.has(match[1])) {
        addError(errors, path, `has unsupported match level '${match[1]}'`);
    }
    for (let i = 2; i <= 4; i++) {
        if (Number(match[i]) <= 0) {
            addError(errors, path, "must use positive numeric segments");
            break;
        }
    }
}

function validateScoutResult(value: unknown, path: string, errors: string[]): value is IPCScoutResult {
    if (!requireStrictObject(value, path, errors, ["item", "data"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    if (!requireString(obj.item, `${path}.item`, errors)) {
        addError(errors, path, `is missing scout item id${summarizeScoutResultTags(value)}`);
        ok = false;
    }
    if (typeof obj.item === "string") {
        validateScoutItemId(obj.item, `${path}.item`, errors);
    }

    if (!requireArray(obj.data, `${path}.data`, errors)) {
        return false;
    }

    const seenTags = new Set<string>();
    obj.data.forEach((entry, index) => {
        ok = validateNamedDataValue(entry, `${path}.data[${index}]`, errors) && ok;
        if (isObject(entry) && typeof entry.tag === "string") {
            if (seenTags.has(entry.tag)) {
                addError(errors, `${path}.data[${index}].tag`, `duplicates tag '${entry.tag}' in the same result`);
                ok = false;
            }
            seenTags.add(entry.tag);
        }
    });

    return ok;
}

function validateScoutResults(value: unknown, path: string, errors: string[]): value is IPCScoutResults {
    if (!requireStrictObject(value, path, errors, ["tablet", "purpose", "results"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.tablet, `${path}.tablet`, errors) && ok;
    ok = requireEnum(obj.purpose, `${path}.purpose`, errors, purposes) && ok;
    if (!requireArray(obj.results, `${path}.results`, errors)) {
        return false;
    }

    const seenItems = new Set<string>();
    obj.results.forEach((entry, index) => {
        ok = validateScoutResult(entry, `${path}.results[${index}]`, errors) && ok;
        if (isObject(entry) && typeof entry.item === "string") {
            if (seenItems.has(entry.item)) {
                addError(errors, `${path}.results[${index}].item`, `duplicates item '${entry.item}' in the same payload`);
                ok = false;
            }
            seenItems.add(entry.item);
        }
    });

    return ok;
}

function validateScoutHello(value: unknown, path: string, errors: string[]): value is { name: string; purpose: string } {
    if (!requireStrictObject(value, path, errors, ["name", "purpose"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireEnum(obj.purpose, `${path}.purpose`, errors, purposes) && ok;
    return ok;
}

function validateHelloResponse(value: unknown, path: string, errors: string[]): value is { uuid?: string; name: string } {
    if (!requireStrictObject(value, path, errors, ["uuid", "name"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    if (obj.uuid !== undefined) {
        ok = requireString(obj.uuid, `${path}.uuid`, errors) && ok;
    }
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    return ok;
}

function validateTabletDefn(value: unknown, path: string, errors: string[]): value is IPCTabletDefn {
    if (!requireStrictObject(value, path, errors, ["name", "purpose"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    if (obj.purpose !== undefined) {
        ok = requireEnum(obj.purpose, `${path}.purpose`, errors, purposes) && ok;
    }
    return ok;
}

function validateStringArray(value: unknown, path: string, errors: string[], opts?: { nonEmpty?: boolean; unique?: boolean }): value is string[] {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    const seen = new Set<string>();
    value.forEach((entry, index) => {
        ok = requireString(entry, `${path}[${index}]`, errors, { allowEmpty: !opts?.nonEmpty }) && ok;
        if (typeof entry === "string") {
            if (opts?.unique && seen.has(entry)) {
                addError(errors, `${path}[${index}]`, `duplicates value '${entry}'`);
                ok = false;
            }
            seen.add(entry);
        }
    });
    return ok;
}

function validateImageData(value: unknown, path: string, errors: string[]): value is IPCSyncedImageData {
    if (!requireStrictObject(value, path, errors, ["data", "mimeType", "extension"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.data, `${path}.data`, errors) && ok;
    ok = requireString(obj.mimeType, `${path}.mimeType`, errors) && ok;
    ok = requireEnum(obj.extension, `${path}.extension`, errors, imageExtensions) && ok;
    return ok;
}

function validateImagePayloadMap(value: unknown, path: string, errors: string[]): value is Record<string, IPCSyncedImageData> {
    if (!isObject(value)) {
        addError(errors, path, `expected object but got ${describeValue(value)}`);
        return false;
    }
    let ok = true;
    for (const key of Object.keys(value)) {
        ok = requireString(key, `${path}.{key}`, errors) && ok;
        if (key.trim().length === 0) {
            addError(errors, `${path}.{key}`, "must be a non-empty image name");
            ok = false;
        }
        ok = validateImageData(value[key], `${path}.${key}`, errors) && ok;
    }
    return ok;
}

function validateDataItem(value: unknown, path: string, errors: string[]): value is IPCDataItem {
    if (!requireStrictObject(value, path, errors, ["label", "name", "dataset", "decimals", "width"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.label, `${path}.label`, errors) && ok;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireString(obj.dataset, `${path}.dataset`, errors, { allowEmpty: true }) && ok;
    if (obj.decimals !== undefined) {
        ok = requireFiniteNumber(obj.decimals, `${path}.decimals`, errors, { integer: true }) && ok;
    }
    if (obj.width !== undefined) {
        ok = requireFiniteNumber(obj.width, `${path}.width`, errors) && ok;
    }
    return ok;
}

function validateGraphConfig(value: unknown, path: string, errors: string[]): value is IPCGraphConfig {
    if (!requireStrictObject(value, path, errors, ["name", "xlabel", "yleft", "yright", "title", "type", "teams", "leftitems", "rightitems", "owner"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireString(obj.xlabel, `${path}.xlabel`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.yleft, `${path}.yleft`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.yright, `${path}.yright`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.title, `${path}.title`, errors) && ok;
    ok = requireString(obj.type, `${path}.type`, errors) && ok;
    if (typeof obj.type === "string" && obj.type.trim().length > 0 && !graphTypes.has(obj.type)) {
        // keep permissive enough for existing saved configs but still reject blank/invalid primitives
    }
    ok = requireEnum(obj.owner, `${path}.owner`, errors, appTypes) && ok;
    if (!requireArray(obj.teams, `${path}.teams`, errors)) {
        return false;
    }
    obj.teams.forEach((entry, index) => {
        ok = requireFiniteNumber(entry, `${path}.teams[${index}]`, errors, { integer: true }) && ok;
    });
    if (!requireArray(obj.leftitems, `${path}.leftitems`, errors) || !requireArray(obj.rightitems, `${path}.rightitems`, errors)) {
        return false;
    }
    obj.leftitems.forEach((entry, index) => {
        ok = validateDataItem(entry, `${path}.leftitems[${index}]`, errors) && ok;
    });
    obj.rightitems.forEach((entry, index) => {
        ok = validateDataItem(entry, `${path}.rightitems[${index}]`, errors) && ok;
    });
    return ok;
}

function validatePicklistConfig(value: unknown, path: string, errors: string[]): value is IPCPickListConfig {
    if (!requireStrictObject(value, path, errors, ["name", "teams", "columns", "notes", "cellColors", "columnGradients", "positionWidth", "teamWidth", "nicknameWidth", "notesWidth", "owner"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireEnum(obj.owner, `${path}.owner`, errors, appTypes) && ok;
    if (!requireArray(obj.teams, `${path}.teams`, errors)) {
        return false;
    }
    obj.teams.forEach((entry, index) => {
        ok = requireFiniteNumber(entry, `${path}.teams[${index}]`, errors, { integer: true }) && ok;
    });
    if (!requireArray(obj.columns, `${path}.columns`, errors) || !requireArray(obj.notes, `${path}.notes`, errors)) {
        return false;
    }
    obj.columns.forEach((entry, index) => {
        ok = validateDataItem(entry, `${path}.columns[${index}]`, errors) && ok;
    });
    obj.notes.forEach((entry, index) => {
        ok = requireString(entry, `${path}.notes[${index}]`, errors, { allowEmpty: true }) && ok;
    });
    if (obj.notes.length !== obj.teams.length) {
        addError(errors, `${path}.notes`, `must match teams length ${obj.teams.length}`);
        ok = false;
    }
    return ok;
}

function validateColumnDesc(value: unknown, path: string, errors: string[]): value is IPCColumnDesc {
    if (!requireStrictObject(value, path, errors, ["name", "type", "source", "editable", "hiddenByDefault", "choices"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireEnum(obj.type, `${path}.type`, errors, typedValueTypes) && ok;
    ok = requireEnum(obj.source, `${path}.source`, errors, new Set(["form", "bluealliance", "base", "statbotics"])) && ok;
    ok = requireBoolean(obj.editable, `${path}.editable`, errors) && ok;
    if (obj.hiddenByDefault !== undefined) {
        ok = requireBoolean(obj.hiddenByDefault, `${path}.hiddenByDefault`, errors) && ok;
    }
    if (obj.choices !== undefined) {
        if (!requireArray(obj.choices, `${path}.choices`, errors)) {
            ok = false;
        }
        else {
            obj.choices.forEach((entry, index) => {
                ok = validateChoice(entry, `${path}.choices[${index}]`, errors) && ok;
            });
        }
    }
    return ok;
}

function validateFormItem(value: unknown, path: string, errors: string[]): value is IPCFormItem {
    const baseKeys = ["type", "tag", "x", "y", "width", "height", "fontFamily", "fontSize", "fontStyle", "fontWeight", "color", "background", "transparent", "datatype", "locked"];
    if (!isObject(value)) {
        addError(errors, path, `expected object but got ${describeValue(value)}`);
        return false;
    }

    const type = (value as Record<string, unknown>).type;
    if (!requireEnum(type, `${path}.type`, errors, controlTypes)) {
        return false;
    }

    const extraKeys: Record<IPCFormControlType, string[]> = {
        label: ["text"],
        text: ["placeholder"],
        textarea: ["rows", "cols"],
        boolean: ["accent"],
        updown: ["orientation", "minvalue", "maxvalue"],
        choice: ["choices", "radiosize", "orientation", "multiselect"],
        select: ["choices"],
        timer: [],
        stopwatch: ["holdMode"],
        box: ["borderStyle", "borderWidth", "borderRadius", "borderShadow"],
        image: ["image", "field", "mirrorx", "mirrory"],
        autoplan: ["fieldImage", "approvedActions", "allowMultipleAutos"],
        autoselector: ["fieldImage", "showSourceTagInTab"],
        robotphoto: ["mode"],
        robotviewer: [],
    };

    if (!requireStrictObject(value, path, errors, [...baseKeys, ...extraKeys[type as IPCFormControlType]])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.tag, `${path}.tag`, errors, { allowEmpty: true }) && ok;
    ok = requireFiniteNumber(obj.x, `${path}.x`, errors) && ok;
    ok = requireFiniteNumber(obj.y, `${path}.y`, errors) && ok;
    ok = requireFiniteNumber(obj.width, `${path}.width`, errors) && ok;
    ok = requireFiniteNumber(obj.height, `${path}.height`, errors) && ok;
    ok = requireString(obj.fontFamily, `${path}.fontFamily`, errors, { allowEmpty: true }) && ok;
    ok = requireFiniteNumber(obj.fontSize, `${path}.fontSize`, errors) && ok;
    ok = requireString(obj.fontStyle, `${path}.fontStyle`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.fontWeight, `${path}.fontWeight`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.color, `${path}.color`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.background, `${path}.background`, errors, { allowEmpty: true }) && ok;
    ok = requireBoolean(obj.transparent, `${path}.transparent`, errors) && ok;
    ok = requireEnum(obj.datatype, `${path}.datatype`, errors, typedValueTypes) && ok;
    if (obj.locked !== undefined) {
        ok = requireBoolean(obj.locked, `${path}.locked`, errors) && ok;
    }

    switch (type) {
        case "label":
            ok = requireString(obj.text, `${path}.text`, errors, { allowEmpty: true }) && ok;
            break;
        case "text":
            ok = requireString(obj.placeholder, `${path}.placeholder`, errors, { allowEmpty: true }) && ok;
            break;
        case "textarea":
            ok = requireFiniteNumber(obj.rows, `${path}.rows`, errors, { integer: true }) && ok;
            ok = requireFiniteNumber(obj.cols, `${path}.cols`, errors, { integer: true }) && ok;
            break;
        case "boolean":
            ok = requireString(obj.accent, `${path}.accent`, errors, { allowEmpty: true }) && ok;
            break;
        case "updown":
            ok = requireEnum(obj.orientation, `${path}.orientation`, errors, new Set(["horizontal", "vertical"])) && ok;
            ok = requireFiniteNumber(obj.minvalue, `${path}.minvalue`, errors) && ok;
            ok = requireFiniteNumber(obj.maxvalue, `${path}.maxvalue`, errors) && ok;
            break;
        case "choice":
        case "select":
            if (!requireArray(obj.choices, `${path}.choices`, errors)) {
                ok = false;
            }
            else {
                obj.choices.forEach((entry, index) => {
                    ok = validateChoice(entry, `${path}.choices[${index}]`, errors) && ok;
                });
            }
            if (type === "choice") {
                ok = requireFiniteNumber(obj.radiosize, `${path}.radiosize`, errors) && ok;
                ok = requireEnum(obj.orientation, `${path}.orientation`, errors, new Set(["horizontal", "vertical"])) && ok;
                if (obj.multiselect !== undefined) {
                    ok = requireBoolean(obj.multiselect, `${path}.multiselect`, errors) && ok;
                }
            }
            break;
        case "stopwatch":
            if (obj.holdMode !== undefined) {
                ok = requireBoolean(obj.holdMode, `${path}.holdMode`, errors) && ok;
            }
            break;
        case "box":
            ok = requireString(obj.borderStyle, `${path}.borderStyle`, errors, { allowEmpty: true }) && ok;
            ok = requireFiniteNumber(obj.borderWidth, `${path}.borderWidth`, errors) && ok;
            ok = requireFiniteNumber(obj.borderRadius, `${path}.borderRadius`, errors) && ok;
            ok = requireBoolean(obj.borderShadow, `${path}.borderShadow`, errors) && ok;
            break;
        case "image":
            ok = requireString(obj.image, `${path}.image`, errors) && ok;
            ok = requireBoolean(obj.field, `${path}.field`, errors) && ok;
            ok = requireBoolean(obj.mirrorx, `${path}.mirrorx`, errors) && ok;
            ok = requireBoolean(obj.mirrory, `${path}.mirrory`, errors) && ok;
            break;
        case "autoplan":
            ok = requireString(obj.fieldImage, `${path}.fieldImage`, errors) && ok;
            ok = validateStringArray(obj.approvedActions, `${path}.approvedActions`, errors, { nonEmpty: true }) && ok;
            ok = requireBoolean(obj.allowMultipleAutos, `${path}.allowMultipleAutos`, errors) && ok;
            break;
        case "autoselector":
            ok = requireString(obj.fieldImage, `${path}.fieldImage`, errors) && ok;
            if (obj.showSourceTagInTab !== undefined) {
                ok = requireBoolean(obj.showSourceTagInTab, `${path}.showSourceTagInTab`, errors) && ok;
            }
            break;
        case "robotphoto":
            ok = requireEnum(obj.mode, `${path}.mode`, errors, new Set(["capture", "display"])) && ok;
            break;
    }

    return ok;
}

function validateSection(value: unknown, path: string, errors: string[]): value is IPCSection {
    if (!requireStrictObject(value, path, errors, ["name", "items"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors, { allowEmpty: true }) && ok;
    if (!requireArray(obj.items, `${path}.items`, errors)) {
        return false;
    }
    obj.items.forEach((entry, index) => {
        ok = validateFormItem(entry, `${path}.items[${index}]`, errors) && ok;
    });
    return ok;
}

function validateForm(value: unknown, path: string, errors: string[]): value is IPCForm {
    if (!requireStrictObject(value, path, errors, ["purpose", "tablet", "sections"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireEnum(obj.purpose, `${path}.purpose`, errors, purposes) && ok;
    if (!requireStrictObject(obj.tablet, `${path}.tablet`, errors, ["name", "size"])) {
        return false;
    }
    const tablet = obj.tablet as Record<string, unknown>;
    ok = requireString(tablet.name, `${path}.tablet.name`, errors) && ok;
    if (!requireStrictObject(tablet.size, `${path}.tablet.size`, errors, ["width", "height"])) {
        return false;
    }
    ok = requireFiniteNumber((tablet.size as Record<string, unknown>).width, `${path}.tablet.size.width`, errors) && ok;
    ok = requireFiniteNumber((tablet.size as Record<string, unknown>).height, `${path}.tablet.size.height`, errors) && ok;
    if (!requireArray(obj.sections, `${path}.sections`, errors)) {
        return false;
    }
    obj.sections.forEach((entry, index) => {
        ok = validateSection(entry, `${path}.sections[${index}]`, errors) && ok;
    });
    return ok;
}

function validateTeamTablet(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["team", "tablet", "name"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireFiniteNumber(obj.team, `${path}.team`, errors, { integer: true }) && ok;
    ok = requireString(obj.tablet, `${path}.tablet`, errors) && ok;
    ok = requireString(obj.name, `${path}.name`, errors, { allowEmpty: true }) && ok;
    return ok;
}

function validateMatchTablet(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["comp_level", "match_number", "set_number", "teamnumber", "teamname", "tablet", "alliance"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireEnum(obj.comp_level, `${path}.comp_level`, errors, matchLevels) && ok;
    ok = requireFiniteNumber(obj.match_number, `${path}.match_number`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.set_number, `${path}.set_number`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.teamnumber, `${path}.teamnumber`, errors, { integer: true }) && ok;
    ok = requireString(obj.teamname, `${path}.teamname`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.tablet, `${path}.tablet`, errors) && ok;
    ok = requireEnum(obj.alliance, `${path}.alliance`, errors, playoffAlliances) && ok;
    return ok;
}

function validatePlayoffAssignment(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["match", "tablet", "alliance", "which"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireFiniteNumber(obj.match, `${path}.match`, errors, { integer: true }) && ok;
    ok = requireString(obj.tablet, `${path}.tablet`, errors) && ok;
    ok = requireEnum(obj.alliance, `${path}.alliance`, errors, playoffAlliances) && ok;
    ok = requireFiniteNumber(obj.which, `${path}.which`, errors, { integer: true }) && ok;
    return ok;
}

function validatePlayoffStatus(value: unknown, path: string, errors: string[]): value is IPCPlayoffStatus {
    if (!requireStrictObject(value, path, errors, ["alliances", "outcomes"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    if (!requireArray(obj.alliances, `${path}.alliances`, errors)) {
        return false;
    }
    if (obj.alliances.length !== 8) {
        addError(errors, `${path}.alliances`, "must contain exactly 8 alliance slots");
        ok = false;
    }
    obj.alliances.forEach((entry, index) => {
        if (entry === undefined || entry === null) {
            return;
        }
        if (!requireStrictObject(entry, `${path}.alliances[${index}]`, errors, ["teams"])) {
            ok = false;
            return;
        }
        const teamObj = entry as Record<string, unknown>;
        if (!requireArray(teamObj.teams, `${path}.alliances[${index}].teams`, errors) || teamObj.teams.length !== 3) {
            ok = false;
            return;
        }
        teamObj.teams.forEach((team, teamIndex) => {
            ok = requireFiniteNumber(team, `${path}.alliances[${index}].teams[${teamIndex}]`, errors, { integer: true }) && ok;
        });
    });
    if (!requireStrictObject(obj.outcomes, `${path}.outcomes`, errors, ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12", "m13", "m14", "m15", "m16"])) {
        return false;
    }
    for (let i = 1; i <= 16; i++) {
        const key = `m${i}`;
        const entry = (obj.outcomes as Record<string, unknown>)[key];
        if (entry === undefined || entry === null) {
            continue;
        }
        if (!requireStrictObject(entry, `${path}.outcomes.${key}`, errors, ["winner", "loser"])) {
            ok = false;
            continue;
        }
        ok = requireFiniteNumber((entry as Record<string, unknown>).winner, `${path}.outcomes.${key}.winner`, errors, { integer: true }) && ok;
        ok = requireFiniteNumber((entry as Record<string, unknown>).loser, `${path}.outcomes.${key}.loser`, errors, { integer: true }) && ok;
    }
    return ok;
}

function validateBAEvent(value: unknown, path: string, errors: string[]): value is BAEvent {
    if (!requireStrictObject(value, path, errors, ["key", "name", "event_code", "event_type", "district", "city", "state_prov", "country", "start_date", "end_date", "year", "short_name", "event_type_string", "week", "address", "postal_code", "gmaps_place_id", "gmaps_url", "lat", "lng", "location_name", "timezone", "website", "first_event_id", "first_event_code", "webcasts", "division_keys", "parent_event_key", "playoff_type", "playoff_type_string"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.key, `${path}.key`, errors) && ok;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireFiniteNumber(obj.event_type, `${path}.event_type`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.year, `${path}.year`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.week, `${path}.week`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.lat, `${path}.lat`, errors) && ok;
    ok = requireFiniteNumber(obj.lng, `${path}.lng`, errors) && ok;
    ok = requireFiniteNumber(obj.playoff_type, `${path}.playoff_type`, errors, { integer: true }) && ok;
    ["event_code", "city", "state_prov", "country", "start_date", "end_date", "short_name", "event_type_string", "address", "postal_code", "gmaps_place_id", "gmaps_url", "location_name", "timezone", "website", "first_event_id", "first_event_code", "parent_event_key", "playoff_type_string"].forEach((key) => {
        ok = requireString(obj[key], `${path}.${key}`, errors, { allowEmpty: true }) && ok;
    });
    if (!requireStrictObject(obj.district, `${path}.district`, errors, ["abbreviation", "display_name", "key", "year"])) {
        ok = false;
    }
    else {
        const district = obj.district as Record<string, unknown>;
        ok = requireString(district.abbreviation, `${path}.district.abbreviation`, errors, { allowEmpty: true }) && ok;
        ok = requireString(district.display_name, `${path}.district.display_name`, errors, { allowEmpty: true }) && ok;
        ok = requireString(district.key, `${path}.district.key`, errors, { allowEmpty: true }) && ok;
        ok = requireFiniteNumber(district.year, `${path}.district.year`, errors, { integer: true }) && ok;
    }
    if (!requireArray(obj.webcasts, `${path}.webcasts`, errors)) {
        ok = false;
    }
    else {
        obj.webcasts.forEach((entry, index) => {
            if (!requireStrictObject(entry, `${path}.webcasts[${index}]`, errors, ["type", "channel", "date", "file"])) {
                ok = false;
                return;
            }
            const webcast = entry as Record<string, unknown>;
            ok = requireString(webcast.type, `${path}.webcasts[${index}].type`, errors, { allowEmpty: true }) && ok;
            ok = requireString(webcast.channel, `${path}.webcasts[${index}].channel`, errors, { allowEmpty: true }) && ok;
            ok = requireString(webcast.date, `${path}.webcasts[${index}].date`, errors, { allowEmpty: true }) && ok;
            ok = requireString(webcast.file, `${path}.webcasts[${index}].file`, errors, { allowEmpty: true }) && ok;
        });
    }
    ok = validateStringArray(obj.division_keys, `${path}.division_keys`, errors, { unique: true }) && ok;
    return ok;
}

function validateBATeam(value: unknown, path: string, errors: string[]): value is BATeam {
    if (!requireStrictObject(value, path, errors, ["key", "team_number", "nickname", "name", "school_name", "city", "state_prov", "country", "address", "postal_code", "gmaps_place_id", "gmaps_url", "lat", "lng", "location_name", "website", "rookie_year"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.key, `${path}.key`, errors) && ok;
    ok = requireFiniteNumber(obj.team_number, `${path}.team_number`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.lat, `${path}.lat`, errors) && ok;
    ok = requireFiniteNumber(obj.lng, `${path}.lng`, errors) && ok;
    ok = requireFiniteNumber(obj.rookie_year, `${path}.rookie_year`, errors, { integer: true }) && ok;
    ["nickname", "name", "school_name", "city", "state_prov", "country", "address", "postal_code", "gmaps_place_id", "gmaps_url", "location_name", "website"].forEach((key) => {
        ok = requireString(obj[key], `${path}.${key}`, errors, { allowEmpty: true }) && ok;
    });
    return ok;
}

function validateBAMatch(value: unknown, path: string, errors: string[]): value is BAMatch {
    if (!requireStrictObject(value, path, errors, ["key", "comp_level", "set_number", "match_number", "alliances", "winning_alliance", "event_key", "time", "actual_time", "predicted_time", "post_result_time", "score_breakdown", "videos"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.key, `${path}.key`, errors) && ok;
    ok = requireEnum(obj.comp_level, `${path}.comp_level`, errors, matchLevels) && ok;
    ok = requireFiniteNumber(obj.set_number, `${path}.set_number`, errors, { integer: true }) && ok;
    ok = requireFiniteNumber(obj.match_number, `${path}.match_number`, errors, { integer: true }) && ok;
    if (!requireStrictObject(obj.alliances, `${path}.alliances`, errors, ["red", "blue"])) {
        return false;
    }
    (["red", "blue"] as const).forEach((alliance) => {
        const node = (obj.alliances as Record<string, unknown>)[alliance];
        if (!requireStrictObject(node, `${path}.alliances.${alliance}`, errors, ["score", "team_keys", "surrogate_team_keys", "dq_team_keys"])) {
            ok = false;
            return;
        }
        const one = node as Record<string, unknown>;
        if (one.score !== undefined) {
            ok = requireFiniteNumber(one.score, `${path}.alliances.${alliance}.score`, errors, { integer: true }) && ok;
        }
        ok = validateStringArray(one.team_keys, `${path}.alliances.${alliance}.team_keys`, errors) && ok;
        if (Array.isArray(one.team_keys) && one.team_keys.length !== 3) {
            addError(errors, `${path}.alliances.${alliance}.team_keys`, "must contain exactly 3 team keys");
            ok = false;
        }
        ["surrogate_team_keys", "dq_team_keys"].forEach((field) => {
            const arr = one[field];
            if (arr === undefined) {
                return;
            }
            if (!requireArray(arr, `${path}.alliances.${alliance}.${field}`, errors)) {
                ok = false;
                return;
            }
            arr.forEach((entry, index) => {
                if (typeof entry !== "string" && !(typeof entry === "number" && Number.isFinite(entry))) {
                    addError(errors, `${path}.alliances.${alliance}.${field}[${index}]`, `expected string or finite number but got ${describeValue(entry)}`);
                    ok = false;
                }
            });
        });
    });
    ["winning_alliance", "event_key"].forEach((key) => {
        if (obj[key] !== undefined) {
            ok = requireString(obj[key], `${path}.${key}`, errors, { allowEmpty: true }) && ok;
        }
    });
    ["time", "actual_time", "predicted_time", "post_result_time"].forEach((key) => {
        if (obj[key] !== undefined) {
            ok = requireFiniteNumber(obj[key], `${path}.${key}`, errors) && ok;
        }
    });
    if (obj.videos !== undefined) {
        if (!requireArray(obj.videos, `${path}.videos`, errors)) {
            ok = false;
        }
        else {
            obj.videos.forEach((entry, index) => {
                if (!requireStrictObject(entry, `${path}.videos[${index}]`, errors, ["type", "key"])) {
                    ok = false;
                    return;
                }
                ok = requireString((entry as Record<string, unknown>).type, `${path}.videos[${index}].type`, errors) && ok;
                ok = requireString((entry as Record<string, unknown>).key, `${path}.videos[${index}].key`, errors) && ok;
            });
        }
    }
    return ok;
}

function validateFormula(value: unknown, path: string, errors: string[]): value is IPCFormula {
    if (!requireStrictObject(value, path, errors, ["name", "desc", "formula", "owner"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireString(obj.desc, `${path}.desc`, errors, { allowEmpty: true }) && ok;
    ok = requireString(obj.formula, `${path}.formula`, errors, { allowEmpty: true }) && ok;
    ok = requireEnum(obj.owner, `${path}.owner`, errors, appTypes) && ok;
    return ok;
}

function validateDataSet(value: unknown, path: string, errors: string[]): value is IPCDataSet {
    if (!requireStrictObject(value, path, errors, ["name", "matches", "formula"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireString(obj.name, `${path}.name`, errors) && ok;
    ok = requireString(obj.formula, `${path}.formula`, errors, { allowEmpty: true }) && ok;
    if (!requireStrictObject(obj.matches, `${path}.matches`, errors, ["kind", "first", "last", "comp_level", "match_number", "set_number"])) {
        return false;
    }
    const matches = obj.matches as Record<string, unknown>;
    ok = requireString(matches.kind, `${path}.matches.kind`, errors) && ok;
    if (typeof matches.kind === "string") {
        if (matches.kind === "specific") {
            ok = requireEnum(matches.comp_level, `${path}.matches.comp_level`, errors, matchLevels) && ok;
            ok = requireFiniteNumber(matches.match_number, `${path}.matches.match_number`, errors, { integer: true }) && ok;
            ok = requireFiniteNumber(matches.set_number, `${path}.matches.set_number`, errors, { integer: true }) && ok;
        }
        else {
            ok = requireFiniteNumber(matches.first, `${path}.matches.first`, errors, { integer: true }) && ok;
            ok = requireFiniteNumber(matches.last, `${path}.matches.last`, errors, { integer: true }) && ok;
        }
    }
    return ok;
}

function validateProjectInfo(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["frcev_", "uuid_", "name_", "locked_", "hidden_hints_", "data_info_", "dataset_info_", "picklist_info_", "team_info_", "formula_info_", "tablet_info_", "match_info_", "graph_info_", "form_info_", "team_db_info_", "match_db_info_", "playoff_info_"])) {
        return false;
    }

    const obj = value as Record<string, unknown>;
    let ok = true;
    if (obj.frcev_ !== undefined) {
        ok = validateBAEvent(obj.frcev_, `${path}.frcev_`, errors) && ok;
    }
    if (obj.uuid_ !== undefined) {
        ok = requireString(obj.uuid_, `${path}.uuid_`, errors) && ok;
    }
    if (obj.name_ !== undefined) {
        ok = requireString(obj.name_, `${path}.name_`, errors, { allowEmpty: true }) && ok;
    }
    ok = requireBoolean(obj.locked_, `${path}.locked_`, errors) && ok;
    ok = validateStringArray(obj.hidden_hints_, `${path}.hidden_hints_`, errors, { unique: true }) && ok;

    if (!requireStrictObject(obj.data_info_, `${path}.data_info_`, errors, ["matchdb_col_config_", "teamdb_col_config_", "scouted_team_", "scouted_match_", "match_results_", "team_results_", "match_formulas_", "team_formulas_"])) {
        return false;
    }
    const dataInfo = obj.data_info_ as Record<string, unknown>;
    if (dataInfo.matchdb_col_config_ !== undefined) {
        ok = validateColumnConfig(dataInfo.matchdb_col_config_, `${path}.data_info_.matchdb_col_config_`, errors) && ok;
    }
    if (dataInfo.teamdb_col_config_ !== undefined) {
        ok = validateColumnConfig(dataInfo.teamdb_col_config_, `${path}.data_info_.teamdb_col_config_`, errors) && ok;
    }
    ok = validateNumberArray(dataInfo.scouted_team_, `${path}.data_info_.scouted_team_`, errors, { integer: true }) && ok;
    ok = validateStringArray(dataInfo.scouted_match_, `${path}.data_info_.scouted_match_`, errors, { nonEmpty: true, unique: true }) && ok;
    ok = validateScoutResultArray(dataInfo.match_results_, `${path}.data_info_.match_results_`, errors) && ok;
    ok = validateScoutResultArray(dataInfo.team_results_, `${path}.data_info_.team_results_`, errors) && ok;
    ok = validateFormulaCheckArray(dataInfo.match_formulas_, `${path}.data_info_.match_formulas_`, errors) && ok;
    ok = validateFormulaCheckArray(dataInfo.team_formulas_, `${path}.data_info_.team_formulas_`, errors) && ok;

    if (!requireStrictObject(obj.dataset_info_, `${path}.dataset_info_`, errors, ["datasets_"])) {
        return false;
    }
    if (!requireArray((obj.dataset_info_ as Record<string, unknown>).datasets_, `${path}.dataset_info_.datasets_`, errors)) {
        return false;
    }
    ((obj.dataset_info_ as Record<string, unknown>).datasets_ as unknown[]).forEach((entry, index) => {
        ok = validateDataSet(entry, `${path}.dataset_info_.datasets_[${index}]`, errors) && ok;
    });

    if (!requireStrictObject(obj.picklist_info_, `${path}.picklist_info_`, errors, ["picklist_", "coaches_picklist_"])) {
        return false;
    }
    ok = validatePicklistArray((obj.picklist_info_ as Record<string, unknown>).picklist_, `${path}.picklist_info_.picklist_`, errors) && ok;
    ok = validatePicklistArray((obj.picklist_info_ as Record<string, unknown>).coaches_picklist_, `${path}.picklist_info_.coaches_picklist_`, errors) && ok;

    if (!requireStrictObject(obj.team_info_, `${path}.team_info_`, errors, ["teams_"])) {
        return false;
    }
    ok = validateBATeamArray((obj.team_info_ as Record<string, unknown>).teams_, `${path}.team_info_.teams_`, errors) && ok;

    if (!requireStrictObject(obj.formula_info_, `${path}.formula_info_`, errors, ["formulas_", "coach_formulas_"])) {
        return false;
    }
    ok = validateFormulaArray((obj.formula_info_ as Record<string, unknown>).formulas_, `${path}.formula_info_.formulas_`, errors) && ok;
    ok = validateFormulaArray((obj.formula_info_ as Record<string, unknown>).coach_formulas_, `${path}.formula_info_.coach_formulas_`, errors) && ok;

    if (!requireStrictObject(obj.tablet_info_, `${path}.tablet_info_`, errors, ["tablets_", "teamassignments_", "matchassignements_", "playoffassignments_"])) {
        return false;
    }
    ok = validateTabletArray((obj.tablet_info_ as Record<string, unknown>).tablets_, `${path}.tablet_info_.tablets_`, errors) && ok;
    ok = validateTeamAssignmentArray((obj.tablet_info_ as Record<string, unknown>).teamassignments_, `${path}.tablet_info_.teamassignments_`, errors) && ok;
    ok = validateMatchAssignmentArray((obj.tablet_info_ as Record<string, unknown>).matchassignements_, `${path}.tablet_info_.matchassignements_`, errors) && ok;
    ok = validatePlayoffAssignmentArray((obj.tablet_info_ as Record<string, unknown>).playoffassignments_, `${path}.tablet_info_.playoffassignments_`, errors) && ok;

    if (!requireStrictObject(obj.match_info_, `${path}.match_info_`, errors, ["matches_"])) {
        return false;
    }
    ok = validateBAMatchArray((obj.match_info_ as Record<string, unknown>).matches_, `${path}.match_info_.matches_`, errors) && ok;

    if (!requireStrictObject(obj.graph_info_, `${path}.graph_info_`, errors, ["single_team_configs_", "coach_configs_", "match_sim_configs_", "auto_analysis_configs_"])) {
        return false;
    }
    ok = validateGraphArray((obj.graph_info_ as Record<string, unknown>).single_team_configs_, `${path}.graph_info_.single_team_configs_`, errors) && ok;
    ok = validateGraphArray((obj.graph_info_ as Record<string, unknown>).coach_configs_, `${path}.graph_info_.coach_configs_`, errors) && ok;
    ok = validateLooseArray((obj.graph_info_ as Record<string, unknown>).match_sim_configs_, `${path}.graph_info_.match_sim_configs_`, errors) && ok;
    ok = validateLooseArray((obj.graph_info_ as Record<string, unknown>).auto_analysis_configs_, `${path}.graph_info_.auto_analysis_configs_`, errors) && ok;

    if (!requireStrictObject(obj.form_info_, `${path}.form_info_`, errors, ["teamform_", "matchform_"])) {
        return false;
    }
    if ((obj.form_info_ as Record<string, unknown>).teamform_ !== undefined) {
        ok = requireString((obj.form_info_ as Record<string, unknown>).teamform_, `${path}.form_info_.teamform_`, errors) && ok;
    }
    if ((obj.form_info_ as Record<string, unknown>).matchform_ !== undefined) {
        ok = requireString((obj.form_info_ as Record<string, unknown>).matchform_, `${path}.form_info_.matchform_`, errors) && ok;
    }

    ok = validateModelInfo(obj.team_db_info_, `${path}.team_db_info_`, errors) && ok;
    ok = validateModelInfo(obj.match_db_info_, `${path}.match_db_info_`, errors) && ok;
    ok = validatePlayoffStatus(obj.playoff_info_, `${path}.playoff_info_`, errors) && ok;
    return ok;
}

function validateColumnConfig(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["columns", "frozenColumnCount"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    let ok = true;
    ok = requireFiniteNumber(obj.frozenColumnCount, `${path}.frozenColumnCount`, errors, { integer: true }) && ok;
    if (!requireArray(obj.columns, `${path}.columns`, errors)) {
        return false;
    }
    obj.columns.forEach((entry, index) => {
        if (!requireStrictObject(entry, `${path}.columns[${index}]`, errors, ["name", "width", "hidden"])) {
            ok = false;
            return;
        }
        const col = entry as Record<string, unknown>;
        ok = requireString(col.name, `${path}.columns[${index}].name`, errors) && ok;
        ok = requireFiniteNumber(col.width, `${path}.columns[${index}].width`, errors, { integer: true }) && ok;
        ok = requireBoolean(col.hidden, `${path}.columns[${index}].hidden`, errors) && ok;
    });
    return ok;
}

function validateNumberArray(value: unknown, path: string, errors: string[], opts?: { integer?: boolean }): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = requireFiniteNumber(entry, `${path}[${index}]`, errors, { integer: opts?.integer }) && ok;
    });
    return ok;
}

function validateScoutResultArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateScoutResult(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateFormulaCheckArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        if (!requireStrictObject(entry, `${path}[${index}]`, errors, ["columns", "formula", "type", "message", "background", "color", "fontFamily", "fontSize", "fontStyle", "fontWeight"])) {
            ok = false;
            return;
        }
        const obj = entry as Record<string, unknown>;
        ok = validateStringArray(obj.columns, `${path}[${index}].columns`, errors, { nonEmpty: true }) && ok;
        ["formula", "type", "message", "background", "color", "fontFamily", "fontStyle", "fontWeight"].forEach((key) => {
            ok = requireString(obj[key], `${path}[${index}].${key}`, errors, { allowEmpty: key !== "formula" }) && ok;
        });
        ok = requireFiniteNumber(obj.fontSize, `${path}[${index}].fontSize`, errors) && ok;
    });
    return ok;
}

function validatePicklistArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validatePicklistConfig(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateBATeamArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateBATeam(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateFormulaArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateFormula(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateTabletArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateTabletDefn(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateTeamAssignmentArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateTeamTablet(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateMatchAssignmentArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateMatchTablet(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validatePlayoffAssignmentArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validatePlayoffAssignment(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateBAMatchArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateBAMatch(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateGraphArray(value: unknown, path: string, errors: string[]): boolean {
    if (!requireArray(value, path, errors)) {
        return false;
    }
    let ok = true;
    value.forEach((entry, index) => {
        ok = validateGraphConfig(entry, `${path}[${index}]`, errors) && ok;
    });
    return ok;
}

function validateLooseArray(value: unknown, path: string, errors: string[]): boolean {
    return requireArray(value, path, errors);
}

function validateModelInfo(value: unknown, path: string, errors: string[]): boolean {
    if (!requireStrictObject(value, path, errors, ["col_descs_"])) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    if (!requireArray(obj.col_descs_, `${path}.col_descs_`, errors)) {
        return false;
    }
    let ok = true;
    obj.col_descs_.forEach((entry, index) => {
        ok = validateColumnDesc(entry, `${path}.col_descs_[${index}]`, errors) && ok;
    });
    return ok;
}

function buildResult<T>(value: unknown, validator: Validator<T>, label: string): ValidationResult<T> {
    const errors: string[] = [];
    if (validator(value, label, errors) && errors.length === 0) {
        return { ok: true, value: value as T };
    }
    return { ok: false, errors };
}

function parseJson<T>(packetName: string, payload: string, validator: Validator<T>): ValidationResult<T> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(payload);
    }
    catch (err) {
        return { ok: false, errors: [`${packetName} is not valid JSON: ${(err as Error).message}`] };
    }
    return buildResult(parsed, validator, packetName);
}

function stringifyJson<T>(packetName: string, value: unknown, validator: Validator<T>): ValidationResult<string> {
    const validated = buildResult(value, validator, packetName);
    if (!validated.ok) {
        return validated;
    }
    return { ok: true, value: JSON.stringify(value) };
}

export function summarizeValidationErrors(errors: string[], limit: number = 8): string {
    const shown = errors.slice(0, limit);
    const remaining = errors.length - shown.length;
    let message = shown.join("\n");
    if (remaining > 0) {
        message += `\n...and ${remaining} more`;
    }
    return message;
}

export function validateScoutResultsPayload(value: unknown): ValidationResult<IPCScoutResults> {
    return buildResult(value, validateScoutResults, "ProvideResults");
}

export function stringifyScoutResultsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideResults", value, validateScoutResults);
}

export function parseScoutResultsPayload(payload: string): ValidationResult<IPCScoutResults> {
    return parseJson("ProvideResults", payload, validateScoutResults);
}

export function stringifyScoutHelloPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("HelloFromScouter", value, validateScoutHello);
}

export function parseScoutHelloPayload(payload: string): ValidationResult<{ name: string; purpose: string }> {
    return parseJson("HelloFromScouter", payload, validateScoutHello);
}

export function stringifyCoachGraphsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideCoachGraphs", value, (v, p, e) => validateGraphArray(v, p, e));
}

export function parseCoachGraphsPayload(payload: string): ValidationResult<IPCGraphConfig[]> {
    return parseJson("ProvideCoachGraphs", payload, (v, p, e) => validateGraphArray(v, p, e));
}

export function stringifyCoachPicklistsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideCoachPickLists", value, (v, p, e) => validatePicklistArray(v, p, e));
}

export function parseCoachPicklistsPayload(payload: string): ValidationResult<IPCPickListConfig[]> {
    return parseJson("ProvideCoachPickLists", payload, (v, p, e) => validatePicklistArray(v, p, e));
}

export function parseHelloResponsePayload(payload: string, packetName: string): ValidationResult<{ uuid?: string; name: string }> {
    return parseJson(packetName, payload, validateHelloResponse);
}

export function stringifyHelloResponsePayload(value: unknown, packetName: string): ValidationResult<string> {
    return stringifyJson(packetName, value, validateHelloResponse);
}

export function parseTabletsPayload(payload: string): ValidationResult<IPCTabletDefn[]> {
    return parseJson("ProvideTablets", payload, (v, p, e) => validateTabletArray(v, p, e));
}

export function stringifyTabletsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideTablets", value, (v, p, e) => validateTabletArray(v, p, e));
}

export function parseFormPayload(payload: string, packetName: string): ValidationResult<IPCForm> {
    return parseJson(packetName, payload, validateForm);
}

export function stringifyStringArrayPayload(value: unknown, packetName: string): ValidationResult<string> {
    return stringifyJson(packetName, value, (v, p, e) => validateStringArray(v, p, e, { nonEmpty: true, unique: true }));
}

export function parseImagesPayload(payload: string): ValidationResult<Record<string, IPCSyncedImageData>> {
    return parseJson("ProvideImages", payload, validateImagePayloadMap);
}

export function stringifyImagesPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideImages", value, validateImagePayloadMap);
}

export function parseScoutResultArrayPayload(payload: string, packetName: string): ValidationResult<IPCScoutResult[]> {
    return parseJson(packetName, payload, (v, p, e) => validateScoutResultArray(v, p, e));
}

export function stringifyScoutResultArrayPayload(value: unknown, packetName: string): ValidationResult<string> {
    return stringifyJson(packetName, value, (v, p, e) => validateScoutResultArray(v, p, e));
}

export function parseRequestedNamesPayload(payload: string, packetName: string): ValidationResult<string[]> {
    return parseJson(packetName, payload, (v, p, e) => validateStringArray(v, p, e, { nonEmpty: true, unique: true }));
}

export function parseTeamAssignmentsPayload(payload: string): ValidationResult<unknown[]> {
    return parseJson("ProvideTeamList", payload, (v, p, e) => validateTeamAssignmentArray(v, p, e));
}

export function parseMatchAssignmentsPayload(payload: string): ValidationResult<unknown[]> {
    return parseJson("ProvideMatchList", payload, (v, p, e) => validateMatchAssignmentArray(v, p, e));
}

export function stringifyTeamAssignmentsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideTeamList", value, (v, p, e) => validateTeamAssignmentArray(v, p, e));
}

export function stringifyMatchAssignmentsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideMatchList", value, (v, p, e) => validateMatchAssignmentArray(v, p, e));
}

export function parsePlayoffAssignmentsPayload(payload: string): ValidationResult<unknown[] | null> {
    return parseJson("ProvidePlayoffAssignments", payload, (v, p, e) => v === null || validatePlayoffAssignmentArray(v, p, e));
}

export function stringifyPlayoffAssignmentsPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvidePlayoffAssignments", value, (v, p, e) => v === null || validatePlayoffAssignmentArray(v, p, e));
}

export function parsePlayoffStatusPayload(payload: string): ValidationResult<IPCPlayoffStatus | null> {
    return parseJson("ProvidePlayoffStatus", payload, (v, p, e) => v === null || validatePlayoffStatus(v, p, e));
}

export function stringifyPlayoffStatusPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvidePlayoffStatus", value, (v, p, e) => v === null || validatePlayoffStatus(v, p, e));
}

export function parseProjectInfoPayload(payload: string): ValidationResult<unknown> {
    return parseJson("ProvideProject", payload, validateProjectInfo);
}

export function stringifyProjectInfoPayload(value: unknown): ValidationResult<string> {
    return stringifyJson("ProvideProject", value, validateProjectInfo);
}

export function validateScoutSyncPreflight(value: unknown): ValidationResult<IPCScoutResults> {
    return buildResult(value, validateScoutResults, "ScoutSyncPreflight");
}

export function validateCoachSyncPreflight(graphs: unknown, picklists: unknown): ValidationResult<true> {
    const errors: string[] = [];
    validateGraphArray(graphs, "CoachSyncPreflight.graphs", errors);
    validatePicklistArray(picklists, "CoachSyncPreflight.picklists", errors);
    if (Array.isArray(graphs)) {
        graphs.forEach((graph, index) => {
            if (isObject(graph) && graph.owner !== "coach") {
                addError(errors, `CoachSyncPreflight.graphs[${index}].owner`, "must be 'coach'");
            }
        });
    }
    if (Array.isArray(picklists)) {
        picklists.forEach((picklist, index) => {
            if (isObject(picklist) && picklist.owner !== "coach") {
                addError(errors, `CoachSyncPreflight.picklists[${index}].owner`, "must be 'coach'");
            }
        });
    }
    if (errors.length > 0) {
        return { ok: false, errors };
    }
    return { ok: true, value: true };
}
