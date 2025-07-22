import { SupportedFieldGroup } from "../form/form.map"

/** 
 * Default context as input event data (default-context) from parent ExPro app \
 * This context can have more properties overtime based on user requests.
  */
export class DefaultAppContext{
  Payload: DefaultAppContextPayload | undefined
}

export type DefaultAppContextPayload = {
    /** 
     * complete readonly transaction 
    */
    Transaction: Record<string,any>
    /** 
     * source address object/entity in the transaction that is to be updated 
     * by this custom form control
    */
    SourceObject: Record<string,any>
    /** 
     * Default context sent by parent ExPro app.\
     * This context can have more properties overtime based on user requests.
     * Once you're done updating source object, pass it as TargetObject in the output
    */
    CanEditForm: boolean
    /** 
     *  Key of the source address object/entity within the full policy object (eg: "PolicyHolderAddress")
    */
    Key: SupportedFieldGroup 
}

/** 
 * Example: Custom app context like tokens or any other static input data.\
 * This context comes from DIPL Product Setup so this definition should match the custom 
 * attributes you have defined in the product for this control.
  */
export type CustomAppContext = {
  googlemaps: {
    token: string
    bundle: string
  }
  abn:{
    api_search_by_name: string 
    api_search_by_num: string 
    auth_guid: string 
  }
  places:{
    api_search_places:string
    api_search_place_details: string
  }
  insuremo:{
    access_token: string
  }
}
