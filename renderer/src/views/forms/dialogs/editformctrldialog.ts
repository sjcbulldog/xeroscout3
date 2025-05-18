import {  FormControl  } from "../controls/formctrl.js";
import {  XeroDialog  } from "../../../widgets/xerodialog.js";
import {  IPCDataValueType  } from "../../../ipc.js";

export interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<FontData[]>;
  }
}

export abstract class EditFormControlDialog extends XeroDialog {
  protected formctrl_: FormControl;
  protected font_name_?: HTMLSelectElement;
  protected font_size_?: HTMLInputElement;
  protected font_style_?: HTMLSelectElement;
  protected font_weight_?: HTMLSelectElement;
  protected text_color_?: HTMLInputElement;
  protected background_color_?: HTMLInputElement;
  protected transparent_?: HTMLInputElement;
  protected tag_?: HTMLInputElement;
  protected orientation_?: HTMLSelectElement;

  constructor(title: string, formctr: FormControl) {
    super(title);
    this.formctrl_ = formctr;
  }

  public okButton(event: Event) {
    this.extractData(); // Extract the item data form the dialog
    this.formctrl_.updateFromItem(true, undefined, undefined); // Make the control on the screen match the item data
    super.okButton(event); // Finish the edit operation, save the form, and dismiss the dialog
  }

  protected abstract extractData(): void;

  protected queryLocalFonts(): Promise<FontData[]> {
    return new Promise((resolve, reject) => {
      window.queryLocalFonts!()
        .then((fonts: FontData[]) => {
          resolve(fonts);
        })
        .catch((error: Error) => {
          resolve([]); // Return an empty array on error
        });
    });
  }

  protected async populateFontSelector(div: HTMLElement) {
    let label: HTMLLabelElement;
    let option: HTMLOptionElement;

    this.font_name_ = document.createElement("select");
    this.font_name_.className = "xero-popup-form-edit-dialog-select";
    let fonts = await this.queryLocalFonts();
    for (let font of fonts) {
      option = document.createElement("option");
      option.value = font.fullName;
      option.innerText = font.fullName;
      this.font_name_.appendChild(option);
    }
    this.font_name_.value = this.formctrl_.item.fontFamily;

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Font";
    label.appendChild(this.font_name_);
    div.appendChild(label);

    this.font_size_ = document.createElement("input");
    this.font_size_.type = "number";
    this.font_size_.max = "48";
    this.font_size_.min = "8";
    this.font_size_.className = "xero-popup-form-edit-dialog-input";
    this.font_size_.value = this.formctrl_.item.fontSize.toString();

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Font Size";
    label.appendChild(this.font_size_);
    div.appendChild(label);

    this.font_style_ = document.createElement("select");
    this.font_style_.className = "xero-popup-form-edit-dialog-select";
    option = document.createElement("option");
    option.value = "normal";
    option.innerText = "Normal";
    this.font_style_.appendChild(option);
    option = document.createElement("option");
    option.value = "italic";
    option.innerText = "Italic";
    this.font_style_.appendChild(option);
    this.font_style_.value = this.formctrl_.item.fontStyle;

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Font Style";
    label.appendChild(this.font_style_);
    div.appendChild(label);

    this.font_weight_ = document.createElement("select");
    this.font_weight_.className = "xero-popup-form-edit-dialog-select";
    option = document.createElement("option");
    option.value = "normal";
    option.innerText = "Normal";
    this.font_weight_.appendChild(option);
    option = document.createElement("option");
    option.value = "bold";
    option.innerText = "Bold";
    this.font_weight_.appendChild(option);
    option = document.createElement("option");
    option.value = "bolder";
    option.innerText = "Bolder";
    this.font_weight_.appendChild(option);
    option = document.createElement("option");
    option.value = "lighter";
    option.innerText = "Lighter";
    this.font_weight_.appendChild(option);
    this.font_weight_.value = this.formctrl_.item.fontWeight;

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Font Weight";
    label.appendChild(this.font_weight_);
    div.appendChild(label);
  }

  protected populateForegroundColor(div: HTMLElement) {
    let label: HTMLLabelElement;

    this.text_color_ = document.createElement("input");
    this.text_color_.className = "xero-popup-form-edit-dialog-color";
    this.text_color_.type = "color";
    this.text_color_.value = EditFormControlDialog.colorNameToHex(
      this.formctrl_.item.color
    );

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Foreground Color";
    label.appendChild(this.text_color_);
    div.appendChild(label);    
  }

