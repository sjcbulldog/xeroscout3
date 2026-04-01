import {  XeroLogger  } from "./utils/xerologger.js";
import {  XeroMainProcessInterface  } from "./widgets/xerocbtarget.js";
import {  XeroWidget  } from "./widgets/xerowidget.js";

export class XeroNav  extends XeroWidget {
    private navelems_ : HTMLElement[] = [] ;
    private highlightedElem_ : HTMLElement | null = null ;

    public constructor() {
        super('div', 'xero-nav-list');
        this.setTestId('nav-list') ;

        this.registerCallback('send-nav-data', this.onNavData.bind(this)) ;
        this.registerCallback('send-nav-highlight', this.onNavHighlight.bind(this)) ;
        this.request('get-nav-data') ;
    }

    private onNavData(data: any) {
        let logger = XeroLogger.getInstance() ;

        this.elem.innerHTML = "" ;

        for(let item of data) {
            let navItem = document.createElement('div') ;
            navItem.className = 'xero-nav-item' ;
            navItem.xerodata = item.command ;
            navItem.dataset.navCommand = item.command ?? '' ;

            if (item.type === 'item') {
                let titleDiv = document.createElement('div');
                titleDiv.textContent = item.title;
                titleDiv.className = 'xero-nav-item-title';
                navItem.appendChild(titleDiv);
                
                if (item.teamName) {
                    let teamNameDiv = document.createElement('div');
                    teamNameDiv.textContent = item.teamName;
                    teamNameDiv.className = 'xero-nav-item-team-name';
                    navItem.appendChild(teamNameDiv);
                }
                
                navItem.className = 'xero-nav-list-item' ;
                navItem.setAttribute('data-testid', `nav-item-${XeroWidget.toTestIdSegment(item.command ?? item.title)}`) ;
                this.navelems_.push(navItem) ;

                navItem.addEventListener('click', this.navItemClicked.bind(this)) ;
            }
            else if (item.type === 'icon') {
                navItem.className = 'xero-nav-list-icon' ;
                navItem.setAttribute('data-testid', `nav-icon-${XeroWidget.toTestIdSegment(item.command ?? item.title)}`) ;
                let icon = document.createElement('img') ;
                icon.src = `data:image/png;base64,${item.icon}`
                icon.alt = item.title;
                icon.title = item.title;
                icon.width = item.width ;
                icon.height = item.height;         
                icon.xerodata = item.command ;      
                navItem.appendChild(icon) ;
                this.navelems_.push(navItem) ;

                navItem.addEventListener('click', this.navItemClicked.bind(this)) ;
            }
            else if (item.type === 'separator') {
                navItem.className = 'xero-nav-list-separator' ;
                navItem.textContent = item.title ;
                navItem.setAttribute('data-testid', `nav-separator-${XeroWidget.toTestIdSegment(item.title)}`) ;
            }

            this.elem.appendChild(navItem) ;
        }
    }

    private onNavHighlight(data: any) {
        for(let item of this.navelems_) {
            item.classList.remove('xero-nav-highlight') ;
            if (item.xerodata === data) {
                item.classList.add('xero-nav-highlight') ;
                this.highlightedElem_ = item ;
            }
        }
    }

    private navItemClicked(event: Event) {
        let logger = XeroLogger.getInstance() ;
        let target = event.target as HTMLElement ;
        
        // Find the element with xerodata, either the target itself or a parent
        let commandElement = target;
        while (commandElement && !commandElement.xerodata) {
            commandElement = commandElement.parentElement as HTMLElement;
        }
        
        if (commandElement && commandElement.xerodata) {
            logger.debug(`XeroNav.navItemClicked: command=${commandElement.xerodata}`) ;
            this.request('execute-command', commandElement.xerodata) ;
        }
        else {
            logger.debug(`XeroNav.navItemClicked: no command found`) ;
        }
    }
}
