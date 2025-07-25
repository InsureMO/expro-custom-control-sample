
/** 
 *  Add any other mappings based on different Address
 * Field Groups defined in your product
  */

//add any other supported field groups/policy object keys here
export type SupportedFieldGroup = "PolicyHolderAddress" | "ParkingLocation" | "CompanyDetails" | "AdditionalInformation"
export const FORM_MAP : Record<SupportedFieldGroup,Record<string,string>> = {
    PolicyHolderAddress: {
        apt_number: "PolicyHolderAddressUnitOrApartmentNumber",
        street_address: "PolicyHolderAddressStreetName",
        city: "PolicyHolderAddresscity",
        state: "PolicyHolderAddressstate",
        post_code: "PolicyHolderAddresspostcode",
        country: "PolicyHolderAddresscountry",
    },
    ParkingLocation: {
        apt_number: "UnitNo",
        street_address:"StreetAddress",
        city: "SuburbOrTownName",
        post_code: "PostalCode",
        state: "State",
        country: "Country"
    },
    CompanyDetails: {
        business_name: "BusinessName",
        abn:"ABN",
        operating_years:"OperatingYears",
        //locatiion form mapping similar to above
        business_address: "BusinessAddress",
        street_address: "Street",
        suburb: "Suburb",
        city: "City",
        post_code: "PostCode",
        state: "State",
        country: "Country"
    },
    AdditionalInformation: {
        is_new_not_registered: "NewVehicleNotYetRegistered",
        rego: "Rego",
        state: "WhichStateIsTheVehicleUsuallyLocated",
        post_code: "WhichPostcodeIsTheVehicleUsuallyLocated",
        model: "Model",
        make: "VehicleMake",
        year: "VehicleYearManufactured",
        type: "VehicleType",
        engine_size: "EngineSize",
        segment: "VehicleSegment",
        variant: "VehicleVariant",
        sum_insured: "VehicleMarketValueSumInsured",
        electric_vehicle: "ElectricVehicleFlag",
        vehicle_category: "VehicleCategory"
    }
    

}
