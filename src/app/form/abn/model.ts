/** 
 * search by name 
  */
export type SearchByNameRequest = {
    name : string 
}
export type SearchByNameResult = {
    abn : string 
    name : string 
    postCode : string 
    stateCode : string 
}

/** 
 * search by number 
  */
export type SearchByNumRequest = {
    searchString : string 
    includeHistoricalDetails : string 
}
//not sure if this is standardized yet
export type SearchByNumResult = {
  businessEntity202001: BusinessEntity202001;
  dateRegisterLastUpdated: string;
  dateTimeRetrieved: string;
  usageStatement: string;
}

interface BusinessEntity202001 {
  ABN: ABN;
  ASICNumber: string;
  entityStatus: EntityStatus | EntityStatus[]
  entityType: EntityType;
  mainBusinessPhysicalAddress: MainBusinessPhysicalAddress;
  mainName: MainName;
  recordLastUpdatedDate: string;
}

interface ABN {
  identifierValue: string;
  isCurrentIndicator: string;
  replacedFrom: string;
}

export interface EntityStatus {
  effectiveFrom: string;
  effectiveTo: string;
  entityStatusCode: 'Active' | ""
}

interface EntityType {
  entityDescription: string;
  entityTypeCode: string;
}

interface MainBusinessPhysicalAddress {
  effectiveFrom: string;
  effectiveTo: string;
  postcode: string;
  stateCode: string;
}

interface MainName {
  effectiveFrom: string;
  organisationName: string;
}



