
import { DOCUMENT } from "@angular/common";
import { DomHandler } from "primeng/dom";
import {UseStyle} from "primeng/usestyle"
import { GetShadowHost} from "../shared/utils/dom";
import { inject, Injectable} from "@angular/core";
import { AppComponent } from "../app.component";
import { Theme, ThemeService } from '@primeuix/styled';
import { PrimeNG } from "primeng/config";
import { ThemeConfig } from "../../theme/config";


let _id = 0;

@Injectable({providedIn:'root'})
export class PatchService{

    document: Document = inject(DOCUMENT);
    useStyle = inject(UseStyle)
    primeNg = inject(PrimeNG)

    constructor(){  
        console.info('Patch Service Initialized');
        this.patchPrimeNG()
    }

    
    patchPrimeNG(){
        this.useStyle.use = this.patchedUseStyle as any   
        DomHandler.getScrollableParents = this.patchedGetScrollableParents
    }

 
    /** 
     * Dynamically set theme for primeNg
     * Used for reinitialization of Shadow DOM (after its destroyed and opened again) 
      */
    setTheme(){
      this.primeNg.setThemeConfig({
        theme: ThemeConfig
      })        
    }
    
    reset(){
      console.info('Patch Service Reset');
      this.primeNg.theme.set(undefined)
      Theme.clearLoadedStyleNames();
      ThemeService.clear();
    }

    /** 
     * Prime Ng Use Style 
      */
    private patchedUseStyle(css:any, options: any = {}){
        let isLoaded = false;
        let cssRef = css;

        let styleRef = null;
        const { immediate = true, manual = false, name = `style_${++_id}`, id = undefined, media = undefined, nonce = undefined, first = false, props = {} } = options;

        if (!this.document) return;
        styleRef = GetShadowHost()?.shadowRoot?.querySelector(`style[data-primeng-style-id="${name}"]`) || (id &&GetShadowHost()?.shadowRoot?.getElementById(id)) || this.document.createElement('style');

        if (styleRef.textContent !== cssRef) {
            styleRef.textContent = cssRef;
        }

        //replace :root selectors with :host for shadow host
        styleRef.textContent =  styleRef.textContent.replace(/:root\s*{/g, ':host {')

         if (!styleRef.isConnected) {
            cssRef = css;
            DomHandler.setAttributes(styleRef, {
                type: 'text/css',
                media,
                nonce
            });
            
            //replace document head with shadow root to ensure styles get applied
            const HEAD = GetShadowHost()?.shadowRoot as any
            first && HEAD.firstChild ? HEAD.insertBefore(styleRef, HEAD.firstChild) : HEAD.appendChild(styleRef);
            DomHandler.setAttribute(styleRef, 'data-primeng-style-id', name);
        }
     
        return {
            id,
            name,
            el: styleRef,
            css: cssRef
        };
    }

    /** 
     * Prime Ng Dom Handler 
     * Patch DOM Handler to work with Shadow DOM 
    */     
    private patchedGetScrollableParents(element: any){
        let scrollableParents = [];

        if (element) {
          let parents = DomHandler.getParents(element).filter(
            (item: any) => !(item instanceof ShadowRoot)
          );
          const overflowRegex = /(auto|scroll)/;
          const overflowCheck = (node: any) => {
            if(!(node instanceof Element)) {
              return
            }
            let styleDeclaration = window['getComputedStyle'](node, null);
            return (
              overflowRegex.test(styleDeclaration.getPropertyValue('overflow')) ||
              overflowRegex.test(styleDeclaration.getPropertyValue('overflowX')) ||
              overflowRegex.test(styleDeclaration.getPropertyValue('overflowY'))
            );
          };
      
          for (let parent of parents) {
            let scrollSelectors =
              parent.nodeType === 1 && parent.dataset['scrollselectors'];
            if (scrollSelectors) {
              let selectors = scrollSelectors.split(',');
              for (let selector of selectors) {
                let el = DomHandler.findSingle(parent, selector);
                if (el && overflowCheck(el)) {
                  scrollableParents.push(el);
                }
              }
            }
      
            if (parent.nodeType !== 9 && overflowCheck(parent)) {
              scrollableParents.push(parent);
            }
          }
        }
      
        return scrollableParents;
    }
}
