import {  XeroWidget  } from "./xerowidget.js";

export type SplitterOrientation = "horizontal" | "vertical";

export class XeroSplitter extends XeroWidget {

    private bar_width_ = 7 ;
    private bar_ : XeroWidget ;
    private first_ : XeroWidget ;
    private second_ : XeroWidget ;
    private orientation_ : SplitterOrientation ;
    private mouse_move_handler_ : (event: MouseEvent) => void  ;
    private mouse_up_handler_ : (event: MouseEvent) => void ;

    constructor(orientation: SplitterOrientation, first: XeroWidget, second: XeroWidget, bar_width: number = 5) {
        super('div', 'xero-splitter') ;

        this.orientation_ = orientation;
        this.bar_width_ = bar_width;
        this.first_ = first;
        this.second_ = second;

        this.elem.style.display = "flex";
        this.elem.style.width = "100%";
        this.elem.style.height = "100%";

        this.bar_ = new XeroWidget('div', 'xero-splitter-bar');

        this.first_.setParentWidget(this) ;
        this.bar_.setParentWidget(this) ;
        this.second_.setParentWidget(this) ;

        this.first_.elem.style.flexGrow = "1";
        this.bar_.elem.style.flexGrow = "0";
        this.second_.elem.style.flexGrow = "1";

        if (this.orientation_ == "horizontal") {
            this.bar_.elem.style.width = `${this.bar_width_}px`;
            this.bar_.elem.style.height = "100%";
            this.elem.style.flexDirection = "row" ;
            this.bar_.elem.style.cursor = "col-resize";
        }
        else {
            this.bar_.elem.style.width = "100%" ;
            this.bar_.elem.style.height = `${this.bar_width_}px`;
            this.elem.style.flexDirection = "column" ;
            this.bar_.elem.style.cursor = "row-resize";
        }

        this.setSplit(5) ;

        document.addEventListener('mousedown', this.mouseDownHandler.bind(this));
        this.mouse_move_handler_ = this.mouseMoveHandler.bind(this);
        this.mouse_up_handler_ = this.mouseUpHandler.bind(this);

    }

    public setSplit(percent: number) {
        if (this.orientation_ == "horizontal") {
            this.first_.elem.style.width = `${percent}%`;
            this.second_.elem.style.width = `calc(100% - ${percent}% - ${this.bar_width_}px)`; // 10px for the splitter bar
        } else {
            this.first_.elem.style.height = `${percent}%`;
            this.second_.elem.style.height = `calc(100% - ${percent}% - ${this.bar_width_}px)`; // 10px for the splitter bar
        }
    }

    private mouseDownHandler(event: MouseEvent) {
        if (event.target === this.bar_.elem) {

            document.addEventListener('mousemove', this.mouse_move_handler_);
            document.addEventListener('mouseup', this.mouse_up_handler_);
        }
    }

    private mouseMoveHandler(event: MouseEvent) {
        if (this.orientation_ == "horizontal") {
            const newWidth = event.clientX - this.elem.getBoundingClientRect().left;
            this.first_.elem.style.width = `${newWidth}px`;
            this.second_.elem.style.width = `calc(100% - ${newWidth}px - ${this.bar_width_}px)`; // 10px for the splitter bar
        } else {
            const newHeight = event.clientY - this.elem.getBoundingClientRect().top;
            this.first_.elem.style.height = `${newHeight}px`;
            this.second_.elem.style.height = `calc(100% - ${newHeight}px - ${this.bar_width_}px)`; // 10px for the splitter bar
        }
    }

    private mouseUpHandler(event: MouseEvent) {
        document.removeEventListener('mousemove', this.mouse_move_handler_!);
        document.removeEventListener('mouseup', this.mouse_up_handler_!);
    }
}
