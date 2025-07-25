import { Injectable, signal, WritableSignal } from "@angular/core"
import { AppService } from "../types/service"
import {CustomAppContext, DefaultAppContext} from "../types/input"
import { SupportedFieldGroup } from "../form/form.map"

export const REQUIRES_MAP_JS : SupportedFieldGroup[] = [
    'ParkingLocation',
    'PolicyHolderAddress'
]
@Injectable()
export class SessionService implements AppService{

    //default app context data
    currentTransaction : WritableSignal<Record<string,any> | undefined> = signal(undefined)
    currentObject : WritableSignal<Record<string,any>> = signal({})
    currentObjectKey : WritableSignal<SupportedFieldGroup> = signal('AdditionalInformation')

    canEditForm : WritableSignal<boolean> = signal(true)

    //your custom app context data
    customAppContext: WritableSignal<CustomAppContext | undefined> = signal(undefined)

    reset(){
        this.currentTransaction.set(undefined)
        this.currentObject.set({})
        this.currentObjectKey.set("PolicyHolderAddress")
        this.canEditForm.set(true)
        this.customAppContext.set(undefined)
    }

    setDefaultContext(data:DefaultAppContext){
        console.log('%c Custom Control Default Context Received! ', 'background: #F46F75; color: #FFFFFF',data)
        if(data.Payload?.Transaction) this.currentTransaction.set(data.Payload.Transaction)
        if(data.Payload?.SourceObject) this.currentObject.set(data.Payload.SourceObject)
        if(data.Payload?.CanEditForm !== undefined) this.canEditForm.set(data.Payload.CanEditForm)
        if(data.Payload?.Key !== undefined) this.currentObjectKey.set(data.Payload.Key)
    }

    setCustomContext(data:CustomAppContext){
        console.log('%c Custom Control Custom Context Received! ', 'background: #F46F75; color: #FFFFFF',data)
        this.customAppContext.set(data)
    }
}