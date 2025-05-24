export class Keybinding {
    public readonly key: string ;
    public readonly ctrl: boolean ;
    public readonly alt: boolean ;
    public readonly shift: boolean ;
    public readonly desc: string ;
    public readonly action: (ev: KeyboardEvent) => void ;

    constructor(key: string, ctrl: boolean, alt: boolean, shift: boolean, desc: string, action: (ev: KeyboardEvent) => void) {
        this.key = key;
        this.ctrl = ctrl;
        this.alt = alt;
        this.shift = shift;
        this.desc = desc;
        this.action = action ;
    }

    public get bindingAsText() : string {
        let ret = '' ;
        if (this.ctrl) {
            ret = 'Ctrl+' + ret ;
        }
        if (this.alt) {
            ret = 'Alt+' + ret ;
        }
        if (this.shift) {
            ret = 'Shift+' + ret ;
        }

        return ret + this.key ;
    }
}

export class KeybindingManager {
    private keybindings_ : Map<string, Keybinding[]> = new Map<string, Keybinding[]>();

    constructor() {
    }

    public getAllKeybindings() : Keybinding[] {
        let ret : Keybinding[] = [] ;
        for(let key of this.keybindings_.keys()) {
            const keybindings = this.keybindings_.get(key);
            if (keybindings) {
                for(let binding of keybindings) {
                    ret.push(binding);
                }
            }
        }
        return ret;
    }

    public addKeybinding(key: string, ctrl: boolean, alt: boolean, shift: boolean, desc: string, action: (ev: KeyboardEvent) => void) {
        const keybinding = new Keybinding(key, ctrl, alt, shift, desc, action);
        if (!this.keybindings_.has(key)) {
            this.keybindings_.set(key, []);
        }
        this.keybindings_.get(key)?.push(keybinding);
    }

    public getKeybindings(key: string, ctrl: boolean, alt: boolean, shift: boolean): Keybinding | undefined {
        let ret : Keybinding | undefined = undefined;
        if (this.keybindings_.has(key)) {
            const keybindings = this.keybindings_.get(key);
            for(let binding of keybindings!) {
                if (binding.ctrl === ctrl && binding.alt === alt && binding.shift === shift) {
                    ret = binding;
                    break;
                }
            }   
        }
        return ret;
    }
}