  protected populateBackgroundColor(div: HTMLElement) {
    let label: HTMLLabelElement;

    this.background_color_ = document.createElement("input");
    this.background_color_.type = "color";
    this.background_color_.className = "xero-popup-form-edit-dialog-color";
    this.background_color_.value = EditFormControlDialog.colorNameToHex(
      this.formctrl_.item.background
    );

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Background Color";
    label.appendChild(this.background_color_);
    div.appendChild(label);
  }

  protected populateTransparent(div: HTMLElement) {
    let label: HTMLLabelElement;

    this.transparent_ = document.createElement("input");
    this.transparent_.type = "checkbox";
    this.transparent_.checked = this.formctrl_.item.transparent;
    this.transparent_.className = "xero-popup-form-edit-dialog-checkbox";

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Background Transparent";
    label.appendChild(this.transparent_);
    div.appendChild(label);
  }

  protected populateColors(div: HTMLElement) {
    this.populateForegroundColor(div);
    this.populateBackgroundColor(div);
    this.populateTransparent(div);
  }

  protected populateTag(div: HTMLElement) {
    let label: HTMLLabelElement;

    this.tag_ = document.createElement("input");
    this.tag_.type = "text";
    this.tag_.className = "xero-popup-form-edit-dialog-input";
    this.tag_.value = this.formctrl_.item.tag;

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Tag";
    label.appendChild(this.tag_);
    div.appendChild(label);
  }

  protected populateOrientation(
    div: HTMLElement,
    value: "horizontal" | "vertical"
  ) {
    let option: HTMLOptionElement;
    let label: HTMLLabelElement;

    this.orientation_ = document.createElement("select");
    this.orientation_.className = "xero-popup-form-edit-dialog-select";

    option = document.createElement("option");
    option.value = "horizontal";
    option.innerText = "Horizontal";
    this.orientation_.appendChild(option);

    option = document.createElement("option");
    option.value = "vertical";
    option.innerText = "Vertical";
    this.orientation_.appendChild(option);

    this.orientation_.value = value;

    label = document.createElement("label");
    label.className = "xero-popup-form-edit-dialog-label";
    label.innerText = "Orientation";
    label.appendChild(this.orientation_);
    div.appendChild(label);
  }

