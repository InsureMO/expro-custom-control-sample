import { Injectable } from "@angular/core";
import { AppComponent } from "../app.component";



//use this registry to allow complex interactions between different components
class CoreComponentRegistry {
    appComponent : AppComponent | undefined= undefined
}

export type ComponentInRegistry = 'App'
export class ParentAppEventData{
  Payload: ParentAppEventDataPayload = new ParentAppEventDataPayload()
}
export class ParentAppEventDataPayload{
  Transaction: Record<string,any> = {}
}

@Injectable({providedIn: 'root'})
export class CoreService{
    appendTo: HTMLElement | null = null
    mapLoaded = false
    private componentRegistry : CoreComponentRegistry | undefined
    

reset(){
    this.componentRegistry = undefined
}

/** 
 * Register your components here to allow external invocations and interactions
  */
registerComponent(component:AppComponent,type:ComponentInRegistry){
    if(!this.componentRegistry) this.componentRegistry = new CoreComponentRegistry()
    if(type==='App') this.componentRegistry.appComponent = component as AppComponent
}

/** 
 * Get component from core component registry  
  */
getComponentFromRegistry(type:ComponentInRegistry) :AppComponent | undefined {
    if(type==='App') return this.componentRegistry?.appComponent 
    return undefined
  }

  emiParentAppData(data:ParentAppEventData){
    let appComponent = this.getComponentFromRegistry('App') as AppComponent
    if(!appComponent){
        throw "App component not found in registry."
    }
    console.info("Sending Event From Core: ",data)
    appComponent.parentAppData.emit(data)
  }




}