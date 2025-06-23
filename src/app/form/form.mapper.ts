
/** 
 *  Add any other mappings based on different Address
 * Field Groups defined in your product
  */

//add any other supported field groups/policy object keys here
export type SupportedFieldGroup = "PolicyHolderAddress" 
export const FORM_MAPPER : Record<SupportedFieldGroup,Record<string,string>> = {
    PolicyHolderAddress: {
        apt_number: "PolicyHolderAddressUnitOrApartmentNumber",
        street_address: "PolicyHolderAddressStreetName",
        city: "PolicyHolderAddresscity",
        state: "PolicyHolderAddressstate",
        post_code: "PolicyHolderAddresspostcode",
        country: "PolicyHolderAddresscountry",
    }
}
