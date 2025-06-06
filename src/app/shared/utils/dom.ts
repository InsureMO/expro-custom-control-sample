import { environment } from "../../../../environments/environment.development"

export const PARENT_DOM_APP = 'expro-web' //main expro
export const CURRENT_DOM_APP = 'expro-custom-address' //current address form app

/** 
 * Returns the Host element of the Shadow Root
  */ 
export function GetShadowHost(){
    if(!environment.production) return document.querySelector(CURRENT_DOM_APP)?.shadowRoot?.host

    return document.querySelector(PARENT_DOM_APP)?.shadowRoot?.
    querySelector(CURRENT_DOM_APP)?.shadowRoot?.host
}

export function GetShadowRoot(){
    if(!environment.production) return document.querySelector(CURRENT_DOM_APP)?.shadowRoot

    return document.querySelector(PARENT_DOM_APP)?.shadowRoot?.
    querySelector(CURRENT_DOM_APP)?.shadowRoot
}

/** 
 * Shadow dom queries are different from light DOM  
 * Use this instead of normal document queries
  */ 
  export function GetShadowRootElementByID(ID:string){
    return GetShadowRoot()?.getElementById(ID)
  }

