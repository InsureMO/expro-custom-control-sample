import { Injectable, signal, WritableSignal } from "@angular/core"
import { AppService } from "../types/service"
import {CustomAppContext, DefaultAppContext} from "../types/input"


@Injectable()
export class SessionService implements AppService{

    //default app context data
    currentTransaction : WritableSignal<Record<string,any> | undefined> = signal(undefined)
    currentObject : WritableSignal<Record<string,any> | undefined> = signal(undefined)
    canEditForm : WritableSignal<boolean> = signal(false)

    //your custom app context data
    customAppContext: WritableSignal<CustomAppContext | undefined> = signal(undefined)

    reset(){
        this.currentTransaction.set(undefined)
        this.currentObject.set(undefined)
        this.canEditForm.set(false)
        this.customAppContext.set(undefined)
    }

    setDefaultContext(data:DefaultAppContext){
        if(data.Payload?.Transaction) this.currentTransaction.set(data.Payload.Transaction)
        if(data.Payload?.SourceObject) this.currentObject.set(data.Payload.SourceObject)
        if(data.Payload?.CanEditForm !== undefined) this.canEditForm.set(data.Payload.CanEditForm)
    }

    setCustomContext(data:CustomAppContext){
        this.customAppContext.set(data)
    }
}