  public static getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
  }

  public static colorNameToHex(color: string): string {
    var colorsMap = {
      aliceblue: "#f0f8ff",
      antiquewhite: "#faebd7",
      aqua: "#00ffff",
      aquamarine: "#7fffd4",
      azure: "#f0ffff",
      beige: "#f5f5dc",
      bisque: "#ffe4c4",
      black: "#000000",
      blanchedalmond: "#ffebcd",
      blue: "#0000ff",
      blueviolet: "#8a2be2",
      brown: "#a52a2a",
      burlywood: "#deb887",
      cadetblue: "#5f9ea0",
      chartreuse: "#7fff00",
      chocolate: "#d2691e",
      coral: "#ff7f50",
      cornflowerblue: "#6495ed",
      cornsilk: "#fff8dc",
      crimson: "#dc143c",
      cyan: "#00ffff",
      darkblue: "#00008b",
      darkcyan: "#008b8b",
      darkgoldenrod: "#b8860b",
      darkgray: "#a9a9a9",
      darkgreen: "#006400",
      darkkhaki: "#bdb76b",
      darkmagenta: "#8b008b",
      darkolivegreen: "#556b2f",
      darkorange: "#ff8c00",
      darkorchid: "#9932cc",
      darkred: "#8b0000",
      darksalmon: "#e9967a",
      darkseagreen: "#8fbc8f",
      darkslateblue: "#483d8b",
      darkslategray: "#2f4f4f",
      darkturquoise: "#00ced1",
      darkviolet: "#9400d3",
      deeppink: "#ff1493",
      deepskyblue: "#00bfff",
      dimgray: "#696969",
      dodgerblue: "#1e90ff",
      firebrick: "#b22222",
      floralwhite: "#fffaf0",
      forestgreen: "#228b22",
      fuchsia: "#ff00ff",
      gainsboro: "#dcdcdc",
      ghostwhite: "#f8f8ff",
      gold: "#ffd700",
      goldenrod: "#daa520",
      gray: "#808080",
      green: "#008000",
      greenyellow: "#adff2f",
      honeydew: "#f0fff0",
      hotpink: "#ff69b4",
      "indianred ": "#cd5c5c",
      indigo: "#4b0082",
      ivory: "#fffff0",
      khaki: "#f0e68c",
      lavender: "#e6e6fa",
      lavenderblush: "#fff0f5",
      lawngreen: "#7cfc00",
      lemonchiffon: "#fffacd",
      lightblue: "#add8e6",
      lightcoral: "#f08080",
      lightcyan: "#e0ffff",
      lightgoldenrodyellow: "#fafad2",
      lightgrey: "#d3d3d3",
      lightgreen: "#90ee90",
      lightpink: "#ffb6c1",
      lightsalmon: "#ffa07a",
      lightseagreen: "#20b2aa",
      lightskyblue: "#87cefa",
      lightslategray: "#778899",
      lightsteelblue: "#b0c4de",
      lightyellow: "#ffffe0",
      lime: "#00ff00",
      limegreen: "#32cd32",
      linen: "#faf0e6",
      magenta: "#ff00ff",
      maroon: "#800000",
      mediumaquamarine: "#66cdaa",
      mediumblue: "#0000cd",
      mediumorchid: "#ba55d3",
      mediumpurple: "#9370d8",
      mediumseagreen: "#3cb371",
      mediumslateblue: "#7b68ee",
      mediumspringgreen: "#00fa9a",
      mediumturquoise: "#48d1cc",
      mediumvioletred: "#c71585",
      midnightblue: "#191970",
      mintcream: "#f5fffa",
      mistyrose: "#ffe4e1",
      moccasin: "#ffe4b5",
      navajowhite: "#ffdead",
      navy: "#000080",
      oldlace: "#fdf5e6",
      olive: "#808000",
      olivedrab: "#6b8e23",
      orange: "#ffa500",
      orangered: "#ff4500",
      orchid: "#da70d6",
      palegoldenrod: "#eee8aa",
      palegreen: "#98fb98",
      paleturquoise: "#afeeee",
      palevioletred: "#d87093",
      papayawhip: "#ffefd5",
      peachpuff: "#ffdab9",
      peru: "#cd853f",
      pink: "#ffc0cb",
      plum: "#dda0dd",
      powderblue: "#b0e0e6",
      purple: "#800080",
      rebeccapurple: "#663399",
      red: "#ff0000",
      rosybrown: "#bc8f8f",
      royalblue: "#4169e1",
      saddlebrown: "#8b4513",
      salmon: "#fa8072",
      sandybrown: "#f4a460",
      seagreen: "#2e8b57",
      seashell: "#fff5ee",
      sienna: "#a0522d",
      silver: "#c0c0c0",
      skyblue: "#87ceeb",
      slateblue: "#6a5acd",
      slategray: "#708090",
      snow: "#fffafa",
      springgreen: "#00ff7f",
      steelblue: "#4682b4",
      tan: "#d2b48c",
      teal: "#008080",
      thistle: "#d8bfd8",
      tomato: "#ff6347",
      turquoise: "#40e0d0",
      violet: "#ee82ee",
      wheat: "#f5deb3",
      white: "#ffffff",
      whitesmoke: "#f5f5f5",
      yellow: "#ffff00",
      yellowgreen: "#9acd32",
    };

    if (Object.hasOwnProperty.call(colorsMap, color)) {
      color = EditFormControlDialog.getProperty(
        colorsMap,
        color as keyof typeof colorsMap
      );
    }

    return color;
  }

  protected deduceDataType(data: string[]): IPCDataValueType {
    let type : string | undefined = "boolean";
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== "true" && data[i] !== "false") {
        type = undefined ;
        break;
      }
    }

    if (type === undefined) {
        type = 'integer' ;
        for (let i = 0; i < data.length; i++) {
          let v = parseFloat(data[i]) ;
          if (isNaN(v)) {
            type = undefined ;
            break;
          }
          if (!Number.isInteger(v)) {
            type = undefined ;
            break;
          }
        }

        if (type === undefined) {
            type = 'real' ;
            for (let i = 0; i < data.length; i++) {
                if (isNaN(parseFloat(data[i]))) {
                    type = undefined ;
                    break;
                }
            }
        }
    }

    return type === undefined ? "string" : (type as IPCDataValueType) ;
  }
}
