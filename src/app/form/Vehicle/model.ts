
export type VehicleLookupByPlateRequest = {
    state : string 
    plate : string 
  }

export type VehicleRegistration = {
    plate: string
    state: string
}

export type VehicleResult = {
    chassis: string | null
    nvic: string
    registration: VehicleRegistration
    vin: string
}

export type VehicleLookupByPlateResponse = {
    request_id: string
    requested_at: string
    result: VehicleResult[]
}


export class VehicleDetailsLookupByNVICRequest {
    model : string = "A"
    nvic! : string 
  }

export type VehicleDetail = {
    "-hasChanges": string
    "-id": string
    "-rowOrder": string
    AverageKM: string
    BodyName: string
    CCName: string
    ClassCode: string
    ClassName: string
    CountryName: string
    DiscontinueDate: string
    FamilyName: string
    MTH: string
    ManufacturerName: string
    MarketingModelCode: string
    ModelName: string
    NVIC_CUR: string
    NVIC_Model: string
    RRP: string
    ReleaseDate: string
    Retail: string
    SegmentName: string
    SeriesName: string
    Trade: string
    TradeLow: string
    TransmissionName: string
    VariantName: string
    YearCreate: string
}

export type VehicleDetailsLookupByNVICResponse = VehicleDetail[]



export type DropdownOptions = {
     code: string
     name: string
}

export type DropdownOptionsWithNames = {
    name: string
}

export class VehicleMakeLookupRequest {
    model : string = "A"
    yearFrom! : number
    yearTo!: number
}

export type VehicleMakeLookupResponse = DropdownOptions[]


export class VehicleModelLookupRequest {
    model : string = "A"
    yearFrom! : number
    yearTo!: number
    makeCode!: string
}

export type VehicleModelLookupResponse = DropdownOptions[]


export class VehicleVariantLookupRequest {
    model : string = "A"
    yearFrom! : number
    yearTo!: number
    makeCode!: string
    familyCode!: string
}

export type VehicleVariantLookupResponse = DropdownOptionsWithNames[]


export class VehicleNvicListLookupRequest {
    model : string = "A"
    yearFrom! : number
    yearTo!: number
    makeCode!: string
    familyCode!: string
}

export type VehicleNvicOption = {
    modelName: string
    nvicCur: string
    nvicModel: string
}

export type VehicleNvicListLookupResponse = VehicleNvicOption[]