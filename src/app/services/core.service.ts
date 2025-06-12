import { Injectable } from "@angular/core";
import { AppComponent } from "../app.component";
import { ComponentInRegistry, CoreComponentRegistry } from "../types/core";
import { AppService } from "../types/service";
import { ParentAppOutput } from "../types/output";
@Injectable()
export class CoreService implements AppService{
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

  emiParentAppData(data:ParentAppOutput){
    let appComponent = this.getComponentFromRegistry('App') as AppComponent
    if(!appComponent){
        throw "App component not found in registry."
    }
    console.info("Sending Event From Core: ",data)
    appComponent.parentAppData.emit(data)
  }

  checkScriptExists(jsFile:string){
    //get all `<script>` elements in document head
    let loadedScripts = document.querySelectorAll('script')
    let exists = false
    for(const script of loadedScripts){
      let srcFrags = script.getAttribute('src')?.split("/") ?? []
      let fileName = srcFrags[srcFrags?.length-1]
      if(fileName===jsFile) {
        exists = true
        break;
      }
    }
    return exists
  }



}