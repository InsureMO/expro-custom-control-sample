import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CoreService } from '../../services/core.service';
import { SessionService } from '../../services/session.service';
import { FORM_MAP } from '../form.map';
import { FormsModule } from '@angular/forms';
import { ParentAppOutput } from '../../types/output';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { HttpErrorResponse } from '@angular/common/http';
import { GetServerMsgFromHttpError } from '../../shared/utils/http';
import {  debounceTime, Subject, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { GetShadowRootElementByID } from '../../shared/utils/dom';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';



import { NgTemplateOutlet } from '@angular/common';
import { VehicleService } from './vehicle.service';
import { DropdownOptions, DropdownOptionsWithNames, VehicleDetail, VehicleDetailsLookupByNVICRequest, VehicleDetailsLookupByNVICResponse, VehicleLookupByPlateRequest, VehicleLookupByPlateResponse, VehicleMakeLookupRequest, VehicleModelLookupRequest, VehicleNvicListLookupRequest, VehicleNvicOption, VehicleVariantLookupRequest } from './model';
type SearchType = 'name' | 'number'
type DebouncedSearch = {
  query: string
  type: SearchType
}
type VehicleLookupSearch = {
  plate: string
  state: string
}

@Component({
  selector: 'app-vehicle',  
  imports: [FormsModule,InputTextModule,SelectModule,InputNumberModule,
    MessageModule,ProgressSpinnerModule, NgTemplateOutlet, ButtonModule, DatePickerModule, CheckboxModule],
  providers: [VehicleService],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VehicleComponent implements OnInit,OnDestroy{


  cd = inject(ChangeDetectorRef)
  coreService = inject(CoreService)
  sessionService = inject(SessionService)
  vehicleService = inject(VehicleService)





  searchNameQuery: WritableSignal<string> = signal("")
  
  MAPPINGS : WritableSignal<Record<string,string>> = signal({})
  error : WritableSignal<string> = signal("")
  searchingByType: WritableSignal<SearchType | ""> = signal("")
  isLookingUpVehicle: WritableSignal<boolean> = signal(false)
  vehicleDetails: WritableSignal<VehicleDetail | undefined> = signal(undefined)
  lookupMessage: WritableSignal<string> = signal("")
  noVehicleFound: WritableSignal<boolean> = signal(false)
  
  // Dropdown options signals
  makeOptions: WritableSignal<DropdownOptions[]> = signal([])
  modelOptions: WritableSignal<DropdownOptions[]> = signal([])
  variantOptions: WritableSignal<DropdownOptionsWithNames[]> = signal([])
  nvicOptions: WritableSignal<VehicleNvicOption[]> = signal([])
  
  // Loading states for dropdowns
  isLoadingMakes: WritableSignal<boolean> = signal(false)
  isLoadingModels: WritableSignal<boolean> = signal(false)
  isLoadingVariants: WritableSignal<boolean> = signal(false)
  isLoadingNvicOptions: WritableSignal<boolean> = signal(false)
  
  // Selected NVIC option
  selectedNvic: WritableSignal<VehicleNvicOption | undefined> = signal(undefined)
  
  // Temporary selections for cascading dropdowns
  selectedMake: WritableSignal<string | undefined> = signal(undefined)
  selectedModel: WritableSignal<string | undefined> = signal(undefined)
  selectedVariant: WritableSignal<string | undefined> = signal(undefined)
  
  // Store codes for API calls
  selectedMakeCode: WritableSignal<string | undefined> = signal(undefined)
  selectedModelCode: WritableSignal<string | undefined> = signal(undefined)
  
  // Flag to prevent cascading API calls when setting values programmatically
  isSettingValuesProgram: WritableSignal<boolean> = signal(false)
  manualVehicleEntry: WritableSignal<boolean> = signal(false)
  manualSearching: WritableSignal<boolean> = signal(false)



  
  // UI state management


  stateOptions = [
    { label: 'WA', value: 'WA' },
    { label: 'VIC', value: 'VIC' },
    { label: 'TAS', value: 'TAS' },
    { label: 'SA', value: 'SA' },
    { label: 'QLD', value: 'QLD' },
    { label: 'NT', value: 'NT' },
    { label: 'NSW', value: 'NSW' },
    { label: 'ACT', value: 'ACT' }
  ];

  vehicleTypeOptions = [
    { label: 'Mobile plant & equipment', value: 'MobilePlantEquipment' },
    { label: 'Heavy vehicles > 3.5 tonnes', value: 'HeavyVehicles35Tonnes' },
    { label: 'Passenger & light commercial vehicles up to 3.5 tonnes', value: 'PassengerLightCommercialVehicles' }
  ];

  vehicleCategoryOptions = [
    {
        "label": "EARTHMOVING EXCAVATORS",
        "value": "EARTHMOVINGEXCAVATORS"
    },
    {
        "label": "LOADERS",
        "value": "LOADERS"
    },
    {
        "label": "TRACTORS",
        "value": "TRACTORS"
    },
    {
        "label": "FORKLIFTS",
        "value": "FORKLIFTS"
    },
    {
        "label": "BOBCATS",
        "value": "BOBCATS"
    },
    {
        "label": "TRAILERS",
        "value": "TRAILERS"
    },
    {
        "label": "PRIME MOVER",
        "value": "PRIMEMOVER"
    },
    {
        "label": "RIGID TRUCKS_> 10T",
        "value": "RIGIDTRUCKS10T"
    },
    {
        "label": "RIGID TRUCKS_5T TO 10T",
        "value": "RIGIDTRUCKS5TTO10T"
    },
    {
        "label": "RIGID TRUCKS_3.5T TO 5T",
        "value": "RIGIDTRUCKS35TTO5T"
    }
];


  YESNOOptions = [
    { label: 'Yes', value: 'YES' },
    { label: 'No', value: 'NO' },
  ];

  postCodeOptions = [
    {
        "label": "6907",
        "value": "6907"
    },
    {
        "label": "6770",
        "value": "6770"
    },
    {
        "label": "6765",
        "value": "6765"
    },
    {
        "label": "6762",
        "value": "6762"
    },
    {
        "label": "6760",
        "value": "6760"
    },
    {
        "label": "6758",
        "value": "6758"
    },
    {
        "label": "6754",
        "value": "6754"
    },
    {
        "label": "6753",
        "value": "6753"
    },
    {
        "label": "6751",
        "value": "6751"
    },
    {
        "label": "6743",
        "value": "6743"
    },
    {
        "label": "6740",
        "value": "6740"
    },
    {
        "label": "6733",
        "value": "6733"
    },
    {
        "label": "6731",
        "value": "6731"
    },
    {
        "label": "6728",
        "value": "6728"
    },
    {
        "label": "6726",
        "value": "6726"
    },
    {
        "label": "6725",
        "value": "6725"
    },
    {
        "label": "6722",
        "value": "6722"
    },
    {
        "label": "6721",
        "value": "6721"
    },
    {
        "label": "6720",
        "value": "6720"
    },
    {
        "label": "6718",
        "value": "6718"
    },
    {
        "label": "6716",
        "value": "6716"
    },
    {
        "label": "6714",
        "value": "6714"
    },
    {
        "label": "6713",
        "value": "6713"
    },
    {
        "label": "6712",
        "value": "6712"
    },
    {
        "label": "6711",
        "value": "6711"
    },
    {
        "label": "6710",
        "value": "6710"
    },
    {
        "label": "6707",
        "value": "6707"
    },
    {
        "label": "6705",
        "value": "6705"
    },
    {
        "label": "6701",
        "value": "6701"
    },
    {
        "label": "6646",
        "value": "6646"
    },
    {
        "label": "6642",
        "value": "6642"
    },
    {
        "label": "6640",
        "value": "6640"
    },
    {
        "label": "6639",
        "value": "6639"
    },
    {
        "label": "6638",
        "value": "6638"
    },
    {
        "label": "6635",
        "value": "6635"
    },
    {
        "label": "6632",
        "value": "6632"
    },
    {
        "label": "6631",
        "value": "6631"
    },
    {
        "label": "6630",
        "value": "6630"
    },
    {
        "label": "6628",
        "value": "6628"
    },
    {
        "label": "6627",
        "value": "6627"
    },
    {
        "label": "6625",
        "value": "6625"
    },
    {
        "label": "6623",
        "value": "6623"
    },
    {
        "label": "6620",
        "value": "6620"
    },
    {
        "label": "6616",
        "value": "6616"
    },
    {
        "label": "6614",
        "value": "6614"
    },
    {
        "label": "6613",
        "value": "6613"
    },
    {
        "label": "6612",
        "value": "6612"
    },
    {
        "label": "6609",
        "value": "6609"
    },
    {
        "label": "6608",
        "value": "6608"
    },
    {
        "label": "6606",
        "value": "6606"
    },
    {
        "label": "6605",
        "value": "6605"
    },
    {
        "label": "6603",
        "value": "6603"
    },
    {
        "label": "6575",
        "value": "6575"
    },
    {
        "label": "6574",
        "value": "6574"
    },
    {
        "label": "6572",
        "value": "6572"
    },
    {
        "label": "6571",
        "value": "6571"
    },
    {
        "label": "6569",
        "value": "6569"
    },
    {
        "label": "6568",
        "value": "6568"
    },
    {
        "label": "6567",
        "value": "6567"
    },
    {
        "label": "6566",
        "value": "6566"
    },
    {
        "label": "6564",
        "value": "6564"
    },
    {
        "label": "6562",
        "value": "6562"
    },
    {
        "label": "6560",
        "value": "6560"
    },
    {
        "label": "6558",
        "value": "6558"
    },
    {
        "label": "6556",
        "value": "6556"
    },
    {
        "label": "6537",
        "value": "6537"
    },
    {
        "label": "6536",
        "value": "6536"
    },
    {
        "label": "6535",
        "value": "6535"
    },
    {
        "label": "6532",
        "value": "6532"
    },
    {
        "label": "6530",
        "value": "6530"
    },
    {
        "label": "6528",
        "value": "6528"
    },
    {
        "label": "6525",
        "value": "6525"
    },
    {
        "label": "6522",
        "value": "6522"
    },
    {
        "label": "6521",
        "value": "6521"
    },
    {
        "label": "6519",
        "value": "6519"
    },
    {
        "label": "6518",
        "value": "6518"
    },
    {
        "label": "6517",
        "value": "6517"
    },
    {
        "label": "6516",
        "value": "6516"
    },
    {
        "label": "6515",
        "value": "6515"
    },
    {
        "label": "6514",
        "value": "6514"
    },
    {
        "label": "6513",
        "value": "6513"
    },
    {
        "label": "6512",
        "value": "6512"
    },
    {
        "label": "6511",
        "value": "6511"
    },
    {
        "label": "6510",
        "value": "6510"
    },
    {
        "label": "6509",
        "value": "6509"
    },
    {
        "label": "6507",
        "value": "6507"
    },
    {
        "label": "6506",
        "value": "6506"
    },
    {
        "label": "6505",
        "value": "6505"
    },
    {
        "label": "6504",
        "value": "6504"
    },
    {
        "label": "6503",
        "value": "6503"
    },
    {
        "label": "6502",
        "value": "6502"
    },
    {
        "label": "6501",
        "value": "6501"
    },
    {
        "label": "6490",
        "value": "6490"
    },
    {
        "label": "6489",
        "value": "6489"
    },
    {
        "label": "6488",
        "value": "6488"
    },
    {
        "label": "6487",
        "value": "6487"
    },
    {
        "label": "6485",
        "value": "6485"
    },
    {
        "label": "6484",
        "value": "6484"
    },
    {
        "label": "6480",
        "value": "6480"
    },
    {
        "label": "6479",
        "value": "6479"
    },
    {
        "label": "6477",
        "value": "6477"
    },
    {
        "label": "6476",
        "value": "6476"
    },
    {
        "label": "6475",
        "value": "6475"
    },
    {
        "label": "6473",
        "value": "6473"
    },
    {
        "label": "6472",
        "value": "6472"
    },
    {
        "label": "6470",
        "value": "6470"
    },
    {
        "label": "6468",
        "value": "6468"
    },
    {
        "label": "6467",
        "value": "6467"
    },
    {
        "label": "6466",
        "value": "6466"
    },
    {
        "label": "6465",
        "value": "6465"
    },
    {
        "label": "6463",
        "value": "6463"
    },
    {
        "label": "6462",
        "value": "6462"
    },
    {
        "label": "6461",
        "value": "6461"
    },
    {
        "label": "6460",
        "value": "6460"
    },
    {
        "label": "6452",
        "value": "6452"
    },
    {
        "label": "6450",
        "value": "6450"
    },
    {
        "label": "6448",
        "value": "6448"
    },
    {
        "label": "6447",
        "value": "6447"
    },
    {
        "label": "6446",
        "value": "6446"
    },
    {
        "label": "6445",
        "value": "6445"
    },
    {
        "label": "6443",
        "value": "6443"
    },
    {
        "label": "6442",
        "value": "6442"
    },
    {
        "label": "6440",
        "value": "6440"
    },
    {
        "label": "6438",
        "value": "6438"
    },
    {
        "label": "6437",
        "value": "6437"
    },
    {
        "label": "6436",
        "value": "6436"
    },
    {
        "label": "6434",
        "value": "6434"
    },
    {
        "label": "6432",
        "value": "6432"
    },
    {
        "label": "6431",
        "value": "6431"
    },
    {
        "label": "6430",
        "value": "6430"
    },
    {
        "label": "6429",
        "value": "6429"
    },
    {
        "label": "6428",
        "value": "6428"
    },
    {
        "label": "6427",
        "value": "6427"
    },
    {
        "label": "6426",
        "value": "6426"
    },
    {
        "label": "6425",
        "value": "6425"
    },
    {
        "label": "6424",
        "value": "6424"
    },
    {
        "label": "6423",
        "value": "6423"
    },
    {
        "label": "6422",
        "value": "6422"
    },
    {
        "label": "6421",
        "value": "6421"
    },
    {
        "label": "6420",
        "value": "6420"
    },
    {
        "label": "6419",
        "value": "6419"
    },
    {
        "label": "6418",
        "value": "6418"
    },
    {
        "label": "6415",
        "value": "6415"
    },
    {
        "label": "6414",
        "value": "6414"
    },
    {
        "label": "6413",
        "value": "6413"
    },
    {
        "label": "6412",
        "value": "6412"
    },
    {
        "label": "6411",
        "value": "6411"
    },
    {
        "label": "6410",
        "value": "6410"
    },
    {
        "label": "6409",
        "value": "6409"
    },
    {
        "label": "6407",
        "value": "6407"
    },
    {
        "label": "6405",
        "value": "6405"
    },
    {
        "label": "6403",
        "value": "6403"
    },
    {
        "label": "6401",
        "value": "6401"
    },
    {
        "label": "6398",
        "value": "6398"
    },
    {
        "label": "6397",
        "value": "6397"
    },
    {
        "label": "6396",
        "value": "6396"
    },
    {
        "label": "6395",
        "value": "6395"
    },
    {
        "label": "6394",
        "value": "6394"
    },
    {
        "label": "6393",
        "value": "6393"
    },
    {
        "label": "6392",
        "value": "6392"
    },
    {
        "label": "6391",
        "value": "6391"
    },
    {
        "label": "6390",
        "value": "6390"
    },
    {
        "label": "6386",
        "value": "6386"
    },
    {
        "label": "6385",
        "value": "6385"
    },
    {
        "label": "6384",
        "value": "6384"
    },
    {
        "label": "6383",
        "value": "6383"
    },
    {
        "label": "6375",
        "value": "6375"
    },
    {
        "label": "6373",
        "value": "6373"
    },
    {
        "label": "6372",
        "value": "6372"
    },
    {
        "label": "6370",
        "value": "6370"
    },
    {
        "label": "6369",
        "value": "6369"
    },
    {
        "label": "6368",
        "value": "6368"
    },
    {
        "label": "6367",
        "value": "6367"
    },
    {
        "label": "6365",
        "value": "6365"
    },
    {
        "label": "6363",
        "value": "6363"
    },
    {
        "label": "6361",
        "value": "6361"
    },
    {
        "label": "6359",
        "value": "6359"
    },
    {
        "label": "6358",
        "value": "6358"
    },
    {
        "label": "6357",
        "value": "6357"
    },
    {
        "label": "6356",
        "value": "6356"
    },
    {
        "label": "6355",
        "value": "6355"
    },
    {
        "label": "6353",
        "value": "6353"
    },
    {
        "label": "6352",
        "value": "6352"
    },
    {
        "label": "6351",
        "value": "6351"
    },
    {
        "label": "6350",
        "value": "6350"
    },
    {
        "label": "6348",
        "value": "6348"
    },
    {
        "label": "6346",
        "value": "6346"
    },
    {
        "label": "6343",
        "value": "6343"
    },
    {
        "label": "6341",
        "value": "6341"
    },
    {
        "label": "6338",
        "value": "6338"
    },
    {
        "label": "6337",
        "value": "6337"
    },
    {
        "label": "6336",
        "value": "6336"
    },
    {
        "label": "6335",
        "value": "6335"
    },
    {
        "label": "6333",
        "value": "6333"
    },
    {
        "label": "6330",
        "value": "6330"
    },
    {
        "label": "6328",
        "value": "6328"
    },
    {
        "label": "6327",
        "value": "6327"
    },
    {
        "label": "6326",
        "value": "6326"
    },
    {
        "label": "6324",
        "value": "6324"
    },
    {
        "label": "6323",
        "value": "6323"
    },
    {
        "label": "6322",
        "value": "6322"
    },
    {
        "label": "6321",
        "value": "6321"
    },
    {
        "label": "6320",
        "value": "6320"
    },
    {
        "label": "6318",
        "value": "6318"
    },
    {
        "label": "6317",
        "value": "6317"
    },
    {
        "label": "6316",
        "value": "6316"
    },
    {
        "label": "6315",
        "value": "6315"
    },
    {
        "label": "6313",
        "value": "6313"
    },
    {
        "label": "6312",
        "value": "6312"
    },
    {
        "label": "6311",
        "value": "6311"
    },
    {
        "label": "6309",
        "value": "6309"
    },
    {
        "label": "6308",
        "value": "6308"
    },
    {
        "label": "6306",
        "value": "6306"
    },
    {
        "label": "6304",
        "value": "6304"
    },
    {
        "label": "6302",
        "value": "6302"
    },
    {
        "label": "6290",
        "value": "6290"
    },
    {
        "label": "6288",
        "value": "6288"
    },
    {
        "label": "6286",
        "value": "6286"
    },
    {
        "label": "6285",
        "value": "6285"
    },
    {
        "label": "6284",
        "value": "6284"
    },
    {
        "label": "6282",
        "value": "6282"
    },
    {
        "label": "6281",
        "value": "6281"
    },
    {
        "label": "6280",
        "value": "6280"
    },
    {
        "label": "6275",
        "value": "6275"
    },
    {
        "label": "6271",
        "value": "6271"
    },
    {
        "label": "6262",
        "value": "6262"
    },
    {
        "label": "6260",
        "value": "6260"
    },
    {
        "label": "6258",
        "value": "6258"
    },
    {
        "label": "6256",
        "value": "6256"
    },
    {
        "label": "6255",
        "value": "6255"
    },
    {
        "label": "6254",
        "value": "6254"
    },
    {
        "label": "6253",
        "value": "6253"
    },
    {
        "label": "6252",
        "value": "6252"
    },
    {
        "label": "6251",
        "value": "6251"
    },
    {
        "label": "6244",
        "value": "6244"
    },
    {
        "label": "6243",
        "value": "6243"
    },
    {
        "label": "6240",
        "value": "6240"
    },
    {
        "label": "6239",
        "value": "6239"
    },
    {
        "label": "6237",
        "value": "6237"
    },
    {
        "label": "6236",
        "value": "6236"
    },
    {
        "label": "6233",
        "value": "6233"
    },
    {
        "label": "6232",
        "value": "6232"
    },
    {
        "label": "6230",
        "value": "6230"
    },
    {
        "label": "6229",
        "value": "6229"
    },
    {
        "label": "6228",
        "value": "6228"
    },
    {
        "label": "6227",
        "value": "6227"
    },
    {
        "label": "6226",
        "value": "6226"
    },
    {
        "label": "6225",
        "value": "6225"
    },
    {
        "label": "6224",
        "value": "6224"
    },
    {
        "label": "6223",
        "value": "6223"
    },
    {
        "label": "6221",
        "value": "6221"
    },
    {
        "label": "6220",
        "value": "6220"
    },
    {
        "label": "6218",
        "value": "6218"
    },
    {
        "label": "6215",
        "value": "6215"
    },
    {
        "label": "6214",
        "value": "6214"
    },
    {
        "label": "6213",
        "value": "6213"
    },
    {
        "label": "6211",
        "value": "6211"
    },
    {
        "label": "6210",
        "value": "6210"
    },
    {
        "label": "6209",
        "value": "6209"
    },
    {
        "label": "6208",
        "value": "6208"
    },
    {
        "label": "6207",
        "value": "6207"
    },
    {
        "label": "6182",
        "value": "6182"
    },
    {
        "label": "6181",
        "value": "6181"
    },
    {
        "label": "6180",
        "value": "6180"
    },
    {
        "label": "6176",
        "value": "6176"
    },
    {
        "label": "6175",
        "value": "6175"
    },
    {
        "label": "6174",
        "value": "6174"
    },
    {
        "label": "6173",
        "value": "6173"
    },
    {
        "label": "6172",
        "value": "6172"
    },
    {
        "label": "6171",
        "value": "6171"
    },
    {
        "label": "6170",
        "value": "6170"
    },
    {
        "label": "6169",
        "value": "6169"
    },
    {
        "label": "6168",
        "value": "6168"
    },
    {
        "label": "6167",
        "value": "6167"
    },
    {
        "label": "6166",
        "value": "6166"
    },
    {
        "label": "6165",
        "value": "6165"
    },
    {
        "label": "6164",
        "value": "6164"
    },
    {
        "label": "6163",
        "value": "6163"
    },
    {
        "label": "6162",
        "value": "6162"
    },
    {
        "label": "6161",
        "value": "6161"
    },
    {
        "label": "6160",
        "value": "6160"
    },
    {
        "label": "6159",
        "value": "6159"
    },
    {
        "label": "6158",
        "value": "6158"
    },
    {
        "label": "6157",
        "value": "6157"
    },
    {
        "label": "6156",
        "value": "6156"
    },
    {
        "label": "6155",
        "value": "6155"
    },
    {
        "label": "6154",
        "value": "6154"
    },
    {
        "label": "6153",
        "value": "6153"
    },
    {
        "label": "6152",
        "value": "6152"
    },
    {
        "label": "6151",
        "value": "6151"
    },
    {
        "label": "6150",
        "value": "6150"
    },
    {
        "label": "6149",
        "value": "6149"
    },
    {
        "label": "6148",
        "value": "6148"
    },
    {
        "label": "6147",
        "value": "6147"
    },
    {
        "label": "6126",
        "value": "6126"
    },
    {
        "label": "6125",
        "value": "6125"
    },
    {
        "label": "6124",
        "value": "6124"
    },
    {
        "label": "6123",
        "value": "6123"
    },
    {
        "label": "6122",
        "value": "6122"
    },
    {
        "label": "6121",
        "value": "6121"
    },
    {
        "label": "6112",
        "value": "6112"
    },
    {
        "label": "6111",
        "value": "6111"
    },
    {
        "label": "6110",
        "value": "6110"
    },
    {
        "label": "6109",
        "value": "6109"
    },
    {
        "label": "6108",
        "value": "6108"
    },
    {
        "label": "6107",
        "value": "6107"
    },
    {
        "label": "6106",
        "value": "6106"
    },
    {
        "label": "6105",
        "value": "6105"
    },
    {
        "label": "6104",
        "value": "6104"
    },
    {
        "label": "6103",
        "value": "6103"
    },
    {
        "label": "6102",
        "value": "6102"
    },
    {
        "label": "6101",
        "value": "6101"
    },
    {
        "label": "6100",
        "value": "6100"
    },
    {
        "label": "6090",
        "value": "6090"
    },
    {
        "label": "6084",
        "value": "6084"
    },
    {
        "label": "6083",
        "value": "6083"
    },
    {
        "label": "6082",
        "value": "6082"
    },
    {
        "label": "6081",
        "value": "6081"
    },
    {
        "label": "6079",
        "value": "6079"
    },
    {
        "label": "6078",
        "value": "6078"
    },
    {
        "label": "6077",
        "value": "6077"
    },
    {
        "label": "6076",
        "value": "6076"
    },
    {
        "label": "6074",
        "value": "6074"
    },
    {
        "label": "6073",
        "value": "6073"
    },
    {
        "label": "6072",
        "value": "6072"
    },
    {
        "label": "6071",
        "value": "6071"
    },
    {
        "label": "6070",
        "value": "6070"
    },
    {
        "label": "6069",
        "value": "6069"
    },
    {
        "label": "6068",
        "value": "6068"
    },
    {
        "label": "6067",
        "value": "6067"
    },
    {
        "label": "6066",
        "value": "6066"
    },
    {
        "label": "6065",
        "value": "6065"
    },
    {
        "label": "6064",
        "value": "6064"
    },
    {
        "label": "6063",
        "value": "6063"
    },
    {
        "label": "6062",
        "value": "6062"
    },
    {
        "label": "6061",
        "value": "6061"
    },
    {
        "label": "6060",
        "value": "6060"
    },
    {
        "label": "6059",
        "value": "6059"
    },
    {
        "label": "6058",
        "value": "6058"
    },
    {
        "label": "6057",
        "value": "6057"
    },
    {
        "label": "6056",
        "value": "6056"
    },
    {
        "label": "6055",
        "value": "6055"
    },
    {
        "label": "6054",
        "value": "6054"
    },
    {
        "label": "6053",
        "value": "6053"
    },
    {
        "label": "6052",
        "value": "6052"
    },
    {
        "label": "6051",
        "value": "6051"
    },
    {
        "label": "6050",
        "value": "6050"
    },
    {
        "label": "6044",
        "value": "6044"
    },
    {
        "label": "6043",
        "value": "6043"
    },
    {
        "label": "6042",
        "value": "6042"
    },
    {
        "label": "6041",
        "value": "6041"
    },
    {
        "label": "6038",
        "value": "6038"
    },
    {
        "label": "6037",
        "value": "6037"
    },
    {
        "label": "6036",
        "value": "6036"
    },
    {
        "label": "6035",
        "value": "6035"
    },
    {
        "label": "6034",
        "value": "6034"
    },
    {
        "label": "6033",
        "value": "6033"
    },
    {
        "label": "6032",
        "value": "6032"
    },
    {
        "label": "6031",
        "value": "6031"
    },
    {
        "label": "6030",
        "value": "6030"
    },
    {
        "label": "6029",
        "value": "6029"
    },
    {
        "label": "6028",
        "value": "6028"
    },
    {
        "label": "6027",
        "value": "6027"
    },
    {
        "label": "6026",
        "value": "6026"
    },
    {
        "label": "6025",
        "value": "6025"
    },
    {
        "label": "6024",
        "value": "6024"
    },
    {
        "label": "6023",
        "value": "6023"
    },
    {
        "label": "6022",
        "value": "6022"
    },
    {
        "label": "6021",
        "value": "6021"
    },
    {
        "label": "6020",
        "value": "6020"
    },
    {
        "label": "6019",
        "value": "6019"
    },
    {
        "label": "6018",
        "value": "6018"
    },
    {
        "label": "6017",
        "value": "6017"
    },
    {
        "label": "6016",
        "value": "6016"
    },
    {
        "label": "6015",
        "value": "6015"
    },
    {
        "label": "6014",
        "value": "6014"
    },
    {
        "label": "6012",
        "value": "6012"
    },
    {
        "label": "6011",
        "value": "6011"
    },
    {
        "label": "6010",
        "value": "6010"
    },
    {
        "label": "6009",
        "value": "6009"
    },
    {
        "label": "6008",
        "value": "6008"
    },
    {
        "label": "6007",
        "value": "6007"
    },
    {
        "label": "6006",
        "value": "6006"
    },
    {
        "label": "6005",
        "value": "6005"
    },
    {
        "label": "6004",
        "value": "6004"
    },
    {
        "label": "6003",
        "value": "6003"
    },
    {
        "label": "6000",
        "value": "6000"
    },
    {
        "label": "0852",
        "value": "0852"
    },
    {
        "label": "3996",
        "value": "3996"
    },
    {
        "label": "3995",
        "value": "3995"
    },
    {
        "label": "3992",
        "value": "3992"
    },
    {
        "label": "3991",
        "value": "3991"
    },
    {
        "label": "3990",
        "value": "3990"
    },
    {
        "label": "3988",
        "value": "3988"
    },
    {
        "label": "3987",
        "value": "3987"
    },
    {
        "label": "3984",
        "value": "3984"
    },
    {
        "label": "3981",
        "value": "3981"
    },
    {
        "label": "3980",
        "value": "3980"
    },
    {
        "label": "3979",
        "value": "3979"
    },
    {
        "label": "3978",
        "value": "3978"
    },
    {
        "label": "3977",
        "value": "3977"
    },
    {
        "label": "3976",
        "value": "3976"
    },
    {
        "label": "3975",
        "value": "3975"
    },
    {
        "label": "3971",
        "value": "3971"
    },
    {
        "label": "3967",
        "value": "3967"
    },
    {
        "label": "3966",
        "value": "3966"
    },
    {
        "label": "3965",
        "value": "3965"
    },
    {
        "label": "3964",
        "value": "3964"
    },
    {
        "label": "3962",
        "value": "3962"
    },
    {
        "label": "3960",
        "value": "3960"
    },
    {
        "label": "3959",
        "value": "3959"
    },
    {
        "label": "3958",
        "value": "3958"
    },
    {
        "label": "3957",
        "value": "3957"
    },
    {
        "label": "3956",
        "value": "3956"
    },
    {
        "label": "3954",
        "value": "3954"
    },
    {
        "label": "3953",
        "value": "3953"
    },
    {
        "label": "3951",
        "value": "3951"
    },
    {
        "label": "3950",
        "value": "3950"
    },
    {
        "label": "3946",
        "value": "3946"
    },
    {
        "label": "3945",
        "value": "3945"
    },
    {
        "label": "3944",
        "value": "3944"
    },
    {
        "label": "3943",
        "value": "3943"
    },
    {
        "label": "3942",
        "value": "3942"
    },
    {
        "label": "3941",
        "value": "3941"
    },
    {
        "label": "3940",
        "value": "3940"
    },
    {
        "label": "3939",
        "value": "3939"
    },
    {
        "label": "3938",
        "value": "3938"
    },
    {
        "label": "3937",
        "value": "3937"
    },
    {
        "label": "3936",
        "value": "3936"
    },
    {
        "label": "3934",
        "value": "3934"
    },
    {
        "label": "3933",
        "value": "3933"
    },
    {
        "label": "3931",
        "value": "3931"
    },
    {
        "label": "3930",
        "value": "3930"
    },
    {
        "label": "3929",
        "value": "3929"
    },
    {
        "label": "3928",
        "value": "3928"
    },
    {
        "label": "3927",
        "value": "3927"
    },
    {
        "label": "3926",
        "value": "3926"
    },
    {
        "label": "3925",
        "value": "3925"
    },
    {
        "label": "3923",
        "value": "3923"
    },
    {
        "label": "3922",
        "value": "3922"
    },
    {
        "label": "3921",
        "value": "3921"
    },
    {
        "label": "3920",
        "value": "3920"
    },
    {
        "label": "3919",
        "value": "3919"
    },
    {
        "label": "3918",
        "value": "3918"
    },
    {
        "label": "3916",
        "value": "3916"
    },
    {
        "label": "3915",
        "value": "3915"
    },
    {
        "label": "3913",
        "value": "3913"
    },
    {
        "label": "3912",
        "value": "3912"
    },
    {
        "label": "3911",
        "value": "3911"
    },
    {
        "label": "3910",
        "value": "3910"
    },
    {
        "label": "3909",
        "value": "3909"
    },
    {
        "label": "3904",
        "value": "3904"
    },
    {
        "label": "3903",
        "value": "3903"
    },
    {
        "label": "3902",
        "value": "3902"
    },
    {
        "label": "3900",
        "value": "3900"
    },
    {
        "label": "3898",
        "value": "3898"
    },
    {
        "label": "3896",
        "value": "3896"
    },
    {
        "label": "3895",
        "value": "3895"
    },
    {
        "label": "3893",
        "value": "3893"
    },
    {
        "label": "3892",
        "value": "3892"
    },
    {
        "label": "3891",
        "value": "3891"
    },
    {
        "label": "3890",
        "value": "3890"
    },
    {
        "label": "3889",
        "value": "3889"
    },
    {
        "label": "3888",
        "value": "3888"
    },
    {
        "label": "3887",
        "value": "3887"
    },
    {
        "label": "3886",
        "value": "3886"
    },
    {
        "label": "3885",
        "value": "3885"
    },
    {
        "label": "3882",
        "value": "3882"
    },
    {
        "label": "3880",
        "value": "3880"
    },
    {
        "label": "3878",
        "value": "3878"
    },
    {
        "label": "3875",
        "value": "3875"
    },
    {
        "label": "3874",
        "value": "3874"
    },
    {
        "label": "3873",
        "value": "3873"
    },
    {
        "label": "3871",
        "value": "3871"
    },
    {
        "label": "3870",
        "value": "3870"
    },
    {
        "label": "3869",
        "value": "3869"
    },
    {
        "label": "3865",
        "value": "3865"
    },
    {
        "label": "3864",
        "value": "3864"
    },
    {
        "label": "3862",
        "value": "3862"
    },
    {
        "label": "3860",
        "value": "3860"
    },
    {
        "label": "3859",
        "value": "3859"
    },
    {
        "label": "3858",
        "value": "3858"
    },
    {
        "label": "3857",
        "value": "3857"
    },
    {
        "label": "3856",
        "value": "3856"
    },
    {
        "label": "3854",
        "value": "3854"
    },
    {
        "label": "3852",
        "value": "3852"
    },
    {
        "label": "3851",
        "value": "3851"
    },
    {
        "label": "3850",
        "value": "3850"
    },
    {
        "label": "3847",
        "value": "3847"
    },
    {
        "label": "3844",
        "value": "3844"
    },
    {
        "label": "3842",
        "value": "3842"
    },
    {
        "label": "3840",
        "value": "3840"
    },
    {
        "label": "3835",
        "value": "3835"
    },
    {
        "label": "3833",
        "value": "3833"
    },
    {
        "label": "3832",
        "value": "3832"
    },
    {
        "label": "3831",
        "value": "3831"
    },
    {
        "label": "3825",
        "value": "3825"
    },
    {
        "label": "3824",
        "value": "3824"
    },
    {
        "label": "3823",
        "value": "3823"
    },
    {
        "label": "3822",
        "value": "3822"
    },
    {
        "label": "3821",
        "value": "3821"
    },
    {
        "label": "3820",
        "value": "3820"
    },
    {
        "label": "3818",
        "value": "3818"
    },
    {
        "label": "3816",
        "value": "3816"
    },
    {
        "label": "3815",
        "value": "3815"
    },
    {
        "label": "3814",
        "value": "3814"
    },
    {
        "label": "3813",
        "value": "3813"
    },
    {
        "label": "3812",
        "value": "3812"
    },
    {
        "label": "3810",
        "value": "3810"
    },
    {
        "label": "3809",
        "value": "3809"
    },
    {
        "label": "3808",
        "value": "3808"
    },
    {
        "label": "3807",
        "value": "3807"
    },
    {
        "label": "3806",
        "value": "3806"
    },
    {
        "label": "3805",
        "value": "3805"
    },
    {
        "label": "3804",
        "value": "3804"
    },
    {
        "label": "3803",
        "value": "3803"
    },
    {
        "label": "3802",
        "value": "3802"
    },
    {
        "label": "3800",
        "value": "3800"
    },
    {
        "label": "3799",
        "value": "3799"
    },
    {
        "label": "3797",
        "value": "3797"
    },
    {
        "label": "3796",
        "value": "3796"
    },
    {
        "label": "3795",
        "value": "3795"
    },
    {
        "label": "3793",
        "value": "3793"
    },
    {
        "label": "3792",
        "value": "3792"
    },
    {
        "label": "3791",
        "value": "3791"
    },
    {
        "label": "3789",
        "value": "3789"
    },
    {
        "label": "3788",
        "value": "3788"
    },
    {
        "label": "3787",
        "value": "3787"
    },
    {
        "label": "3786",
        "value": "3786"
    },
    {
        "label": "3785",
        "value": "3785"
    },
    {
        "label": "3783",
        "value": "3783"
    },
    {
        "label": "3782",
        "value": "3782"
    },
    {
        "label": "3781",
        "value": "3781"
    },
    {
        "label": "3779",
        "value": "3779"
    },
    {
        "label": "3778",
        "value": "3778"
    },
    {
        "label": "3777",
        "value": "3777"
    },
    {
        "label": "3775",
        "value": "3775"
    },
    {
        "label": "3770",
        "value": "3770"
    },
    {
        "label": "3767",
        "value": "3767"
    },
    {
        "label": "3766",
        "value": "3766"
    },
    {
        "label": "3765",
        "value": "3765"
    },
    {
        "label": "3764",
        "value": "3764"
    },
    {
        "label": "3763",
        "value": "3763"
    },
    {
        "label": "3762",
        "value": "3762"
    },
    {
        "label": "3761",
        "value": "3761"
    },
    {
        "label": "3760",
        "value": "3760"
    },
    {
        "label": "3759",
        "value": "3759"
    },
    {
        "label": "3758",
        "value": "3758"
    },
    {
        "label": "3757",
        "value": "3757"
    },
    {
        "label": "3756",
        "value": "3756"
    },
    {
        "label": "3755",
        "value": "3755"
    },
    {
        "label": "3754",
        "value": "3754"
    },
    {
        "label": "3753",
        "value": "3753"
    },
    {
        "label": "3752",
        "value": "3752"
    },
    {
        "label": "3751",
        "value": "3751"
    },
    {
        "label": "3750",
        "value": "3750"
    },
    {
        "label": "3749",
        "value": "3749"
    },
    {
        "label": "3747",
        "value": "3747"
    },
    {
        "label": "3746",
        "value": "3746"
    },
    {
        "label": "3744",
        "value": "3744"
    },
    {
        "label": "3741",
        "value": "3741"
    },
    {
        "label": "3740",
        "value": "3740"
    },
    {
        "label": "3739",
        "value": "3739"
    },
    {
        "label": "3738",
        "value": "3738"
    },
    {
        "label": "3737",
        "value": "3737"
    },
    {
        "label": "3735",
        "value": "3735"
    },
    {
        "label": "3733",
        "value": "3733"
    },
    {
        "label": "3732",
        "value": "3732"
    },
    {
        "label": "3730",
        "value": "3730"
    },
    {
        "label": "3728",
        "value": "3728"
    },
    {
        "label": "3727",
        "value": "3727"
    },
    {
        "label": "3726",
        "value": "3726"
    },
    {
        "label": "3725",
        "value": "3725"
    },
    {
        "label": "3723",
        "value": "3723"
    },
    {
        "label": "3722",
        "value": "3722"
    },
    {
        "label": "3720",
        "value": "3720"
    },
    {
        "label": "3719",
        "value": "3719"
    },
    {
        "label": "3718",
        "value": "3718"
    },
    {
        "label": "3717",
        "value": "3717"
    },
    {
        "label": "3715",
        "value": "3715"
    },
    {
        "label": "3714",
        "value": "3714"
    },
    {
        "label": "3713",
        "value": "3713"
    },
    {
        "label": "3712",
        "value": "3712"
    },
    {
        "label": "3711",
        "value": "3711"
    },
    {
        "label": "3708",
        "value": "3708"
    },
    {
        "label": "3705",
        "value": "3705"
    },
    {
        "label": "3704",
        "value": "3704"
    },
    {
        "label": "3701",
        "value": "3701"
    },
    {
        "label": "3700",
        "value": "3700"
    },
    {
        "label": "3699",
        "value": "3699"
    },
    {
        "label": "3698",
        "value": "3698"
    },
    {
        "label": "3697",
        "value": "3697"
    },
    {
        "label": "3695",
        "value": "3695"
    },
    {
        "label": "3690",
        "value": "3690"
    },
    {
        "label": "3688",
        "value": "3688"
    },
    {
        "label": "3687",
        "value": "3687"
    },
    {
        "label": "3685",
        "value": "3685"
    },
    {
        "label": "3683",
        "value": "3683"
    },
    {
        "label": "3682",
        "value": "3682"
    },
    {
        "label": "3678",
        "value": "3678"
    },
    {
        "label": "3677",
        "value": "3677"
    },
    {
        "label": "3675",
        "value": "3675"
    },
    {
        "label": "3673",
        "value": "3673"
    },
    {
        "label": "3672",
        "value": "3672"
    },
    {
        "label": "3670",
        "value": "3670"
    },
    {
        "label": "3669",
        "value": "3669"
    },
    {
        "label": "3666",
        "value": "3666"
    },
    {
        "label": "3665",
        "value": "3665"
    },
    {
        "label": "3664",
        "value": "3664"
    },
    {
        "label": "3663",
        "value": "3663"
    },
    {
        "label": "3662",
        "value": "3662"
    },
    {
        "label": "3660",
        "value": "3660"
    },
    {
        "label": "3659",
        "value": "3659"
    },
    {
        "label": "3658",
        "value": "3658"
    },
    {
        "label": "3649",
        "value": "3649"
    },
    {
        "label": "3647",
        "value": "3647"
    },
    {
        "label": "3646",
        "value": "3646"
    },
    {
        "label": "3641",
        "value": "3641"
    },
    {
        "label": "3640",
        "value": "3640"
    },
    {
        "label": "3638",
        "value": "3638"
    },
    {
        "label": "3637",
        "value": "3637"
    },
    {
        "label": "3636",
        "value": "3636"
    },
    {
        "label": "3635",
        "value": "3635"
    },
    {
        "label": "3634",
        "value": "3634"
    },
    {
        "label": "3633",
        "value": "3633"
    },
    {
        "label": "3631",
        "value": "3631"
    },
    {
        "label": "3630",
        "value": "3630"
    },
    {
        "label": "3629",
        "value": "3629"
    },
    {
        "label": "3624",
        "value": "3624"
    },
    {
        "label": "3623",
        "value": "3623"
    },
    {
        "label": "3622",
        "value": "3622"
    },
    {
        "label": "3621",
        "value": "3621"
    },
    {
        "label": "3620",
        "value": "3620"
    },
    {
        "label": "3618",
        "value": "3618"
    },
    {
        "label": "3617",
        "value": "3617"
    },
    {
        "label": "3616",
        "value": "3616"
    },
    {
        "label": "3614",
        "value": "3614"
    },
    {
        "label": "3612",
        "value": "3612"
    },
    {
        "label": "3610",
        "value": "3610"
    },
    {
        "label": "3608",
        "value": "3608"
    },
    {
        "label": "3607",
        "value": "3607"
    },
    {
        "label": "3599",
        "value": "3599"
    },
    {
        "label": "3597",
        "value": "3597"
    },
    {
        "label": "3596",
        "value": "3596"
    },
    {
        "label": "3595",
        "value": "3595"
    },
    {
        "label": "3594",
        "value": "3594"
    },
    {
        "label": "3591",
        "value": "3591"
    },
    {
        "label": "3590",
        "value": "3590"
    },
    {
        "label": "3589",
        "value": "3589"
    },
    {
        "label": "3588",
        "value": "3588"
    },
    {
        "label": "3584",
        "value": "3584"
    },
    {
        "label": "3583",
        "value": "3583"
    },
    {
        "label": "3581",
        "value": "3581"
    },
    {
        "label": "3580",
        "value": "3580"
    },
    {
        "label": "3576",
        "value": "3576"
    },
    {
        "label": "3575",
        "value": "3575"
    },
    {
        "label": "3573",
        "value": "3573"
    },
    {
        "label": "3572",
        "value": "3572"
    },
    {
        "label": "3571",
        "value": "3571"
    },
    {
        "label": "3570",
        "value": "3570"
    },
    {
        "label": "3568",
        "value": "3568"
    },
    {
        "label": "3567",
        "value": "3567"
    },
    {
        "label": "3566",
        "value": "3566"
    },
    {
        "label": "3565",
        "value": "3565"
    },
    {
        "label": "3563",
        "value": "3563"
    },
    {
        "label": "3562",
        "value": "3562"
    },
    {
        "label": "3561",
        "value": "3561"
    },
    {
        "label": "3559",
        "value": "3559"
    },
    {
        "label": "3558",
        "value": "3558"
    },
    {
        "label": "3557",
        "value": "3557"
    },
    {
        "label": "3556",
        "value": "3556"
    },
    {
        "label": "3555",
        "value": "3555"
    },
    {
        "label": "3551",
        "value": "3551"
    },
    {
        "label": "3550",
        "value": "3550"
    },
    {
        "label": "3546",
        "value": "3546"
    },
    {
        "label": "3544",
        "value": "3544"
    },
    {
        "label": "3542",
        "value": "3542"
    },
    {
        "label": "3540",
        "value": "3540"
    },
    {
        "label": "3537",
        "value": "3537"
    },
    {
        "label": "3533",
        "value": "3533"
    },
    {
        "label": "3531",
        "value": "3531"
    },
    {
        "label": "3530",
        "value": "3530"
    },
    {
        "label": "3529",
        "value": "3529"
    },
    {
        "label": "3527",
        "value": "3527"
    },
    {
        "label": "3525",
        "value": "3525"
    },
    {
        "label": "3523",
        "value": "3523"
    },
    {
        "label": "3522",
        "value": "3522"
    },
    {
        "label": "3521",
        "value": "3521"
    },
    {
        "label": "3520",
        "value": "3520"
    },
    {
        "label": "3518",
        "value": "3518"
    },
    {
        "label": "3517",
        "value": "3517"
    },
    {
        "label": "3516",
        "value": "3516"
    },
    {
        "label": "3515",
        "value": "3515"
    },
    {
        "label": "3512",
        "value": "3512"
    },
    {
        "label": "3509",
        "value": "3509"
    },
    {
        "label": "3507",
        "value": "3507"
    },
    {
        "label": "3506",
        "value": "3506"
    },
    {
        "label": "3500",
        "value": "3500"
    },
    {
        "label": "3496",
        "value": "3496"
    },
    {
        "label": "3491",
        "value": "3491"
    },
    {
        "label": "3489",
        "value": "3489"
    },
    {
        "label": "3488",
        "value": "3488"
    },
    {
        "label": "3487",
        "value": "3487"
    },
    {
        "label": "3485",
        "value": "3485"
    },
    {
        "label": "3483",
        "value": "3483"
    },
    {
        "label": "3482",
        "value": "3482"
    },
    {
        "label": "3480",
        "value": "3480"
    },
    {
        "label": "3478",
        "value": "3478"
    },
    {
        "label": "3477",
        "value": "3477"
    },
    {
        "label": "3475",
        "value": "3475"
    },
    {
        "label": "3472",
        "value": "3472"
    },
    {
        "label": "3469",
        "value": "3469"
    },
    {
        "label": "3468",
        "value": "3468"
    },
    {
        "label": "3467",
        "value": "3467"
    },
    {
        "label": "3465",
        "value": "3465"
    },
    {
        "label": "3464",
        "value": "3464"
    },
    {
        "label": "3463",
        "value": "3463"
    },
    {
        "label": "3462",
        "value": "3462"
    },
    {
        "label": "3461",
        "value": "3461"
    },
    {
        "label": "3460",
        "value": "3460"
    },
    {
        "label": "3458",
        "value": "3458"
    },
    {
        "label": "3453",
        "value": "3453"
    },
    {
        "label": "3451",
        "value": "3451"
    },
    {
        "label": "3450",
        "value": "3450"
    },
    {
        "label": "3448",
        "value": "3448"
    },
    {
        "label": "3447",
        "value": "3447"
    },
    {
        "label": "3446",
        "value": "3446"
    },
    {
        "label": "3444",
        "value": "3444"
    },
    {
        "label": "3442",
        "value": "3442"
    },
    {
        "label": "3441",
        "value": "3441"
    },
    {
        "label": "3440",
        "value": "3440"
    },
    {
        "label": "3438",
        "value": "3438"
    },
    {
        "label": "3437",
        "value": "3437"
    },
    {
        "label": "3435",
        "value": "3435"
    },
    {
        "label": "3434",
        "value": "3434"
    },
    {
        "label": "3433",
        "value": "3433"
    },
    {
        "label": "3432",
        "value": "3432"
    },
    {
        "label": "3431",
        "value": "3431"
    },
    {
        "label": "3430",
        "value": "3430"
    },
    {
        "label": "3429",
        "value": "3429"
    },
    {
        "label": "3428",
        "value": "3428"
    },
    {
        "label": "3427",
        "value": "3427"
    },
    {
        "label": "3424",
        "value": "3424"
    },
    {
        "label": "3423",
        "value": "3423"
    },
    {
        "label": "3420",
        "value": "3420"
    },
    {
        "label": "3419",
        "value": "3419"
    },
    {
        "label": "3418",
        "value": "3418"
    },
    {
        "label": "3415",
        "value": "3415"
    },
    {
        "label": "3414",
        "value": "3414"
    },
    {
        "label": "3413",
        "value": "3413"
    },
    {
        "label": "3412",
        "value": "3412"
    },
    {
        "label": "3409",
        "value": "3409"
    },
    {
        "label": "3407",
        "value": "3407"
    },
    {
        "label": "3401",
        "value": "3401"
    },
    {
        "label": "3400",
        "value": "3400"
    },
    {
        "label": "3396",
        "value": "3396"
    },
    {
        "label": "3395",
        "value": "3395"
    },
    {
        "label": "3393",
        "value": "3393"
    },
    {
        "label": "3392",
        "value": "3392"
    },
    {
        "label": "3391",
        "value": "3391"
    },
    {
        "label": "3390",
        "value": "3390"
    },
    {
        "label": "3388",
        "value": "3388"
    },
    {
        "label": "3387",
        "value": "3387"
    },
    {
        "label": "3385",
        "value": "3385"
    },
    {
        "label": "3384",
        "value": "3384"
    },
    {
        "label": "3381",
        "value": "3381"
    },
    {
        "label": "3380",
        "value": "3380"
    },
    {
        "label": "3379",
        "value": "3379"
    },
    {
        "label": "3378",
        "value": "3378"
    },
    {
        "label": "3377",
        "value": "3377"
    },
    {
        "label": "3375",
        "value": "3375"
    },
    {
        "label": "3374",
        "value": "3374"
    },
    {
        "label": "3373",
        "value": "3373"
    },
    {
        "label": "3371",
        "value": "3371"
    },
    {
        "label": "3370",
        "value": "3370"
    },
    {
        "label": "3364",
        "value": "3364"
    },
    {
        "label": "3363",
        "value": "3363"
    },
    {
        "label": "3361",
        "value": "3361"
    },
    {
        "label": "3360",
        "value": "3360"
    },
    {
        "label": "3357",
        "value": "3357"
    },
    {
        "label": "3356",
        "value": "3356"
    },
    {
        "label": "3355",
        "value": "3355"
    },
    {
        "label": "3352",
        "value": "3352"
    },
    {
        "label": "3351",
        "value": "3351"
    },
    {
        "label": "3350",
        "value": "3350"
    },
    {
        "label": "3345",
        "value": "3345"
    },
    {
        "label": "3342",
        "value": "3342"
    },
    {
        "label": "3341",
        "value": "3341"
    },
    {
        "label": "3340",
        "value": "3340"
    },
    {
        "label": "3338",
        "value": "3338"
    },
    {
        "label": "3337",
        "value": "3337"
    },
    {
        "label": "3335",
        "value": "3335"
    },
    {
        "label": "3334",
        "value": "3334"
    },
    {
        "label": "3333",
        "value": "3333"
    },
    {
        "label": "3332",
        "value": "3332"
    },
    {
        "label": "3331",
        "value": "3331"
    },
    {
        "label": "3330",
        "value": "3330"
    },
    {
        "label": "3329",
        "value": "3329"
    },
    {
        "label": "3328",
        "value": "3328"
    },
    {
        "label": "3325",
        "value": "3325"
    },
    {
        "label": "3324",
        "value": "3324"
    },
    {
        "label": "3323",
        "value": "3323"
    },
    {
        "label": "3322",
        "value": "3322"
    },
    {
        "label": "3321",
        "value": "3321"
    },
    {
        "label": "3319",
        "value": "3319"
    },
    {
        "label": "3318",
        "value": "3318"
    },
    {
        "label": "3317",
        "value": "3317"
    },
    {
        "label": "3315",
        "value": "3315"
    },
    {
        "label": "3314",
        "value": "3314"
    },
    {
        "label": "3312",
        "value": "3312"
    },
    {
        "label": "3311",
        "value": "3311"
    },
    {
        "label": "3310",
        "value": "3310"
    },
    {
        "label": "3309",
        "value": "3309"
    },
    {
        "label": "3305",
        "value": "3305"
    },
    {
        "label": "3304",
        "value": "3304"
    },
    {
        "label": "3303",
        "value": "3303"
    },
    {
        "label": "3302",
        "value": "3302"
    },
    {
        "label": "3301",
        "value": "3301"
    },
    {
        "label": "3300",
        "value": "3300"
    },
    {
        "label": "3294",
        "value": "3294"
    },
    {
        "label": "3293",
        "value": "3293"
    },
    {
        "label": "3292",
        "value": "3292"
    },
    {
        "label": "3289",
        "value": "3289"
    },
    {
        "label": "3287",
        "value": "3287"
    },
    {
        "label": "3286",
        "value": "3286"
    },
    {
        "label": "3285",
        "value": "3285"
    },
    {
        "label": "3284",
        "value": "3284"
    },
    {
        "label": "3283",
        "value": "3283"
    },
    {
        "label": "3282",
        "value": "3282"
    },
    {
        "label": "3281",
        "value": "3281"
    },
    {
        "label": "3280",
        "value": "3280"
    },
    {
        "label": "3279",
        "value": "3279"
    },
    {
        "label": "3278",
        "value": "3278"
    },
    {
        "label": "3277",
        "value": "3277"
    },
    {
        "label": "3276",
        "value": "3276"
    },
    {
        "label": "3275",
        "value": "3275"
    },
    {
        "label": "3274",
        "value": "3274"
    },
    {
        "label": "3273",
        "value": "3273"
    },
    {
        "label": "3272",
        "value": "3272"
    },
    {
        "label": "3271",
        "value": "3271"
    },
    {
        "label": "3270",
        "value": "3270"
    },
    {
        "label": "3269",
        "value": "3269"
    },
    {
        "label": "3268",
        "value": "3268"
    },
    {
        "label": "3267",
        "value": "3267"
    },
    {
        "label": "3266",
        "value": "3266"
    },
    {
        "label": "3265",
        "value": "3265"
    },
    {
        "label": "3264",
        "value": "3264"
    },
    {
        "label": "3260",
        "value": "3260"
    },
    {
        "label": "3254",
        "value": "3254"
    },
    {
        "label": "3251",
        "value": "3251"
    },
    {
        "label": "3250",
        "value": "3250"
    },
    {
        "label": "3249",
        "value": "3249"
    },
    {
        "label": "3243",
        "value": "3243"
    },
    {
        "label": "3242",
        "value": "3242"
    },
    {
        "label": "3241",
        "value": "3241"
    },
    {
        "label": "3240",
        "value": "3240"
    },
    {
        "label": "3239",
        "value": "3239"
    },
    {
        "label": "3238",
        "value": "3238"
    },
    {
        "label": "3237",
        "value": "3237"
    },
    {
        "label": "3236",
        "value": "3236"
    },
    {
        "label": "3235",
        "value": "3235"
    },
    {
        "label": "3233",
        "value": "3233"
    },
    {
        "label": "3232",
        "value": "3232"
    },
    {
        "label": "3231",
        "value": "3231"
    },
    {
        "label": "3230",
        "value": "3230"
    },
    {
        "label": "3228",
        "value": "3228"
    },
    {
        "label": "3227",
        "value": "3227"
    },
    {
        "label": "3226",
        "value": "3226"
    },
    {
        "label": "3225",
        "value": "3225"
    },
    {
        "label": "3224",
        "value": "3224"
    },
    {
        "label": "3223",
        "value": "3223"
    },
    {
        "label": "3222",
        "value": "3222"
    },
    {
        "label": "3221",
        "value": "3221"
    },
    {
        "label": "3220",
        "value": "3220"
    },
    {
        "label": "3219",
        "value": "3219"
    },
    {
        "label": "3218",
        "value": "3218"
    },
    {
        "label": "3217",
        "value": "3217"
    },
    {
        "label": "3216",
        "value": "3216"
    },
    {
        "label": "3215",
        "value": "3215"
    },
    {
        "label": "3214",
        "value": "3214"
    },
    {
        "label": "3212",
        "value": "3212"
    },
    {
        "label": "3211",
        "value": "3211"
    },
    {
        "label": "3207",
        "value": "3207"
    },
    {
        "label": "3206",
        "value": "3206"
    },
    {
        "label": "3205",
        "value": "3205"
    },
    {
        "label": "3204",
        "value": "3204"
    },
    {
        "label": "3202",
        "value": "3202"
    },
    {
        "label": "3201",
        "value": "3201"
    },
    {
        "label": "3200",
        "value": "3200"
    },
    {
        "label": "3199",
        "value": "3199"
    },
    {
        "label": "3198",
        "value": "3198"
    },
    {
        "label": "3197",
        "value": "3197"
    },
    {
        "label": "3196",
        "value": "3196"
    },
    {
        "label": "3195",
        "value": "3195"
    },
    {
        "label": "3194",
        "value": "3194"
    },
    {
        "label": "3193",
        "value": "3193"
    },
    {
        "label": "3192",
        "value": "3192"
    },
    {
        "label": "3191",
        "value": "3191"
    },
    {
        "label": "3190",
        "value": "3190"
    },
    {
        "label": "3189",
        "value": "3189"
    },
    {
        "label": "3188",
        "value": "3188"
    },
    {
        "label": "3187",
        "value": "3187"
    },
    {
        "label": "3186",
        "value": "3186"
    },
    {
        "label": "3185",
        "value": "3185"
    },
    {
        "label": "3184",
        "value": "3184"
    },
    {
        "label": "3183",
        "value": "3183"
    },
    {
        "label": "3182",
        "value": "3182"
    },
    {
        "label": "3181",
        "value": "3181"
    },
    {
        "label": "3180",
        "value": "3180"
    },
    {
        "label": "3179",
        "value": "3179"
    },
    {
        "label": "3178",
        "value": "3178"
    },
    {
        "label": "3177",
        "value": "3177"
    },
    {
        "label": "3175",
        "value": "3175"
    },
    {
        "label": "3174",
        "value": "3174"
    },
    {
        "label": "3173",
        "value": "3173"
    },
    {
        "label": "3172",
        "value": "3172"
    },
    {
        "label": "3171",
        "value": "3171"
    },
    {
        "label": "3170",
        "value": "3170"
    },
    {
        "label": "3169",
        "value": "3169"
    },
    {
        "label": "3168",
        "value": "3168"
    },
    {
        "label": "3167",
        "value": "3167"
    },
    {
        "label": "3166",
        "value": "3166"
    },
    {
        "label": "3165",
        "value": "3165"
    },
    {
        "label": "3163",
        "value": "3163"
    },
    {
        "label": "3162",
        "value": "3162"
    },
    {
        "label": "3161",
        "value": "3161"
    },
    {
        "label": "3160",
        "value": "3160"
    },
    {
        "label": "3159",
        "value": "3159"
    },
    {
        "label": "3158",
        "value": "3158"
    },
    {
        "label": "3156",
        "value": "3156"
    },
    {
        "label": "3155",
        "value": "3155"
    },
    {
        "label": "3154",
        "value": "3154"
    },
    {
        "label": "3153",
        "value": "3153"
    },
    {
        "label": "3152",
        "value": "3152"
    },
    {
        "label": "3151",
        "value": "3151"
    },
    {
        "label": "3150",
        "value": "3150"
    },
    {
        "label": "3149",
        "value": "3149"
    },
    {
        "label": "3148",
        "value": "3148"
    },
    {
        "label": "3147",
        "value": "3147"
    },
    {
        "label": "3146",
        "value": "3146"
    },
    {
        "label": "3145",
        "value": "3145"
    },
    {
        "label": "3144",
        "value": "3144"
    },
    {
        "label": "3143",
        "value": "3143"
    },
    {
        "label": "3142",
        "value": "3142"
    },
    {
        "label": "3141",
        "value": "3141"
    },
    {
        "label": "3140",
        "value": "3140"
    },
    {
        "label": "3139",
        "value": "3139"
    },
    {
        "label": "3138",
        "value": "3138"
    },
    {
        "label": "3137",
        "value": "3137"
    },
    {
        "label": "3136",
        "value": "3136"
    },
    {
        "label": "3135",
        "value": "3135"
    },
    {
        "label": "3134",
        "value": "3134"
    },
    {
        "label": "3133",
        "value": "3133"
    },
    {
        "label": "3132",
        "value": "3132"
    },
    {
        "label": "3131",
        "value": "3131"
    },
    {
        "label": "3130",
        "value": "3130"
    },
    {
        "label": "3129",
        "value": "3129"
    },
    {
        "label": "3128",
        "value": "3128"
    },
    {
        "label": "3127",
        "value": "3127"
    },
    {
        "label": "3126",
        "value": "3126"
    },
    {
        "label": "3125",
        "value": "3125"
    },
    {
        "label": "3124",
        "value": "3124"
    },
    {
        "label": "3123",
        "value": "3123"
    },
    {
        "label": "3122",
        "value": "3122"
    },
    {
        "label": "3121",
        "value": "3121"
    },
    {
        "label": "3116",
        "value": "3116"
    },
    {
        "label": "3115",
        "value": "3115"
    },
    {
        "label": "3114",
        "value": "3114"
    },
    {
        "label": "3113",
        "value": "3113"
    },
    {
        "label": "3111",
        "value": "3111"
    },
    {
        "label": "3109",
        "value": "3109"
    },
    {
        "label": "3108",
        "value": "3108"
    },
    {
        "label": "3107",
        "value": "3107"
    },
    {
        "label": "3106",
        "value": "3106"
    },
    {
        "label": "3105",
        "value": "3105"
    },
    {
        "label": "3104",
        "value": "3104"
    },
    {
        "label": "3103",
        "value": "3103"
    },
    {
        "label": "3102",
        "value": "3102"
    },
    {
        "label": "3101",
        "value": "3101"
    },
    {
        "label": "3099",
        "value": "3099"
    },
    {
        "label": "3097",
        "value": "3097"
    },
    {
        "label": "3096",
        "value": "3096"
    },
    {
        "label": "3095",
        "value": "3095"
    },
    {
        "label": "3094",
        "value": "3094"
    },
    {
        "label": "3093",
        "value": "3093"
    },
    {
        "label": "3091",
        "value": "3091"
    },
    {
        "label": "3090",
        "value": "3090"
    },
    {
        "label": "3089",
        "value": "3089"
    },
    {
        "label": "3088",
        "value": "3088"
    },
    {
        "label": "3087",
        "value": "3087"
    },
    {
        "label": "3086",
        "value": "3086"
    },
    {
        "label": "3085",
        "value": "3085"
    },
    {
        "label": "3084",
        "value": "3084"
    },
    {
        "label": "3083",
        "value": "3083"
    },
    {
        "label": "3082",
        "value": "3082"
    },
    {
        "label": "3081",
        "value": "3081"
    },
    {
        "label": "3079",
        "value": "3079"
    },
    {
        "label": "3078",
        "value": "3078"
    },
    {
        "label": "3076",
        "value": "3076"
    },
    {
        "label": "3075",
        "value": "3075"
    },
    {
        "label": "3074",
        "value": "3074"
    },
    {
        "label": "3073",
        "value": "3073"
    },
    {
        "label": "3072",
        "value": "3072"
    },
    {
        "label": "3071",
        "value": "3071"
    },
    {
        "label": "3070",
        "value": "3070"
    },
    {
        "label": "3068",
        "value": "3068"
    },
    {
        "label": "3067",
        "value": "3067"
    },
    {
        "label": "3066",
        "value": "3066"
    },
    {
        "label": "3065",
        "value": "3065"
    },
    {
        "label": "3064",
        "value": "3064"
    },
    {
        "label": "3063",
        "value": "3063"
    },
    {
        "label": "3062",
        "value": "3062"
    },
    {
        "label": "3061",
        "value": "3061"
    },
    {
        "label": "3060",
        "value": "3060"
    },
    {
        "label": "3059",
        "value": "3059"
    },
    {
        "label": "3058",
        "value": "3058"
    },
    {
        "label": "3057",
        "value": "3057"
    },
    {
        "label": "3056",
        "value": "3056"
    },
    {
        "label": "3055",
        "value": "3055"
    },
    {
        "label": "3054",
        "value": "3054"
    },
    {
        "label": "3053",
        "value": "3053"
    },
    {
        "label": "3052",
        "value": "3052"
    },
    {
        "label": "3051",
        "value": "3051"
    },
    {
        "label": "3050",
        "value": "3050"
    },
    {
        "label": "3049",
        "value": "3049"
    },
    {
        "label": "3048",
        "value": "3048"
    },
    {
        "label": "3047",
        "value": "3047"
    },
    {
        "label": "3046",
        "value": "3046"
    },
    {
        "label": "3045",
        "value": "3045"
    },
    {
        "label": "3044",
        "value": "3044"
    },
    {
        "label": "3043",
        "value": "3043"
    },
    {
        "label": "3042",
        "value": "3042"
    },
    {
        "label": "3041",
        "value": "3041"
    },
    {
        "label": "3040",
        "value": "3040"
    },
    {
        "label": "3039",
        "value": "3039"
    },
    {
        "label": "3038",
        "value": "3038"
    },
    {
        "label": "3037",
        "value": "3037"
    },
    {
        "label": "3036",
        "value": "3036"
    },
    {
        "label": "3034",
        "value": "3034"
    },
    {
        "label": "3033",
        "value": "3033"
    },
    {
        "label": "3032",
        "value": "3032"
    },
    {
        "label": "3031",
        "value": "3031"
    },
    {
        "label": "3030",
        "value": "3030"
    },
    {
        "label": "3029",
        "value": "3029"
    },
    {
        "label": "3028",
        "value": "3028"
    },
    {
        "label": "3027",
        "value": "3027"
    },
    {
        "label": "3026",
        "value": "3026"
    },
    {
        "label": "3025",
        "value": "3025"
    },
    {
        "label": "3024",
        "value": "3024"
    },
    {
        "label": "3023",
        "value": "3023"
    },
    {
        "label": "3022",
        "value": "3022"
    },
    {
        "label": "3021",
        "value": "3021"
    },
    {
        "label": "3020",
        "value": "3020"
    },
    {
        "label": "3019",
        "value": "3019"
    },
    {
        "label": "3018",
        "value": "3018"
    },
    {
        "label": "3016",
        "value": "3016"
    },
    {
        "label": "3015",
        "value": "3015"
    },
    {
        "label": "3013",
        "value": "3013"
    },
    {
        "label": "3012",
        "value": "3012"
    },
    {
        "label": "3011",
        "value": "3011"
    },
    {
        "label": "3010",
        "value": "3010"
    },
    {
        "label": "3008",
        "value": "3008"
    },
    {
        "label": "3006",
        "value": "3006"
    },
    {
        "label": "3005",
        "value": "3005"
    },
    {
        "label": "3004",
        "value": "3004"
    },
    {
        "label": "3003",
        "value": "3003"
    },
    {
        "label": "3002",
        "value": "3002"
    },
    {
        "label": "3000",
        "value": "3000"
    },
    {
        "label": "7470",
        "value": "7470"
    },
    {
        "label": "7469",
        "value": "7469"
    },
    {
        "label": "7468",
        "value": "7468"
    },
    {
        "label": "7467",
        "value": "7467"
    },
    {
        "label": "7466",
        "value": "7466"
    },
    {
        "label": "7331",
        "value": "7331"
    },
    {
        "label": "7330",
        "value": "7330"
    },
    {
        "label": "7325",
        "value": "7325"
    },
    {
        "label": "7322",
        "value": "7322"
    },
    {
        "label": "7321",
        "value": "7321"
    },
    {
        "label": "7320",
        "value": "7320"
    },
    {
        "label": "7316",
        "value": "7316"
    },
    {
        "label": "7315",
        "value": "7315"
    },
    {
        "label": "7310",
        "value": "7310"
    },
    {
        "label": "7307",
        "value": "7307"
    },
    {
        "label": "7306",
        "value": "7306"
    },
    {
        "label": "7305",
        "value": "7305"
    },
    {
        "label": "7304",
        "value": "7304"
    },
    {
        "label": "7303",
        "value": "7303"
    },
    {
        "label": "7302",
        "value": "7302"
    },
    {
        "label": "7301",
        "value": "7301"
    },
    {
        "label": "7300",
        "value": "7300"
    },
    {
        "label": "7292",
        "value": "7292"
    },
    {
        "label": "7291",
        "value": "7291"
    },
    {
        "label": "7290",
        "value": "7290"
    },
    {
        "label": "7277",
        "value": "7277"
    },
    {
        "label": "7276",
        "value": "7276"
    },
    {
        "label": "7275",
        "value": "7275"
    },
    {
        "label": "7270",
        "value": "7270"
    },
    {
        "label": "7268",
        "value": "7268"
    },
    {
        "label": "7267",
        "value": "7267"
    },
    {
        "label": "7265",
        "value": "7265"
    },
    {
        "label": "7264",
        "value": "7264"
    },
    {
        "label": "7263",
        "value": "7263"
    },
    {
        "label": "7262",
        "value": "7262"
    },
    {
        "label": "7261",
        "value": "7261"
    },
    {
        "label": "7260",
        "value": "7260"
    },
    {
        "label": "7259",
        "value": "7259"
    },
    {
        "label": "7258",
        "value": "7258"
    },
    {
        "label": "7257",
        "value": "7257"
    },
    {
        "label": "7256",
        "value": "7256"
    },
    {
        "label": "7255",
        "value": "7255"
    },
    {
        "label": "7254",
        "value": "7254"
    },
    {
        "label": "7253",
        "value": "7253"
    },
    {
        "label": "7252",
        "value": "7252"
    },
    {
        "label": "7250",
        "value": "7250"
    },
    {
        "label": "7249",
        "value": "7249"
    },
    {
        "label": "7248",
        "value": "7248"
    },
    {
        "label": "7216",
        "value": "7216"
    },
    {
        "label": "7215",
        "value": "7215"
    },
    {
        "label": "7214",
        "value": "7214"
    },
    {
        "label": "7213",
        "value": "7213"
    },
    {
        "label": "7212",
        "value": "7212"
    },
    {
        "label": "7211",
        "value": "7211"
    },
    {
        "label": "7210",
        "value": "7210"
    },
    {
        "label": "7209",
        "value": "7209"
    },
    {
        "label": "7190",
        "value": "7190"
    },
    {
        "label": "7187",
        "value": "7187"
    },
    {
        "label": "7186",
        "value": "7186"
    },
    {
        "label": "7185",
        "value": "7185"
    },
    {
        "label": "7184",
        "value": "7184"
    },
    {
        "label": "7183",
        "value": "7183"
    },
    {
        "label": "7182",
        "value": "7182"
    },
    {
        "label": "7180",
        "value": "7180"
    },
    {
        "label": "7179",
        "value": "7179"
    },
    {
        "label": "7178",
        "value": "7178"
    },
    {
        "label": "7177",
        "value": "7177"
    },
    {
        "label": "7176",
        "value": "7176"
    },
    {
        "label": "7175",
        "value": "7175"
    },
    {
        "label": "7174",
        "value": "7174"
    },
    {
        "label": "7173",
        "value": "7173"
    },
    {
        "label": "7172",
        "value": "7172"
    },
    {
        "label": "7171",
        "value": "7171"
    },
    {
        "label": "7170",
        "value": "7170"
    },
    {
        "label": "7163",
        "value": "7163"
    },
    {
        "label": "7162",
        "value": "7162"
    },
    {
        "label": "7155",
        "value": "7155"
    },
    {
        "label": "7150",
        "value": "7150"
    },
    {
        "label": "7140",
        "value": "7140"
    },
    {
        "label": "7139",
        "value": "7139"
    },
    {
        "label": "7120",
        "value": "7120"
    },
    {
        "label": "7119",
        "value": "7119"
    },
    {
        "label": "7117",
        "value": "7117"
    },
    {
        "label": "7116",
        "value": "7116"
    },
    {
        "label": "7113",
        "value": "7113"
    },
    {
        "label": "7112",
        "value": "7112"
    },
    {
        "label": "7109",
        "value": "7109"
    },
    {
        "label": "7055",
        "value": "7055"
    },
    {
        "label": "7054",
        "value": "7054"
    },
    {
        "label": "7053",
        "value": "7053"
    },
    {
        "label": "7052",
        "value": "7052"
    },
    {
        "label": "7050",
        "value": "7050"
    },
    {
        "label": "7030",
        "value": "7030"
    },
    {
        "label": "7027",
        "value": "7027"
    },
    {
        "label": "7026",
        "value": "7026"
    },
    {
        "label": "7025",
        "value": "7025"
    },
    {
        "label": "7024",
        "value": "7024"
    },
    {
        "label": "7023",
        "value": "7023"
    },
    {
        "label": "7022",
        "value": "7022"
    },
    {
        "label": "7021",
        "value": "7021"
    },
    {
        "label": "7020",
        "value": "7020"
    },
    {
        "label": "7019",
        "value": "7019"
    },
    {
        "label": "7018",
        "value": "7018"
    },
    {
        "label": "7017",
        "value": "7017"
    },
    {
        "label": "7016",
        "value": "7016"
    },
    {
        "label": "7015",
        "value": "7015"
    },
    {
        "label": "7012",
        "value": "7012"
    },
    {
        "label": "7011",
        "value": "7011"
    },
    {
        "label": "7010",
        "value": "7010"
    },
    {
        "label": "7009",
        "value": "7009"
    },
    {
        "label": "7008",
        "value": "7008"
    },
    {
        "label": "7007",
        "value": "7007"
    },
    {
        "label": "7005",
        "value": "7005"
    },
    {
        "label": "7004",
        "value": "7004"
    },
    {
        "label": "7001",
        "value": "7001"
    },
    {
        "label": "7000",
        "value": "7000"
    },
    {
        "label": "5950",
        "value": "5950"
    },
    {
        "label": "5734",
        "value": "5734"
    },
    {
        "label": "5733",
        "value": "5733"
    },
    {
        "label": "5732",
        "value": "5732"
    },
    {
        "label": "5731",
        "value": "5731"
    },
    {
        "label": "5730",
        "value": "5730"
    },
    {
        "label": "5725",
        "value": "5725"
    },
    {
        "label": "5724",
        "value": "5724"
    },
    {
        "label": "5723",
        "value": "5723"
    },
    {
        "label": "5722",
        "value": "5722"
    },
    {
        "label": "5720",
        "value": "5720"
    },
    {
        "label": "5710",
        "value": "5710"
    },
    {
        "label": "5700",
        "value": "5700"
    },
    {
        "label": "5690",
        "value": "5690"
    },
    {
        "label": "5680",
        "value": "5680"
    },
    {
        "label": "5671",
        "value": "5671"
    },
    {
        "label": "5670",
        "value": "5670"
    },
    {
        "label": "5661",
        "value": "5661"
    },
    {
        "label": "5660",
        "value": "5660"
    },
    {
        "label": "5655",
        "value": "5655"
    },
    {
        "label": "5654",
        "value": "5654"
    },
    {
        "label": "5653",
        "value": "5653"
    },
    {
        "label": "5652",
        "value": "5652"
    },
    {
        "label": "5651",
        "value": "5651"
    },
    {
        "label": "5650",
        "value": "5650"
    },
    {
        "label": "5642",
        "value": "5642"
    },
    {
        "label": "5641",
        "value": "5641"
    },
    {
        "label": "5640",
        "value": "5640"
    },
    {
        "label": "5633",
        "value": "5633"
    },
    {
        "label": "5632",
        "value": "5632"
    },
    {
        "label": "5631",
        "value": "5631"
    },
    {
        "label": "5630",
        "value": "5630"
    },
    {
        "label": "5609",
        "value": "5609"
    },
    {
        "label": "5608",
        "value": "5608"
    },
    {
        "label": "5607",
        "value": "5607"
    },
    {
        "label": "5606",
        "value": "5606"
    },
    {
        "label": "5605",
        "value": "5605"
    },
    {
        "label": "5604",
        "value": "5604"
    },
    {
        "label": "5603",
        "value": "5603"
    },
    {
        "label": "5602",
        "value": "5602"
    },
    {
        "label": "5601",
        "value": "5601"
    },
    {
        "label": "5600",
        "value": "5600"
    },
    {
        "label": "5583",
        "value": "5583"
    },
    {
        "label": "5582",
        "value": "5582"
    },
    {
        "label": "5581",
        "value": "5581"
    },
    {
        "label": "5580",
        "value": "5580"
    },
    {
        "label": "5577",
        "value": "5577"
    },
    {
        "label": "5576",
        "value": "5576"
    },
    {
        "label": "5575",
        "value": "5575"
    },
    {
        "label": "5573",
        "value": "5573"
    },
    {
        "label": "5572",
        "value": "5572"
    },
    {
        "label": "5571",
        "value": "5571"
    },
    {
        "label": "5570",
        "value": "5570"
    },
    {
        "label": "5560",
        "value": "5560"
    },
    {
        "label": "5558",
        "value": "5558"
    },
    {
        "label": "5556",
        "value": "5556"
    },
    {
        "label": "5555",
        "value": "5555"
    },
    {
        "label": "5554",
        "value": "5554"
    },
    {
        "label": "5552",
        "value": "5552"
    },
    {
        "label": "5550",
        "value": "5550"
    },
    {
        "label": "5540",
        "value": "5540"
    },
    {
        "label": "5523",
        "value": "5523"
    },
    {
        "label": "5522",
        "value": "5522"
    },
    {
        "label": "5521",
        "value": "5521"
    },
    {
        "label": "5520",
        "value": "5520"
    },
    {
        "label": "5510",
        "value": "5510"
    },
    {
        "label": "5502",
        "value": "5502"
    },
    {
        "label": "5501",
        "value": "5501"
    },
    {
        "label": "5495",
        "value": "5495"
    },
    {
        "label": "5493",
        "value": "5493"
    },
    {
        "label": "5491",
        "value": "5491"
    },
    {
        "label": "5490",
        "value": "5490"
    },
    {
        "label": "5485",
        "value": "5485"
    },
    {
        "label": "5483",
        "value": "5483"
    },
    {
        "label": "5482",
        "value": "5482"
    },
    {
        "label": "5481",
        "value": "5481"
    },
    {
        "label": "5480",
        "value": "5480"
    },
    {
        "label": "5473",
        "value": "5473"
    },
    {
        "label": "5472",
        "value": "5472"
    },
    {
        "label": "5471",
        "value": "5471"
    },
    {
        "label": "5470",
        "value": "5470"
    },
    {
        "label": "5464",
        "value": "5464"
    },
    {
        "label": "5462",
        "value": "5462"
    },
    {
        "label": "5461",
        "value": "5461"
    },
    {
        "label": "5460",
        "value": "5460"
    },
    {
        "label": "5455",
        "value": "5455"
    },
    {
        "label": "5454",
        "value": "5454"
    },
    {
        "label": "5453",
        "value": "5453"
    },
    {
        "label": "5452",
        "value": "5452"
    },
    {
        "label": "5451",
        "value": "5451"
    },
    {
        "label": "5440",
        "value": "5440"
    },
    {
        "label": "5434",
        "value": "5434"
    },
    {
        "label": "5433",
        "value": "5433"
    },
    {
        "label": "5432",
        "value": "5432"
    },
    {
        "label": "5431",
        "value": "5431"
    },
    {
        "label": "5422",
        "value": "5422"
    },
    {
        "label": "5421",
        "value": "5421"
    },
    {
        "label": "5420",
        "value": "5420"
    },
    {
        "label": "5419",
        "value": "5419"
    },
    {
        "label": "5418",
        "value": "5418"
    },
    {
        "label": "5417",
        "value": "5417"
    },
    {
        "label": "5416",
        "value": "5416"
    },
    {
        "label": "5415",
        "value": "5415"
    },
    {
        "label": "5414",
        "value": "5414"
    },
    {
        "label": "5413",
        "value": "5413"
    },
    {
        "label": "5412",
        "value": "5412"
    },
    {
        "label": "5411",
        "value": "5411"
    },
    {
        "label": "5410",
        "value": "5410"
    },
    {
        "label": "5401",
        "value": "5401"
    },
    {
        "label": "5400",
        "value": "5400"
    },
    {
        "label": "5381",
        "value": "5381"
    },
    {
        "label": "5374",
        "value": "5374"
    },
    {
        "label": "5373",
        "value": "5373"
    },
    {
        "label": "5372",
        "value": "5372"
    },
    {
        "label": "5371",
        "value": "5371"
    },
    {
        "label": "5360",
        "value": "5360"
    },
    {
        "label": "5357",
        "value": "5357"
    },
    {
        "label": "5356",
        "value": "5356"
    },
    {
        "label": "5355",
        "value": "5355"
    },
    {
        "label": "5354",
        "value": "5354"
    },
    {
        "label": "5353",
        "value": "5353"
    },
    {
        "label": "5352",
        "value": "5352"
    },
    {
        "label": "5351",
        "value": "5351"
    },
    {
        "label": "5350",
        "value": "5350"
    },
    {
        "label": "5346",
        "value": "5346"
    },
    {
        "label": "5345",
        "value": "5345"
    },
    {
        "label": "5344",
        "value": "5344"
    },
    {
        "label": "5343",
        "value": "5343"
    },
    {
        "label": "5342",
        "value": "5342"
    },
    {
        "label": "5341",
        "value": "5341"
    },
    {
        "label": "5340",
        "value": "5340"
    },
    {
        "label": "5333",
        "value": "5333"
    },
    {
        "label": "5332",
        "value": "5332"
    },
    {
        "label": "5331",
        "value": "5331"
    },
    {
        "label": "5330",
        "value": "5330"
    },
    {
        "label": "5322",
        "value": "5322"
    },
    {
        "label": "5321",
        "value": "5321"
    },
    {
        "label": "5320",
        "value": "5320"
    },
    {
        "label": "5311",
        "value": "5311"
    },
    {
        "label": "5310",
        "value": "5310"
    },
    {
        "label": "5309",
        "value": "5309"
    },
    {
        "label": "5308",
        "value": "5308"
    },
    {
        "label": "5307",
        "value": "5307"
    },
    {
        "label": "5306",
        "value": "5306"
    },
    {
        "label": "5304",
        "value": "5304"
    },
    {
        "label": "5303",
        "value": "5303"
    },
    {
        "label": "5302",
        "value": "5302"
    },
    {
        "label": "5301",
        "value": "5301"
    },
    {
        "label": "5291",
        "value": "5291"
    },
    {
        "label": "5290",
        "value": "5290"
    },
    {
        "label": "5280",
        "value": "5280"
    },
    {
        "label": "5279",
        "value": "5279"
    },
    {
        "label": "5278",
        "value": "5278"
    },
    {
        "label": "5277",
        "value": "5277"
    },
    {
        "label": "5276",
        "value": "5276"
    },
    {
        "label": "5275",
        "value": "5275"
    },
    {
        "label": "5273",
        "value": "5273"
    },
    {
        "label": "5272",
        "value": "5272"
    },
    {
        "label": "5271",
        "value": "5271"
    },
    {
        "label": "5270",
        "value": "5270"
    },
    {
        "label": "5269",
        "value": "5269"
    },
    {
        "label": "5268",
        "value": "5268"
    },
    {
        "label": "5267",
        "value": "5267"
    },
    {
        "label": "5266",
        "value": "5266"
    },
    {
        "label": "5265",
        "value": "5265"
    },
    {
        "label": "5264",
        "value": "5264"
    },
    {
        "label": "5263",
        "value": "5263"
    },
    {
        "label": "5262",
        "value": "5262"
    },
    {
        "label": "5261",
        "value": "5261"
    },
    {
        "label": "5260",
        "value": "5260"
    },
    {
        "label": "5259",
        "value": "5259"
    },
    {
        "label": "5256",
        "value": "5256"
    },
    {
        "label": "5255",
        "value": "5255"
    },
    {
        "label": "5254",
        "value": "5254"
    },
    {
        "label": "5253",
        "value": "5253"
    },
    {
        "label": "5252",
        "value": "5252"
    },
    {
        "label": "5251",
        "value": "5251"
    },
    {
        "label": "5250",
        "value": "5250"
    },
    {
        "label": "5245",
        "value": "5245"
    },
    {
        "label": "5244",
        "value": "5244"
    },
    {
        "label": "5243",
        "value": "5243"
    },
    {
        "label": "5242",
        "value": "5242"
    },
    {
        "label": "5241",
        "value": "5241"
    },
    {
        "label": "5240",
        "value": "5240"
    },
    {
        "label": "5238",
        "value": "5238"
    },
    {
        "label": "5237",
        "value": "5237"
    },
    {
        "label": "5236",
        "value": "5236"
    },
    {
        "label": "5235",
        "value": "5235"
    },
    {
        "label": "5234",
        "value": "5234"
    },
    {
        "label": "5233",
        "value": "5233"
    },
    {
        "label": "5232",
        "value": "5232"
    },
    {
        "label": "5231",
        "value": "5231"
    },
    {
        "label": "5223",
        "value": "5223"
    },
    {
        "label": "5222",
        "value": "5222"
    },
    {
        "label": "5221",
        "value": "5221"
    },
    {
        "label": "5220",
        "value": "5220"
    },
    {
        "label": "5214",
        "value": "5214"
    },
    {
        "label": "5213",
        "value": "5213"
    },
    {
        "label": "5212",
        "value": "5212"
    },
    {
        "label": "5211",
        "value": "5211"
    },
    {
        "label": "5210",
        "value": "5210"
    },
    {
        "label": "5204",
        "value": "5204"
    },
    {
        "label": "5203",
        "value": "5203"
    },
    {
        "label": "5202",
        "value": "5202"
    },
    {
        "label": "5201",
        "value": "5201"
    },
    {
        "label": "5174",
        "value": "5174"
    },
    {
        "label": "5173",
        "value": "5173"
    },
    {
        "label": "5172",
        "value": "5172"
    },
    {
        "label": "5171",
        "value": "5171"
    },
    {
        "label": "5170",
        "value": "5170"
    },
    {
        "label": "5169",
        "value": "5169"
    },
    {
        "label": "5168",
        "value": "5168"
    },
    {
        "label": "5167",
        "value": "5167"
    },
    {
        "label": "5166",
        "value": "5166"
    },
    {
        "label": "5165",
        "value": "5165"
    },
    {
        "label": "5164",
        "value": "5164"
    },
    {
        "label": "5163",
        "value": "5163"
    },
    {
        "label": "5162",
        "value": "5162"
    },
    {
        "label": "5161",
        "value": "5161"
    },
    {
        "label": "5160",
        "value": "5160"
    },
    {
        "label": "5159",
        "value": "5159"
    },
    {
        "label": "5158",
        "value": "5158"
    },
    {
        "label": "5157",
        "value": "5157"
    },
    {
        "label": "5156",
        "value": "5156"
    },
    {
        "label": "5155",
        "value": "5155"
    },
    {
        "label": "5154",
        "value": "5154"
    },
    {
        "label": "5153",
        "value": "5153"
    },
    {
        "label": "5152",
        "value": "5152"
    },
    {
        "label": "5151",
        "value": "5151"
    },
    {
        "label": "5150",
        "value": "5150"
    },
    {
        "label": "5144",
        "value": "5144"
    },
    {
        "label": "5142",
        "value": "5142"
    },
    {
        "label": "5141",
        "value": "5141"
    },
    {
        "label": "5140",
        "value": "5140"
    },
    {
        "label": "5139",
        "value": "5139"
    },
    {
        "label": "5138",
        "value": "5138"
    },
    {
        "label": "5137",
        "value": "5137"
    },
    {
        "label": "5136",
        "value": "5136"
    },
    {
        "label": "5134",
        "value": "5134"
    },
    {
        "label": "5133",
        "value": "5133"
    },
    {
        "label": "5132",
        "value": "5132"
    },
    {
        "label": "5131",
        "value": "5131"
    },
    {
        "label": "5127",
        "value": "5127"
    },
    {
        "label": "5126",
        "value": "5126"
    },
    {
        "label": "5125",
        "value": "5125"
    },
    {
        "label": "5121",
        "value": "5121"
    },
    {
        "label": "5120",
        "value": "5120"
    },
    {
        "label": "5118",
        "value": "5118"
    },
    {
        "label": "5117",
        "value": "5117"
    },
    {
        "label": "5116",
        "value": "5116"
    },
    {
        "label": "5115",
        "value": "5115"
    },
    {
        "label": "5114",
        "value": "5114"
    },
    {
        "label": "5113",
        "value": "5113"
    },
    {
        "label": "5112",
        "value": "5112"
    },
    {
        "label": "5111",
        "value": "5111"
    },
    {
        "label": "5110",
        "value": "5110"
    },
    {
        "label": "5109",
        "value": "5109"
    },
    {
        "label": "5108",
        "value": "5108"
    },
    {
        "label": "5107",
        "value": "5107"
    },
    {
        "label": "5106",
        "value": "5106"
    },
    {
        "label": "5098",
        "value": "5098"
    },
    {
        "label": "5097",
        "value": "5097"
    },
    {
        "label": "5096",
        "value": "5096"
    },
    {
        "label": "5095",
        "value": "5095"
    },
    {
        "label": "5094",
        "value": "5094"
    },
    {
        "label": "5093",
        "value": "5093"
    },
    {
        "label": "5092",
        "value": "5092"
    },
    {
        "label": "5091",
        "value": "5091"
    },
    {
        "label": "5090",
        "value": "5090"
    },
    {
        "label": "5089",
        "value": "5089"
    },
    {
        "label": "5088",
        "value": "5088"
    },
    {
        "label": "5087",
        "value": "5087"
    },
    {
        "label": "5086",
        "value": "5086"
    },
    {
        "label": "5085",
        "value": "5085"
    },
    {
        "label": "5084",
        "value": "5084"
    },
    {
        "label": "5083",
        "value": "5083"
    },
    {
        "label": "5082",
        "value": "5082"
    },
    {
        "label": "5081",
        "value": "5081"
    },
    {
        "label": "5076",
        "value": "5076"
    },
    {
        "label": "5075",
        "value": "5075"
    },
    {
        "label": "5074",
        "value": "5074"
    },
    {
        "label": "5073",
        "value": "5073"
    },
    {
        "label": "5072",
        "value": "5072"
    },
    {
        "label": "5070",
        "value": "5070"
    },
    {
        "label": "5069",
        "value": "5069"
    },
    {
        "label": "5068",
        "value": "5068"
    },
    {
        "label": "5067",
        "value": "5067"
    },
    {
        "label": "5066",
        "value": "5066"
    },
    {
        "label": "5065",
        "value": "5065"
    },
    {
        "label": "5064",
        "value": "5064"
    },
    {
        "label": "5063",
        "value": "5063"
    },
    {
        "label": "5062",
        "value": "5062"
    },
    {
        "label": "5061",
        "value": "5061"
    },
    {
        "label": "5052",
        "value": "5052"
    },
    {
        "label": "5051",
        "value": "5051"
    },
    {
        "label": "5050",
        "value": "5050"
    },
    {
        "label": "5049",
        "value": "5049"
    },
    {
        "label": "5048",
        "value": "5048"
    },
    {
        "label": "5047",
        "value": "5047"
    },
    {
        "label": "5046",
        "value": "5046"
    },
    {
        "label": "5045",
        "value": "5045"
    },
    {
        "label": "5044",
        "value": "5044"
    },
    {
        "label": "5043",
        "value": "5043"
    },
    {
        "label": "5042",
        "value": "5042"
    },
    {
        "label": "5041",
        "value": "5041"
    },
    {
        "label": "5040",
        "value": "5040"
    },
    {
        "label": "5039",
        "value": "5039"
    },
    {
        "label": "5038",
        "value": "5038"
    },
    {
        "label": "5037",
        "value": "5037"
    },
    {
        "label": "5035",
        "value": "5035"
    },
    {
        "label": "5034",
        "value": "5034"
    },
    {
        "label": "5033",
        "value": "5033"
    },
    {
        "label": "5032",
        "value": "5032"
    },
    {
        "label": "5031",
        "value": "5031"
    },
    {
        "label": "5025",
        "value": "5025"
    },
    {
        "label": "5024",
        "value": "5024"
    },
    {
        "label": "5023",
        "value": "5023"
    },
    {
        "label": "5022",
        "value": "5022"
    },
    {
        "label": "5021",
        "value": "5021"
    },
    {
        "label": "5020",
        "value": "5020"
    },
    {
        "label": "5019",
        "value": "5019"
    },
    {
        "label": "5018",
        "value": "5018"
    },
    {
        "label": "5017",
        "value": "5017"
    },
    {
        "label": "5016",
        "value": "5016"
    },
    {
        "label": "5015",
        "value": "5015"
    },
    {
        "label": "5014",
        "value": "5014"
    },
    {
        "label": "5013",
        "value": "5013"
    },
    {
        "label": "5012",
        "value": "5012"
    },
    {
        "label": "5011",
        "value": "5011"
    },
    {
        "label": "5010",
        "value": "5010"
    },
    {
        "label": "5009",
        "value": "5009"
    },
    {
        "label": "5008",
        "value": "5008"
    },
    {
        "label": "5007",
        "value": "5007"
    },
    {
        "label": "5006",
        "value": "5006"
    },
    {
        "label": "5005",
        "value": "5005"
    },
    {
        "label": "5000",
        "value": "5000"
    },
    {
        "label": "0872",
        "value": "0872"
    },
    {
        "label": "4895",
        "value": "4895"
    },
    {
        "label": "4891",
        "value": "4891"
    },
    {
        "label": "4890",
        "value": "4890"
    },
    {
        "label": "4888",
        "value": "4888"
    },
    {
        "label": "4887",
        "value": "4887"
    },
    {
        "label": "4886",
        "value": "4886"
    },
    {
        "label": "4885",
        "value": "4885"
    },
    {
        "label": "4884",
        "value": "4884"
    },
    {
        "label": "4883",
        "value": "4883"
    },
    {
        "label": "4882",
        "value": "4882"
    },
    {
        "label": "4881",
        "value": "4881"
    },
    {
        "label": "4880",
        "value": "4880"
    },
    {
        "label": "4879",
        "value": "4879"
    },
    {
        "label": "4878",
        "value": "4878"
    },
    {
        "label": "4877",
        "value": "4877"
    },
    {
        "label": "4876",
        "value": "4876"
    },
    {
        "label": "4875",
        "value": "4875"
    },
    {
        "label": "4874",
        "value": "4874"
    },
    {
        "label": "4873",
        "value": "4873"
    },
    {
        "label": "4872",
        "value": "4872"
    },
    {
        "label": "4871",
        "value": "4871"
    },
    {
        "label": "4870",
        "value": "4870"
    },
    {
        "label": "4869",
        "value": "4869"
    },
    {
        "label": "4868",
        "value": "4868"
    },
    {
        "label": "4865",
        "value": "4865"
    },
    {
        "label": "4861",
        "value": "4861"
    },
    {
        "label": "4860",
        "value": "4860"
    },
    {
        "label": "4859",
        "value": "4859"
    },
    {
        "label": "4858",
        "value": "4858"
    },
    {
        "label": "4857",
        "value": "4857"
    },
    {
        "label": "4856",
        "value": "4856"
    },
    {
        "label": "4855",
        "value": "4855"
    },
    {
        "label": "4854",
        "value": "4854"
    },
    {
        "label": "4852",
        "value": "4852"
    },
    {
        "label": "4850",
        "value": "4850"
    },
    {
        "label": "4849",
        "value": "4849"
    },
    {
        "label": "4830",
        "value": "4830"
    },
    {
        "label": "4829",
        "value": "4829"
    },
    {
        "label": "4828",
        "value": "4828"
    },
    {
        "label": "4825",
        "value": "4825"
    },
    {
        "label": "4824",
        "value": "4824"
    },
    {
        "label": "4823",
        "value": "4823"
    },
    {
        "label": "4822",
        "value": "4822"
    },
    {
        "label": "4821",
        "value": "4821"
    },
    {
        "label": "4820",
        "value": "4820"
    },
    {
        "label": "4819",
        "value": "4819"
    },
    {
        "label": "4818",
        "value": "4818"
    },
    {
        "label": "4817",
        "value": "4817"
    },
    {
        "label": "4816",
        "value": "4816"
    },
    {
        "label": "4815",
        "value": "4815"
    },
    {
        "label": "4814",
        "value": "4814"
    },
    {
        "label": "4813",
        "value": "4813"
    },
    {
        "label": "4812",
        "value": "4812"
    },
    {
        "label": "4811",
        "value": "4811"
    },
    {
        "label": "4810",
        "value": "4810"
    },
    {
        "label": "4809",
        "value": "4809"
    },
    {
        "label": "4808",
        "value": "4808"
    },
    {
        "label": "4807",
        "value": "4807"
    },
    {
        "label": "4806",
        "value": "4806"
    },
    {
        "label": "4805",
        "value": "4805"
    },
    {
        "label": "4804",
        "value": "4804"
    },
    {
        "label": "4803",
        "value": "4803"
    },
    {
        "label": "4802",
        "value": "4802"
    },
    {
        "label": "4801",
        "value": "4801"
    },
    {
        "label": "4800",
        "value": "4800"
    },
    {
        "label": "4799",
        "value": "4799"
    },
    {
        "label": "4798",
        "value": "4798"
    },
    {
        "label": "4757",
        "value": "4757"
    },
    {
        "label": "4756",
        "value": "4756"
    },
    {
        "label": "4754",
        "value": "4754"
    },
    {
        "label": "4753",
        "value": "4753"
    },
    {
        "label": "4751",
        "value": "4751"
    },
    {
        "label": "4750",
        "value": "4750"
    },
    {
        "label": "4746",
        "value": "4746"
    },
    {
        "label": "4745",
        "value": "4745"
    },
    {
        "label": "4744",
        "value": "4744"
    },
    {
        "label": "4743",
        "value": "4743"
    },
    {
        "label": "4742",
        "value": "4742"
    },
    {
        "label": "4741",
        "value": "4741"
    },
    {
        "label": "4740",
        "value": "4740"
    },
    {
        "label": "4739",
        "value": "4739"
    },
    {
        "label": "4738",
        "value": "4738"
    },
    {
        "label": "4737",
        "value": "4737"
    },
    {
        "label": "4736",
        "value": "4736"
    },
    {
        "label": "4735",
        "value": "4735"
    },
    {
        "label": "4733",
        "value": "4733"
    },
    {
        "label": "4732",
        "value": "4732"
    },
    {
        "label": "4731",
        "value": "4731"
    },
    {
        "label": "4730",
        "value": "4730"
    },
    {
        "label": "4728",
        "value": "4728"
    },
    {
        "label": "4727",
        "value": "4727"
    },
    {
        "label": "4726",
        "value": "4726"
    },
    {
        "label": "4725",
        "value": "4725"
    },
    {
        "label": "4724",
        "value": "4724"
    },
    {
        "label": "4723",
        "value": "4723"
    },
    {
        "label": "4722",
        "value": "4722"
    },
    {
        "label": "4721",
        "value": "4721"
    },
    {
        "label": "4720",
        "value": "4720"
    },
    {
        "label": "4719",
        "value": "4719"
    },
    {
        "label": "4718",
        "value": "4718"
    },
    {
        "label": "4717",
        "value": "4717"
    },
    {
        "label": "4716",
        "value": "4716"
    },
    {
        "label": "4715",
        "value": "4715"
    },
    {
        "label": "4714",
        "value": "4714"
    },
    {
        "label": "4713",
        "value": "4713"
    },
    {
        "label": "4712",
        "value": "4712"
    },
    {
        "label": "4711",
        "value": "4711"
    },
    {
        "label": "4710",
        "value": "4710"
    },
    {
        "label": "4709",
        "value": "4709"
    },
    {
        "label": "4707",
        "value": "4707"
    },
    {
        "label": "4706",
        "value": "4706"
    },
    {
        "label": "4705",
        "value": "4705"
    },
    {
        "label": "4704",
        "value": "4704"
    },
    {
        "label": "4703",
        "value": "4703"
    },
    {
        "label": "4702",
        "value": "4702"
    },
    {
        "label": "4701",
        "value": "4701"
    },
    {
        "label": "4700",
        "value": "4700"
    },
    {
        "label": "4699",
        "value": "4699"
    },
    {
        "label": "4697",
        "value": "4697"
    },
    {
        "label": "4695",
        "value": "4695"
    },
    {
        "label": "4694",
        "value": "4694"
    },
    {
        "label": "4680",
        "value": "4680"
    },
    {
        "label": "4678",
        "value": "4678"
    },
    {
        "label": "4677",
        "value": "4677"
    },
    {
        "label": "4676",
        "value": "4676"
    },
    {
        "label": "4674",
        "value": "4674"
    },
    {
        "label": "4673",
        "value": "4673"
    },
    {
        "label": "4671",
        "value": "4671"
    },
    {
        "label": "4670",
        "value": "4670"
    },
    {
        "label": "4662",
        "value": "4662"
    },
    {
        "label": "4660",
        "value": "4660"
    },
    {
        "label": "4659",
        "value": "4659"
    },
    {
        "label": "4655",
        "value": "4655"
    },
    {
        "label": "4650",
        "value": "4650"
    },
    {
        "label": "4630",
        "value": "4630"
    },
    {
        "label": "4627",
        "value": "4627"
    },
    {
        "label": "4626",
        "value": "4626"
    },
    {
        "label": "4625",
        "value": "4625"
    },
    {
        "label": "4621",
        "value": "4621"
    },
    {
        "label": "4620",
        "value": "4620"
    },
    {
        "label": "4615",
        "value": "4615"
    },
    {
        "label": "4614",
        "value": "4614"
    },
    {
        "label": "4613",
        "value": "4613"
    },
    {
        "label": "4612",
        "value": "4612"
    },
    {
        "label": "4611",
        "value": "4611"
    },
    {
        "label": "4610",
        "value": "4610"
    },
    {
        "label": "4608",
        "value": "4608"
    },
    {
        "label": "4606",
        "value": "4606"
    },
    {
        "label": "4605",
        "value": "4605"
    },
    {
        "label": "4601",
        "value": "4601"
    },
    {
        "label": "4600",
        "value": "4600"
    },
    {
        "label": "4581",
        "value": "4581"
    },
    {
        "label": "4580",
        "value": "4580"
    },
    {
        "label": "4575",
        "value": "4575"
    },
    {
        "label": "4574",
        "value": "4574"
    },
    {
        "label": "4573",
        "value": "4573"
    },
    {
        "label": "4572",
        "value": "4572"
    },
    {
        "label": "4571",
        "value": "4571"
    },
    {
        "label": "4570",
        "value": "4570"
    },
    {
        "label": "4569",
        "value": "4569"
    },
    {
        "label": "4568",
        "value": "4568"
    },
    {
        "label": "4567",
        "value": "4567"
    },
    {
        "label": "4566",
        "value": "4566"
    },
    {
        "label": "4565",
        "value": "4565"
    },
    {
        "label": "4564",
        "value": "4564"
    },
    {
        "label": "4563",
        "value": "4563"
    },
    {
        "label": "4562",
        "value": "4562"
    },
    {
        "label": "4561",
        "value": "4561"
    },
    {
        "label": "4560",
        "value": "4560"
    },
    {
        "label": "4559",
        "value": "4559"
    },
    {
        "label": "4558",
        "value": "4558"
    },
    {
        "label": "4557",
        "value": "4557"
    },
    {
        "label": "4556",
        "value": "4556"
    },
    {
        "label": "4555",
        "value": "4555"
    },
    {
        "label": "4554",
        "value": "4554"
    },
    {
        "label": "4553",
        "value": "4553"
    },
    {
        "label": "4552",
        "value": "4552"
    },
    {
        "label": "4551",
        "value": "4551"
    },
    {
        "label": "4550",
        "value": "4550"
    },
    {
        "label": "4521",
        "value": "4521"
    },
    {
        "label": "4520",
        "value": "4520"
    },
    {
        "label": "4519",
        "value": "4519"
    },
    {
        "label": "4518",
        "value": "4518"
    },
    {
        "label": "4517",
        "value": "4517"
    },
    {
        "label": "4516",
        "value": "4516"
    },
    {
        "label": "4515",
        "value": "4515"
    },
    {
        "label": "4514",
        "value": "4514"
    },
    {
        "label": "4512",
        "value": "4512"
    },
    {
        "label": "4511",
        "value": "4511"
    },
    {
        "label": "4510",
        "value": "4510"
    },
    {
        "label": "4509",
        "value": "4509"
    },
    {
        "label": "4508",
        "value": "4508"
    },
    {
        "label": "4507",
        "value": "4507"
    },
    {
        "label": "4506",
        "value": "4506"
    },
    {
        "label": "4505",
        "value": "4505"
    },
    {
        "label": "4504",
        "value": "4504"
    },
    {
        "label": "4503",
        "value": "4503"
    },
    {
        "label": "4502",
        "value": "4502"
    },
    {
        "label": "4501",
        "value": "4501"
    },
    {
        "label": "4500",
        "value": "4500"
    },
    {
        "label": "4498",
        "value": "4498"
    },
    {
        "label": "4497",
        "value": "4497"
    },
    {
        "label": "4496",
        "value": "4496"
    },
    {
        "label": "4494",
        "value": "4494"
    },
    {
        "label": "4492",
        "value": "4492"
    },
    {
        "label": "4491",
        "value": "4491"
    },
    {
        "label": "4490",
        "value": "4490"
    },
    {
        "label": "4489",
        "value": "4489"
    },
    {
        "label": "4488",
        "value": "4488"
    },
    {
        "label": "4487",
        "value": "4487"
    },
    {
        "label": "4486",
        "value": "4486"
    },
    {
        "label": "4482",
        "value": "4482"
    },
    {
        "label": "4481",
        "value": "4481"
    },
    {
        "label": "4480",
        "value": "4480"
    },
    {
        "label": "4479",
        "value": "4479"
    },
    {
        "label": "4478",
        "value": "4478"
    },
    {
        "label": "4477",
        "value": "4477"
    },
    {
        "label": "4475",
        "value": "4475"
    },
    {
        "label": "4474",
        "value": "4474"
    },
    {
        "label": "4472",
        "value": "4472"
    },
    {
        "label": "4471",
        "value": "4471"
    },
    {
        "label": "4470",
        "value": "4470"
    },
    {
        "label": "4468",
        "value": "4468"
    },
    {
        "label": "4467",
        "value": "4467"
    },
    {
        "label": "4465",
        "value": "4465"
    },
    {
        "label": "4462",
        "value": "4462"
    },
    {
        "label": "4461",
        "value": "4461"
    },
    {
        "label": "4455",
        "value": "4455"
    },
    {
        "label": "4454",
        "value": "4454"
    },
    {
        "label": "4428",
        "value": "4428"
    },
    {
        "label": "4427",
        "value": "4427"
    },
    {
        "label": "4426",
        "value": "4426"
    },
    {
        "label": "4425",
        "value": "4425"
    },
    {
        "label": "4424",
        "value": "4424"
    },
    {
        "label": "4423",
        "value": "4423"
    },
    {
        "label": "4422",
        "value": "4422"
    },
    {
        "label": "4421",
        "value": "4421"
    },
    {
        "label": "4420",
        "value": "4420"
    },
    {
        "label": "4419",
        "value": "4419"
    },
    {
        "label": "4418",
        "value": "4418"
    },
    {
        "label": "4417",
        "value": "4417"
    },
    {
        "label": "4416",
        "value": "4416"
    },
    {
        "label": "4415",
        "value": "4415"
    },
    {
        "label": "4413",
        "value": "4413"
    },
    {
        "label": "4412",
        "value": "4412"
    },
    {
        "label": "4411",
        "value": "4411"
    },
    {
        "label": "4410",
        "value": "4410"
    },
    {
        "label": "4408",
        "value": "4408"
    },
    {
        "label": "4407",
        "value": "4407"
    },
    {
        "label": "4406",
        "value": "4406"
    },
    {
        "label": "4405",
        "value": "4405"
    },
    {
        "label": "4404",
        "value": "4404"
    },
    {
        "label": "4403",
        "value": "4403"
    },
    {
        "label": "4402",
        "value": "4402"
    },
    {
        "label": "4401",
        "value": "4401"
    },
    {
        "label": "4400",
        "value": "4400"
    },
    {
        "label": "4390",
        "value": "4390"
    },
    {
        "label": "4388",
        "value": "4388"
    },
    {
        "label": "4387",
        "value": "4387"
    },
    {
        "label": "4384",
        "value": "4384"
    },
    {
        "label": "4382",
        "value": "4382"
    },
    {
        "label": "4381",
        "value": "4381"
    },
    {
        "label": "4380",
        "value": "4380"
    },
    {
        "label": "4378",
        "value": "4378"
    },
    {
        "label": "4377",
        "value": "4377"
    },
    {
        "label": "4376",
        "value": "4376"
    },
    {
        "label": "4375",
        "value": "4375"
    },
    {
        "label": "4374",
        "value": "4374"
    },
    {
        "label": "4373",
        "value": "4373"
    },
    {
        "label": "4372",
        "value": "4372"
    },
    {
        "label": "4371",
        "value": "4371"
    },
    {
        "label": "4370",
        "value": "4370"
    },
    {
        "label": "4365",
        "value": "4365"
    },
    {
        "label": "4364",
        "value": "4364"
    },
    {
        "label": "4363",
        "value": "4363"
    },
    {
        "label": "4362",
        "value": "4362"
    },
    {
        "label": "4361",
        "value": "4361"
    },
    {
        "label": "4360",
        "value": "4360"
    },
    {
        "label": "4359",
        "value": "4359"
    },
    {
        "label": "4358",
        "value": "4358"
    },
    {
        "label": "4357",
        "value": "4357"
    },
    {
        "label": "4356",
        "value": "4356"
    },
    {
        "label": "4355",
        "value": "4355"
    },
    {
        "label": "4354",
        "value": "4354"
    },
    {
        "label": "4353",
        "value": "4353"
    },
    {
        "label": "4352",
        "value": "4352"
    },
    {
        "label": "4350",
        "value": "4350"
    },
    {
        "label": "4347",
        "value": "4347"
    },
    {
        "label": "4346",
        "value": "4346"
    },
    {
        "label": "4345",
        "value": "4345"
    },
    {
        "label": "4344",
        "value": "4344"
    },
    {
        "label": "4343",
        "value": "4343"
    },
    {
        "label": "4342",
        "value": "4342"
    },
    {
        "label": "4341",
        "value": "4341"
    },
    {
        "label": "4340",
        "value": "4340"
    },
    {
        "label": "4313",
        "value": "4313"
    },
    {
        "label": "4312",
        "value": "4312"
    },
    {
        "label": "4311",
        "value": "4311"
    },
    {
        "label": "4310",
        "value": "4310"
    },
    {
        "label": "4309",
        "value": "4309"
    },
    {
        "label": "4307",
        "value": "4307"
    },
    {
        "label": "4306",
        "value": "4306"
    },
    {
        "label": "4305",
        "value": "4305"
    },
    {
        "label": "4304",
        "value": "4304"
    },
    {
        "label": "4303",
        "value": "4303"
    },
    {
        "label": "4301",
        "value": "4301"
    },
    {
        "label": "4300",
        "value": "4300"
    },
    {
        "label": "4287",
        "value": "4287"
    },
    {
        "label": "4285",
        "value": "4285"
    },
    {
        "label": "4280",
        "value": "4280"
    },
    {
        "label": "4275",
        "value": "4275"
    },
    {
        "label": "4272",
        "value": "4272"
    },
    {
        "label": "4271",
        "value": "4271"
    },
    {
        "label": "4270",
        "value": "4270"
    },
    {
        "label": "4230",
        "value": "4230"
    },
    {
        "label": "4229",
        "value": "4229"
    },
    {
        "label": "4228",
        "value": "4228"
    },
    {
        "label": "4227",
        "value": "4227"
    },
    {
        "label": "4226",
        "value": "4226"
    },
    {
        "label": "4225",
        "value": "4225"
    },
    {
        "label": "4224",
        "value": "4224"
    },
    {
        "label": "4223",
        "value": "4223"
    },
    {
        "label": "4221",
        "value": "4221"
    },
    {
        "label": "4220",
        "value": "4220"
    },
    {
        "label": "4219",
        "value": "4219"
    },
    {
        "label": "4218",
        "value": "4218"
    },
    {
        "label": "4217",
        "value": "4217"
    },
    {
        "label": "4216",
        "value": "4216"
    },
    {
        "label": "4215",
        "value": "4215"
    },
    {
        "label": "4214",
        "value": "4214"
    },
    {
        "label": "4213",
        "value": "4213"
    },
    {
        "label": "4212",
        "value": "4212"
    },
    {
        "label": "4211",
        "value": "4211"
    },
    {
        "label": "4210",
        "value": "4210"
    },
    {
        "label": "4209",
        "value": "4209"
    },
    {
        "label": "4208",
        "value": "4208"
    },
    {
        "label": "4207",
        "value": "4207"
    },
    {
        "label": "4205",
        "value": "4205"
    },
    {
        "label": "4184",
        "value": "4184"
    },
    {
        "label": "4183",
        "value": "4183"
    },
    {
        "label": "4179",
        "value": "4179"
    },
    {
        "label": "4178",
        "value": "4178"
    },
    {
        "label": "4174",
        "value": "4174"
    },
    {
        "label": "4173",
        "value": "4173"
    },
    {
        "label": "4172",
        "value": "4172"
    },
    {
        "label": "4171",
        "value": "4171"
    },
    {
        "label": "4170",
        "value": "4170"
    },
    {
        "label": "4169",
        "value": "4169"
    },
    {
        "label": "4165",
        "value": "4165"
    },
    {
        "label": "4164",
        "value": "4164"
    },
    {
        "label": "4163",
        "value": "4163"
    },
    {
        "label": "4161",
        "value": "4161"
    },
    {
        "label": "4160",
        "value": "4160"
    },
    {
        "label": "4159",
        "value": "4159"
    },
    {
        "label": "4158",
        "value": "4158"
    },
    {
        "label": "4157",
        "value": "4157"
    },
    {
        "label": "4156",
        "value": "4156"
    },
    {
        "label": "4155",
        "value": "4155"
    },
    {
        "label": "4154",
        "value": "4154"
    },
    {
        "label": "4153",
        "value": "4153"
    },
    {
        "label": "4152",
        "value": "4152"
    },
    {
        "label": "4151",
        "value": "4151"
    },
    {
        "label": "4133",
        "value": "4133"
    },
    {
        "label": "4132",
        "value": "4132"
    },
    {
        "label": "4131",
        "value": "4131"
    },
    {
        "label": "4130",
        "value": "4130"
    },
    {
        "label": "4129",
        "value": "4129"
    },
    {
        "label": "4128",
        "value": "4128"
    },
    {
        "label": "4127",
        "value": "4127"
    },
    {
        "label": "4125",
        "value": "4125"
    },
    {
        "label": "4124",
        "value": "4124"
    },
    {
        "label": "4123",
        "value": "4123"
    },
    {
        "label": "4122",
        "value": "4122"
    },
    {
        "label": "4121",
        "value": "4121"
    },
    {
        "label": "4120",
        "value": "4120"
    },
    {
        "label": "4119",
        "value": "4119"
    },
    {
        "label": "4118",
        "value": "4118"
    },
    {
        "label": "4117",
        "value": "4117"
    },
    {
        "label": "4116",
        "value": "4116"
    },
    {
        "label": "4115",
        "value": "4115"
    },
    {
        "label": "4114",
        "value": "4114"
    },
    {
        "label": "4113",
        "value": "4113"
    },
    {
        "label": "4112",
        "value": "4112"
    },
    {
        "label": "4111",
        "value": "4111"
    },
    {
        "label": "4110",
        "value": "4110"
    },
    {
        "label": "4109",
        "value": "4109"
    },
    {
        "label": "4108",
        "value": "4108"
    },
    {
        "label": "4107",
        "value": "4107"
    },
    {
        "label": "4106",
        "value": "4106"
    },
    {
        "label": "4105",
        "value": "4105"
    },
    {
        "label": "4104",
        "value": "4104"
    },
    {
        "label": "4103",
        "value": "4103"
    },
    {
        "label": "4102",
        "value": "4102"
    },
    {
        "label": "4101",
        "value": "4101"
    },
    {
        "label": "4078",
        "value": "4078"
    },
    {
        "label": "4077",
        "value": "4077"
    },
    {
        "label": "4076",
        "value": "4076"
    },
    {
        "label": "4075",
        "value": "4075"
    },
    {
        "label": "4074",
        "value": "4074"
    },
    {
        "label": "4073",
        "value": "4073"
    },
    {
        "label": "4072",
        "value": "4072"
    },
    {
        "label": "4070",
        "value": "4070"
    },
    {
        "label": "4069",
        "value": "4069"
    },
    {
        "label": "4068",
        "value": "4068"
    },
    {
        "label": "4067",
        "value": "4067"
    },
    {
        "label": "4066",
        "value": "4066"
    },
    {
        "label": "4065",
        "value": "4065"
    },
    {
        "label": "4064",
        "value": "4064"
    },
    {
        "label": "4061",
        "value": "4061"
    },
    {
        "label": "4060",
        "value": "4060"
    },
    {
        "label": "4059",
        "value": "4059"
    },
    {
        "label": "4055",
        "value": "4055"
    },
    {
        "label": "4054",
        "value": "4054"
    },
    {
        "label": "4053",
        "value": "4053"
    },
    {
        "label": "4051",
        "value": "4051"
    },
    {
        "label": "4037",
        "value": "4037"
    },
    {
        "label": "4036",
        "value": "4036"
    },
    {
        "label": "4035",
        "value": "4035"
    },
    {
        "label": "4034",
        "value": "4034"
    },
    {
        "label": "4032",
        "value": "4032"
    },
    {
        "label": "4031",
        "value": "4031"
    },
    {
        "label": "4030",
        "value": "4030"
    },
    {
        "label": "4029",
        "value": "4029"
    },
    {
        "label": "4025",
        "value": "4025"
    },
    {
        "label": "4022",
        "value": "4022"
    },
    {
        "label": "4021",
        "value": "4021"
    },
    {
        "label": "4020",
        "value": "4020"
    },
    {
        "label": "4019",
        "value": "4019"
    },
    {
        "label": "4018",
        "value": "4018"
    },
    {
        "label": "4017",
        "value": "4017"
    },
    {
        "label": "4014",
        "value": "4014"
    },
    {
        "label": "4013",
        "value": "4013"
    },
    {
        "label": "4012",
        "value": "4012"
    },
    {
        "label": "4011",
        "value": "4011"
    },
    {
        "label": "4010",
        "value": "4010"
    },
    {
        "label": "4009",
        "value": "4009"
    },
    {
        "label": "4008",
        "value": "4008"
    },
    {
        "label": "4007",
        "value": "4007"
    },
    {
        "label": "4006",
        "value": "4006"
    },
    {
        "label": "4005",
        "value": "4005"
    },
    {
        "label": "4000",
        "value": "4000"
    },
    {
        "label": "0909",
        "value": "0909"
    },
    {
        "label": "0886",
        "value": "0886"
    },
    {
        "label": "0885",
        "value": "0885"
    },
    {
        "label": "0880",
        "value": "0880"
    },
    {
        "label": "0870",
        "value": "0870"
    },
    {
        "label": "0862",
        "value": "0862"
    },
    {
        "label": "0860",
        "value": "0860"
    },
    {
        "label": "0854",
        "value": "0854"
    },
    {
        "label": "0853",
        "value": "0853"
    },
    {
        "label": "0850",
        "value": "0850"
    },
    {
        "label": "0847",
        "value": "0847"
    },
    {
        "label": "0846",
        "value": "0846"
    },
    {
        "label": "0845",
        "value": "0845"
    },
    {
        "label": "0841",
        "value": "0841"
    },
    {
        "label": "0840",
        "value": "0840"
    },
    {
        "label": "0838",
        "value": "0838"
    },
    {
        "label": "0837",
        "value": "0837"
    },
    {
        "label": "0836",
        "value": "0836"
    },
    {
        "label": "0835",
        "value": "0835"
    },
    {
        "label": "0832",
        "value": "0832"
    },
    {
        "label": "0830",
        "value": "0830"
    },
    {
        "label": "0829",
        "value": "0829"
    },
    {
        "label": "0828",
        "value": "0828"
    },
    {
        "label": "0822",
        "value": "0822"
    },
    {
        "label": "0820",
        "value": "0820"
    },
    {
        "label": "0812",
        "value": "0812"
    },
    {
        "label": "0810",
        "value": "0810"
    },
    {
        "label": "0800",
        "value": "0800"
    },
    {
        "label": "4493",
        "value": "4493"
    },
    {
        "label": "4385",
        "value": "4385"
    },
    {
        "label": "4383",
        "value": "4383"
    },
    {
        "label": "3709",
        "value": "3709"
    },
    {
        "label": "3707",
        "value": "3707"
    },
    {
        "label": "3694",
        "value": "3694"
    },
    {
        "label": "3691",
        "value": "3691"
    },
    {
        "label": "3644",
        "value": "3644"
    },
    {
        "label": "3639",
        "value": "3639"
    },
    {
        "label": "3586",
        "value": "3586"
    },
    {
        "label": "3585",
        "value": "3585"
    },
    {
        "label": "3579",
        "value": "3579"
    },
    {
        "label": "3564",
        "value": "3564"
    },
    {
        "label": "3549",
        "value": "3549"
    },
    {
        "label": "3505",
        "value": "3505"
    },
    {
        "label": "3501",
        "value": "3501"
    },
    {
        "label": "3498",
        "value": "3498"
    },
    {
        "label": "3494",
        "value": "3494"
    },
    {
        "label": "3490",
        "value": "3490"
    },
    {
        "label": "2900",
        "value": "2900"
    },
    {
        "label": "2898",
        "value": "2898"
    },
    {
        "label": "2880",
        "value": "2880"
    },
    {
        "label": "2879",
        "value": "2879"
    },
    {
        "label": "2878",
        "value": "2878"
    },
    {
        "label": "2877",
        "value": "2877"
    },
    {
        "label": "2876",
        "value": "2876"
    },
    {
        "label": "2875",
        "value": "2875"
    },
    {
        "label": "2874",
        "value": "2874"
    },
    {
        "label": "2873",
        "value": "2873"
    },
    {
        "label": "2871",
        "value": "2871"
    },
    {
        "label": "2870",
        "value": "2870"
    },
    {
        "label": "2869",
        "value": "2869"
    },
    {
        "label": "2868",
        "value": "2868"
    },
    {
        "label": "2867",
        "value": "2867"
    },
    {
        "label": "2866",
        "value": "2866"
    },
    {
        "label": "2865",
        "value": "2865"
    },
    {
        "label": "2864",
        "value": "2864"
    },
    {
        "label": "2852",
        "value": "2852"
    },
    {
        "label": "2850",
        "value": "2850"
    },
    {
        "label": "2849",
        "value": "2849"
    },
    {
        "label": "2848",
        "value": "2848"
    },
    {
        "label": "2847",
        "value": "2847"
    },
    {
        "label": "2846",
        "value": "2846"
    },
    {
        "label": "2845",
        "value": "2845"
    },
    {
        "label": "2844",
        "value": "2844"
    },
    {
        "label": "2843",
        "value": "2843"
    },
    {
        "label": "2842",
        "value": "2842"
    },
    {
        "label": "2840",
        "value": "2840"
    },
    {
        "label": "2839",
        "value": "2839"
    },
    {
        "label": "2836",
        "value": "2836"
    },
    {
        "label": "2835",
        "value": "2835"
    },
    {
        "label": "2834",
        "value": "2834"
    },
    {
        "label": "2833",
        "value": "2833"
    },
    {
        "label": "2832",
        "value": "2832"
    },
    {
        "label": "2831",
        "value": "2831"
    },
    {
        "label": "2830",
        "value": "2830"
    },
    {
        "label": "2829",
        "value": "2829"
    },
    {
        "label": "2828",
        "value": "2828"
    },
    {
        "label": "2827",
        "value": "2827"
    },
    {
        "label": "2825",
        "value": "2825"
    },
    {
        "label": "2824",
        "value": "2824"
    },
    {
        "label": "2823",
        "value": "2823"
    },
    {
        "label": "2821",
        "value": "2821"
    },
    {
        "label": "2820",
        "value": "2820"
    },
    {
        "label": "2810",
        "value": "2810"
    },
    {
        "label": "2809",
        "value": "2809"
    },
    {
        "label": "2808",
        "value": "2808"
    },
    {
        "label": "2807",
        "value": "2807"
    },
    {
        "label": "2806",
        "value": "2806"
    },
    {
        "label": "2805",
        "value": "2805"
    },
    {
        "label": "2804",
        "value": "2804"
    },
    {
        "label": "2803",
        "value": "2803"
    },
    {
        "label": "2800",
        "value": "2800"
    },
    {
        "label": "2799",
        "value": "2799"
    },
    {
        "label": "2798",
        "value": "2798"
    },
    {
        "label": "2797",
        "value": "2797"
    },
    {
        "label": "2795",
        "value": "2795"
    },
    {
        "label": "2794",
        "value": "2794"
    },
    {
        "label": "2793",
        "value": "2793"
    },
    {
        "label": "2792",
        "value": "2792"
    },
    {
        "label": "2791",
        "value": "2791"
    },
    {
        "label": "2790",
        "value": "2790"
    },
    {
        "label": "2787",
        "value": "2787"
    },
    {
        "label": "2786",
        "value": "2786"
    },
    {
        "label": "2785",
        "value": "2785"
    },
    {
        "label": "2784",
        "value": "2784"
    },
    {
        "label": "2783",
        "value": "2783"
    },
    {
        "label": "2782",
        "value": "2782"
    },
    {
        "label": "2780",
        "value": "2780"
    },
    {
        "label": "2779",
        "value": "2779"
    },
    {
        "label": "2778",
        "value": "2778"
    },
    {
        "label": "2777",
        "value": "2777"
    },
    {
        "label": "2776",
        "value": "2776"
    },
    {
        "label": "2775",
        "value": "2775"
    },
    {
        "label": "2774",
        "value": "2774"
    },
    {
        "label": "2773",
        "value": "2773"
    },
    {
        "label": "2770",
        "value": "2770"
    },
    {
        "label": "2769",
        "value": "2769"
    },
    {
        "label": "2768",
        "value": "2768"
    },
    {
        "label": "2767",
        "value": "2767"
    },
    {
        "label": "2766",
        "value": "2766"
    },
    {
        "label": "2765",
        "value": "2765"
    },
    {
        "label": "2763",
        "value": "2763"
    },
    {
        "label": "2762",
        "value": "2762"
    },
    {
        "label": "2761",
        "value": "2761"
    },
    {
        "label": "2760",
        "value": "2760"
    },
    {
        "label": "2759",
        "value": "2759"
    },
    {
        "label": "2758",
        "value": "2758"
    },
    {
        "label": "2757",
        "value": "2757"
    },
    {
        "label": "2756",
        "value": "2756"
    },
    {
        "label": "2755",
        "value": "2755"
    },
    {
        "label": "2754",
        "value": "2754"
    },
    {
        "label": "2753",
        "value": "2753"
    },
    {
        "label": "2752",
        "value": "2752"
    },
    {
        "label": "2750",
        "value": "2750"
    },
    {
        "label": "2749",
        "value": "2749"
    },
    {
        "label": "2748",
        "value": "2748"
    },
    {
        "label": "2747",
        "value": "2747"
    },
    {
        "label": "2745",
        "value": "2745"
    },
    {
        "label": "2739",
        "value": "2739"
    },
    {
        "label": "2738",
        "value": "2738"
    },
    {
        "label": "2737",
        "value": "2737"
    },
    {
        "label": "2736",
        "value": "2736"
    },
    {
        "label": "2735",
        "value": "2735"
    },
    {
        "label": "2734",
        "value": "2734"
    },
    {
        "label": "2733",
        "value": "2733"
    },
    {
        "label": "2732",
        "value": "2732"
    },
    {
        "label": "2731",
        "value": "2731"
    },
    {
        "label": "2730",
        "value": "2730"
    },
    {
        "label": "2729",
        "value": "2729"
    },
    {
        "label": "2727",
        "value": "2727"
    },
    {
        "label": "2726",
        "value": "2726"
    },
    {
        "label": "2725",
        "value": "2725"
    },
    {
        "label": "2722",
        "value": "2722"
    },
    {
        "label": "2721",
        "value": "2721"
    },
    {
        "label": "2720",
        "value": "2720"
    },
    {
        "label": "2717",
        "value": "2717"
    },
    {
        "label": "2716",
        "value": "2716"
    },
    {
        "label": "2715",
        "value": "2715"
    },
    {
        "label": "2714",
        "value": "2714"
    },
    {
        "label": "2713",
        "value": "2713"
    },
    {
        "label": "2712",
        "value": "2712"
    },
    {
        "label": "2711",
        "value": "2711"
    },
    {
        "label": "2710",
        "value": "2710"
    },
    {
        "label": "2707",
        "value": "2707"
    },
    {
        "label": "2706",
        "value": "2706"
    },
    {
        "label": "2705",
        "value": "2705"
    },
    {
        "label": "2703",
        "value": "2703"
    },
    {
        "label": "2702",
        "value": "2702"
    },
    {
        "label": "2701",
        "value": "2701"
    },
    {
        "label": "2700",
        "value": "2700"
    },
    {
        "label": "2681",
        "value": "2681"
    },
    {
        "label": "2680",
        "value": "2680"
    },
    {
        "label": "2678",
        "value": "2678"
    },
    {
        "label": "2675",
        "value": "2675"
    },
    {
        "label": "2672",
        "value": "2672"
    },
    {
        "label": "2671",
        "value": "2671"
    },
    {
        "label": "2669",
        "value": "2669"
    },
    {
        "label": "2668",
        "value": "2668"
    },
    {
        "label": "2666",
        "value": "2666"
    },
    {
        "label": "2665",
        "value": "2665"
    },
    {
        "label": "2663",
        "value": "2663"
    },
    {
        "label": "2661",
        "value": "2661"
    },
    {
        "label": "2660",
        "value": "2660"
    },
    {
        "label": "2659",
        "value": "2659"
    },
    {
        "label": "2658",
        "value": "2658"
    },
    {
        "label": "2656",
        "value": "2656"
    },
    {
        "label": "2655",
        "value": "2655"
    },
    {
        "label": "2653",
        "value": "2653"
    },
    {
        "label": "2652",
        "value": "2652"
    },
    {
        "label": "2651",
        "value": "2651"
    },
    {
        "label": "2650",
        "value": "2650"
    },
    {
        "label": "2649",
        "value": "2649"
    },
    {
        "label": "2648",
        "value": "2648"
    },
    {
        "label": "2647",
        "value": "2647"
    },
    {
        "label": "2646",
        "value": "2646"
    },
    {
        "label": "2645",
        "value": "2645"
    },
    {
        "label": "2644",
        "value": "2644"
    },
    {
        "label": "2643",
        "value": "2643"
    },
    {
        "label": "2642",
        "value": "2642"
    },
    {
        "label": "2641",
        "value": "2641"
    },
    {
        "label": "2640",
        "value": "2640"
    },
    {
        "label": "2633",
        "value": "2633"
    },
    {
        "label": "2632",
        "value": "2632"
    },
    {
        "label": "2631",
        "value": "2631"
    },
    {
        "label": "2630",
        "value": "2630"
    },
    {
        "label": "2629",
        "value": "2629"
    },
    {
        "label": "2628",
        "value": "2628"
    },
    {
        "label": "2627",
        "value": "2627"
    },
    {
        "label": "2626",
        "value": "2626"
    },
    {
        "label": "2625",
        "value": "2625"
    },
    {
        "label": "2624",
        "value": "2624"
    },
    {
        "label": "2623",
        "value": "2623"
    },
    {
        "label": "2622",
        "value": "2622"
    },
    {
        "label": "2621",
        "value": "2621"
    },
    {
        "label": "2620",
        "value": "2620"
    },
    {
        "label": "2619",
        "value": "2619"
    },
    {
        "label": "2618",
        "value": "2618"
    },
    {
        "label": "2611",
        "value": "2611"
    },
    {
        "label": "2594",
        "value": "2594"
    },
    {
        "label": "2590",
        "value": "2590"
    },
    {
        "label": "2588",
        "value": "2588"
    },
    {
        "label": "2587",
        "value": "2587"
    },
    {
        "label": "2586",
        "value": "2586"
    },
    {
        "label": "2585",
        "value": "2585"
    },
    {
        "label": "2584",
        "value": "2584"
    },
    {
        "label": "2583",
        "value": "2583"
    },
    {
        "label": "2582",
        "value": "2582"
    },
    {
        "label": "2581",
        "value": "2581"
    },
    {
        "label": "2580",
        "value": "2580"
    },
    {
        "label": "2579",
        "value": "2579"
    },
    {
        "label": "2578",
        "value": "2578"
    },
    {
        "label": "2577",
        "value": "2577"
    },
    {
        "label": "2576",
        "value": "2576"
    },
    {
        "label": "2575",
        "value": "2575"
    },
    {
        "label": "2574",
        "value": "2574"
    },
    {
        "label": "2573",
        "value": "2573"
    },
    {
        "label": "2572",
        "value": "2572"
    },
    {
        "label": "2571",
        "value": "2571"
    },
    {
        "label": "2570",
        "value": "2570"
    },
    {
        "label": "2569",
        "value": "2569"
    },
    {
        "label": "2568",
        "value": "2568"
    },
    {
        "label": "2567",
        "value": "2567"
    },
    {
        "label": "2566",
        "value": "2566"
    },
    {
        "label": "2565",
        "value": "2565"
    },
    {
        "label": "2564",
        "value": "2564"
    },
    {
        "label": "2563",
        "value": "2563"
    },
    {
        "label": "2560",
        "value": "2560"
    },
    {
        "label": "2559",
        "value": "2559"
    },
    {
        "label": "2558",
        "value": "2558"
    },
    {
        "label": "2557",
        "value": "2557"
    },
    {
        "label": "2556",
        "value": "2556"
    },
    {
        "label": "2555",
        "value": "2555"
    },
    {
        "label": "2551",
        "value": "2551"
    },
    {
        "label": "2550",
        "value": "2550"
    },
    {
        "label": "2549",
        "value": "2549"
    },
    {
        "label": "2548",
        "value": "2548"
    },
    {
        "label": "2546",
        "value": "2546"
    },
    {
        "label": "2545",
        "value": "2545"
    },
    {
        "label": "2541",
        "value": "2541"
    },
    {
        "label": "2540",
        "value": "2540"
    },
    {
        "label": "2539",
        "value": "2539"
    },
    {
        "label": "2538",
        "value": "2538"
    },
    {
        "label": "2537",
        "value": "2537"
    },
    {
        "label": "2536",
        "value": "2536"
    },
    {
        "label": "2535",
        "value": "2535"
    },
    {
        "label": "2534",
        "value": "2534"
    },
    {
        "label": "2533",
        "value": "2533"
    },
    {
        "label": "2530",
        "value": "2530"
    },
    {
        "label": "2529",
        "value": "2529"
    },
    {
        "label": "2528",
        "value": "2528"
    },
    {
        "label": "2527",
        "value": "2527"
    },
    {
        "label": "2526",
        "value": "2526"
    },
    {
        "label": "2525",
        "value": "2525"
    },
    {
        "label": "2522",
        "value": "2522"
    },
    {
        "label": "2519",
        "value": "2519"
    },
    {
        "label": "2518",
        "value": "2518"
    },
    {
        "label": "2517",
        "value": "2517"
    },
    {
        "label": "2516",
        "value": "2516"
    },
    {
        "label": "2515",
        "value": "2515"
    },
    {
        "label": "2508",
        "value": "2508"
    },
    {
        "label": "2506",
        "value": "2506"
    },
    {
        "label": "2505",
        "value": "2505"
    },
    {
        "label": "2502",
        "value": "2502"
    },
    {
        "label": "2500",
        "value": "2500"
    },
    {
        "label": "2490",
        "value": "2490"
    },
    {
        "label": "2489",
        "value": "2489"
    },
    {
        "label": "2488",
        "value": "2488"
    },
    {
        "label": "2487",
        "value": "2487"
    },
    {
        "label": "2486",
        "value": "2486"
    },
    {
        "label": "2485",
        "value": "2485"
    },
    {
        "label": "2484",
        "value": "2484"
    },
    {
        "label": "2483",
        "value": "2483"
    },
    {
        "label": "2482",
        "value": "2482"
    },
    {
        "label": "2481",
        "value": "2481"
    },
    {
        "label": "2480",
        "value": "2480"
    },
    {
        "label": "2479",
        "value": "2479"
    },
    {
        "label": "2478",
        "value": "2478"
    },
    {
        "label": "2477",
        "value": "2477"
    },
    {
        "label": "2476",
        "value": "2476"
    },
    {
        "label": "2475",
        "value": "2475"
    },
    {
        "label": "2474",
        "value": "2474"
    },
    {
        "label": "2473",
        "value": "2473"
    },
    {
        "label": "2472",
        "value": "2472"
    },
    {
        "label": "2471",
        "value": "2471"
    },
    {
        "label": "2470",
        "value": "2470"
    },
    {
        "label": "2469",
        "value": "2469"
    },
    {
        "label": "2466",
        "value": "2466"
    },
    {
        "label": "2465",
        "value": "2465"
    },
    {
        "label": "2464",
        "value": "2464"
    },
    {
        "label": "2463",
        "value": "2463"
    },
    {
        "label": "2462",
        "value": "2462"
    },
    {
        "label": "2460",
        "value": "2460"
    },
    {
        "label": "2456",
        "value": "2456"
    },
    {
        "label": "2455",
        "value": "2455"
    },
    {
        "label": "2454",
        "value": "2454"
    },
    {
        "label": "2453",
        "value": "2453"
    },
    {
        "label": "2452",
        "value": "2452"
    },
    {
        "label": "2450",
        "value": "2450"
    },
    {
        "label": "2449",
        "value": "2449"
    },
    {
        "label": "2448",
        "value": "2448"
    },
    {
        "label": "2447",
        "value": "2447"
    },
    {
        "label": "2446",
        "value": "2446"
    },
    {
        "label": "2445",
        "value": "2445"
    },
    {
        "label": "2444",
        "value": "2444"
    },
    {
        "label": "2443",
        "value": "2443"
    },
    {
        "label": "2441",
        "value": "2441"
    },
    {
        "label": "2440",
        "value": "2440"
    },
    {
        "label": "2439",
        "value": "2439"
    },
    {
        "label": "2431",
        "value": "2431"
    },
    {
        "label": "2430",
        "value": "2430"
    },
    {
        "label": "2429",
        "value": "2429"
    },
    {
        "label": "2428",
        "value": "2428"
    },
    {
        "label": "2427",
        "value": "2427"
    },
    {
        "label": "2426",
        "value": "2426"
    },
    {
        "label": "2425",
        "value": "2425"
    },
    {
        "label": "2424",
        "value": "2424"
    },
    {
        "label": "2423",
        "value": "2423"
    },
    {
        "label": "2422",
        "value": "2422"
    },
    {
        "label": "2421",
        "value": "2421"
    },
    {
        "label": "2420",
        "value": "2420"
    },
    {
        "label": "2415",
        "value": "2415"
    },
    {
        "label": "2411",
        "value": "2411"
    },
    {
        "label": "2410",
        "value": "2410"
    },
    {
        "label": "2409",
        "value": "2409"
    },
    {
        "label": "2408",
        "value": "2408"
    },
    {
        "label": "2406",
        "value": "2406"
    },
    {
        "label": "2405",
        "value": "2405"
    },
    {
        "label": "2404",
        "value": "2404"
    },
    {
        "label": "2403",
        "value": "2403"
    },
    {
        "label": "2402",
        "value": "2402"
    },
    {
        "label": "2401",
        "value": "2401"
    },
    {
        "label": "2400",
        "value": "2400"
    },
    {
        "label": "2399",
        "value": "2399"
    },
    {
        "label": "2398",
        "value": "2398"
    },
    {
        "label": "2397",
        "value": "2397"
    },
    {
        "label": "2396",
        "value": "2396"
    },
    {
        "label": "2395",
        "value": "2395"
    },
    {
        "label": "2390",
        "value": "2390"
    },
    {
        "label": "2388",
        "value": "2388"
    },
    {
        "label": "2387",
        "value": "2387"
    },
    {
        "label": "2386",
        "value": "2386"
    },
    {
        "label": "2382",
        "value": "2382"
    },
    {
        "label": "2381",
        "value": "2381"
    },
    {
        "label": "2380",
        "value": "2380"
    },
    {
        "label": "2379",
        "value": "2379"
    },
    {
        "label": "2372",
        "value": "2372"
    },
    {
        "label": "2371",
        "value": "2371"
    },
    {
        "label": "2370",
        "value": "2370"
    },
    {
        "label": "2369",
        "value": "2369"
    },
    {
        "label": "2365",
        "value": "2365"
    },
    {
        "label": "2361",
        "value": "2361"
    },
    {
        "label": "2360",
        "value": "2360"
    },
    {
        "label": "2359",
        "value": "2359"
    },
    {
        "label": "2358",
        "value": "2358"
    },
    {
        "label": "2357",
        "value": "2357"
    },
    {
        "label": "2356",
        "value": "2356"
    },
    {
        "label": "2355",
        "value": "2355"
    },
    {
        "label": "2354",
        "value": "2354"
    },
    {
        "label": "2353",
        "value": "2353"
    },
    {
        "label": "2352",
        "value": "2352"
    },
    {
        "label": "2351",
        "value": "2351"
    },
    {
        "label": "2350",
        "value": "2350"
    },
    {
        "label": "2347",
        "value": "2347"
    },
    {
        "label": "2346",
        "value": "2346"
    },
    {
        "label": "2345",
        "value": "2345"
    },
    {
        "label": "2344",
        "value": "2344"
    },
    {
        "label": "2343",
        "value": "2343"
    },
    {
        "label": "2342",
        "value": "2342"
    },
    {
        "label": "2341",
        "value": "2341"
    },
    {
        "label": "2340",
        "value": "2340"
    },
    {
        "label": "2339",
        "value": "2339"
    },
    {
        "label": "2338",
        "value": "2338"
    },
    {
        "label": "2337",
        "value": "2337"
    },
    {
        "label": "2336",
        "value": "2336"
    },
    {
        "label": "2335",
        "value": "2335"
    },
    {
        "label": "2334",
        "value": "2334"
    },
    {
        "label": "2333",
        "value": "2333"
    },
    {
        "label": "2331",
        "value": "2331"
    },
    {
        "label": "2330",
        "value": "2330"
    },
    {
        "label": "2329",
        "value": "2329"
    },
    {
        "label": "2328",
        "value": "2328"
    },
    {
        "label": "2327",
        "value": "2327"
    },
    {
        "label": "2326",
        "value": "2326"
    },
    {
        "label": "2325",
        "value": "2325"
    },
    {
        "label": "2324",
        "value": "2324"
    },
    {
        "label": "2323",
        "value": "2323"
    },
    {
        "label": "2322",
        "value": "2322"
    },
    {
        "label": "2321",
        "value": "2321"
    },
    {
        "label": "2320",
        "value": "2320"
    },
    {
        "label": "2319",
        "value": "2319"
    },
    {
        "label": "2318",
        "value": "2318"
    },
    {
        "label": "2317",
        "value": "2317"
    },
    {
        "label": "2316",
        "value": "2316"
    },
    {
        "label": "2315",
        "value": "2315"
    },
    {
        "label": "2314",
        "value": "2314"
    },
    {
        "label": "2312",
        "value": "2312"
    },
    {
        "label": "2311",
        "value": "2311"
    },
    {
        "label": "2308",
        "value": "2308"
    },
    {
        "label": "2307",
        "value": "2307"
    },
    {
        "label": "2306",
        "value": "2306"
    },
    {
        "label": "2305",
        "value": "2305"
    },
    {
        "label": "2304",
        "value": "2304"
    },
    {
        "label": "2303",
        "value": "2303"
    },
    {
        "label": "2302",
        "value": "2302"
    },
    {
        "label": "2300",
        "value": "2300"
    },
    {
        "label": "2299",
        "value": "2299"
    },
    {
        "label": "2298",
        "value": "2298"
    },
    {
        "label": "2297",
        "value": "2297"
    },
    {
        "label": "2296",
        "value": "2296"
    },
    {
        "label": "2295",
        "value": "2295"
    },
    {
        "label": "2294",
        "value": "2294"
    },
    {
        "label": "2293",
        "value": "2293"
    },
    {
        "label": "2292",
        "value": "2292"
    },
    {
        "label": "2291",
        "value": "2291"
    },
    {
        "label": "2290",
        "value": "2290"
    },
    {
        "label": "2289",
        "value": "2289"
    },
    {
        "label": "2287",
        "value": "2287"
    },
    {
        "label": "2286",
        "value": "2286"
    },
    {
        "label": "2285",
        "value": "2285"
    },
    {
        "label": "2284",
        "value": "2284"
    },
    {
        "label": "2283",
        "value": "2283"
    },
    {
        "label": "2282",
        "value": "2282"
    },
    {
        "label": "2281",
        "value": "2281"
    },
    {
        "label": "2280",
        "value": "2280"
    },
    {
        "label": "2278",
        "value": "2278"
    },
    {
        "label": "2267",
        "value": "2267"
    },
    {
        "label": "2265",
        "value": "2265"
    },
    {
        "label": "2264",
        "value": "2264"
    },
    {
        "label": "2263",
        "value": "2263"
    },
    {
        "label": "2262",
        "value": "2262"
    },
    {
        "label": "2261",
        "value": "2261"
    },
    {
        "label": "2260",
        "value": "2260"
    },
    {
        "label": "2259",
        "value": "2259"
    },
    {
        "label": "2258",
        "value": "2258"
    },
    {
        "label": "2257",
        "value": "2257"
    },
    {
        "label": "2256",
        "value": "2256"
    },
    {
        "label": "2251",
        "value": "2251"
    },
    {
        "label": "2250",
        "value": "2250"
    },
    {
        "label": "2234",
        "value": "2234"
    },
    {
        "label": "2233",
        "value": "2233"
    },
    {
        "label": "2232",
        "value": "2232"
    },
    {
        "label": "2231",
        "value": "2231"
    },
    {
        "label": "2230",
        "value": "2230"
    },
    {
        "label": "2229",
        "value": "2229"
    },
    {
        "label": "2228",
        "value": "2228"
    },
    {
        "label": "2227",
        "value": "2227"
    },
    {
        "label": "2226",
        "value": "2226"
    },
    {
        "label": "2225",
        "value": "2225"
    },
    {
        "label": "2224",
        "value": "2224"
    },
    {
        "label": "2223",
        "value": "2223"
    },
    {
        "label": "2222",
        "value": "2222"
    },
    {
        "label": "2221",
        "value": "2221"
    },
    {
        "label": "2220",
        "value": "2220"
    },
    {
        "label": "2219",
        "value": "2219"
    },
    {
        "label": "2218",
        "value": "2218"
    },
    {
        "label": "2217",
        "value": "2217"
    },
    {
        "label": "2216",
        "value": "2216"
    },
    {
        "label": "2214",
        "value": "2214"
    },
    {
        "label": "2213",
        "value": "2213"
    },
    {
        "label": "2212",
        "value": "2212"
    },
    {
        "label": "2211",
        "value": "2211"
    },
    {
        "label": "2210",
        "value": "2210"
    },
    {
        "label": "2209",
        "value": "2209"
    },
    {
        "label": "2208",
        "value": "2208"
    },
    {
        "label": "2207",
        "value": "2207"
    },
    {
        "label": "2206",
        "value": "2206"
    },
    {
        "label": "2205",
        "value": "2205"
    },
    {
        "label": "2204",
        "value": "2204"
    },
    {
        "label": "2203",
        "value": "2203"
    },
    {
        "label": "2200",
        "value": "2200"
    },
    {
        "label": "2199",
        "value": "2199"
    },
    {
        "label": "2198",
        "value": "2198"
    },
    {
        "label": "2197",
        "value": "2197"
    },
    {
        "label": "2196",
        "value": "2196"
    },
    {
        "label": "2195",
        "value": "2195"
    },
    {
        "label": "2194",
        "value": "2194"
    },
    {
        "label": "2193",
        "value": "2193"
    },
    {
        "label": "2192",
        "value": "2192"
    },
    {
        "label": "2191",
        "value": "2191"
    },
    {
        "label": "2190",
        "value": "2190"
    },
    {
        "label": "2179",
        "value": "2179"
    },
    {
        "label": "2178",
        "value": "2178"
    },
    {
        "label": "2177",
        "value": "2177"
    },
    {
        "label": "2176",
        "value": "2176"
    },
    {
        "label": "2175",
        "value": "2175"
    },
    {
        "label": "2174",
        "value": "2174"
    },
    {
        "label": "2173",
        "value": "2173"
    },
    {
        "label": "2172",
        "value": "2172"
    },
    {
        "label": "2171",
        "value": "2171"
    },
    {
        "label": "2170",
        "value": "2170"
    },
    {
        "label": "2168",
        "value": "2168"
    },
    {
        "label": "2167",
        "value": "2167"
    },
    {
        "label": "2166",
        "value": "2166"
    },
    {
        "label": "2165",
        "value": "2165"
    },
    {
        "label": "2164",
        "value": "2164"
    },
    {
        "label": "2163",
        "value": "2163"
    },
    {
        "label": "2162",
        "value": "2162"
    },
    {
        "label": "2161",
        "value": "2161"
    },
    {
        "label": "2160",
        "value": "2160"
    },
    {
        "label": "2159",
        "value": "2159"
    },
    {
        "label": "2158",
        "value": "2158"
    },
    {
        "label": "2157",
        "value": "2157"
    },
    {
        "label": "2156",
        "value": "2156"
    },
    {
        "label": "2155",
        "value": "2155"
    },
    {
        "label": "2154",
        "value": "2154"
    },
    {
        "label": "2153",
        "value": "2153"
    },
    {
        "label": "2152",
        "value": "2152"
    },
    {
        "label": "2151",
        "value": "2151"
    },
    {
        "label": "2150",
        "value": "2150"
    },
    {
        "label": "2148",
        "value": "2148"
    },
    {
        "label": "2147",
        "value": "2147"
    },
    {
        "label": "2146",
        "value": "2146"
    },
    {
        "label": "2145",
        "value": "2145"
    },
    {
        "label": "2144",
        "value": "2144"
    },
    {
        "label": "2143",
        "value": "2143"
    },
    {
        "label": "2142",
        "value": "2142"
    },
    {
        "label": "2141",
        "value": "2141"
    },
    {
        "label": "2140",
        "value": "2140"
    },
    {
        "label": "2139",
        "value": "2139"
    },
    {
        "label": "2138",
        "value": "2138"
    },
    {
        "label": "2137",
        "value": "2137"
    },
    {
        "label": "2136",
        "value": "2136"
    },
    {
        "label": "2135",
        "value": "2135"
    },
    {
        "label": "2134",
        "value": "2134"
    },
    {
        "label": "2133",
        "value": "2133"
    },
    {
        "label": "2132",
        "value": "2132"
    },
    {
        "label": "2131",
        "value": "2131"
    },
    {
        "label": "2130",
        "value": "2130"
    },
    {
        "label": "2129",
        "value": "2129"
    },
    {
        "label": "2128",
        "value": "2128"
    },
    {
        "label": "2127",
        "value": "2127"
    },
    {
        "label": "2126",
        "value": "2126"
    },
    {
        "label": "2125",
        "value": "2125"
    },
    {
        "label": "2123",
        "value": "2123"
    },
    {
        "label": "2122",
        "value": "2122"
    },
    {
        "label": "2121",
        "value": "2121"
    },
    {
        "label": "2120",
        "value": "2120"
    },
    {
        "label": "2119",
        "value": "2119"
    },
    {
        "label": "2118",
        "value": "2118"
    },
    {
        "label": "2117",
        "value": "2117"
    },
    {
        "label": "2116",
        "value": "2116"
    },
    {
        "label": "2115",
        "value": "2115"
    },
    {
        "label": "2114",
        "value": "2114"
    },
    {
        "label": "2113",
        "value": "2113"
    },
    {
        "label": "2112",
        "value": "2112"
    },
    {
        "label": "2111",
        "value": "2111"
    },
    {
        "label": "2110",
        "value": "2110"
    },
    {
        "label": "2109",
        "value": "2109"
    },
    {
        "label": "2108",
        "value": "2108"
    },
    {
        "label": "2107",
        "value": "2107"
    },
    {
        "label": "2106",
        "value": "2106"
    },
    {
        "label": "2105",
        "value": "2105"
    },
    {
        "label": "2104",
        "value": "2104"
    },
    {
        "label": "2103",
        "value": "2103"
    },
    {
        "label": "2102",
        "value": "2102"
    },
    {
        "label": "2101",
        "value": "2101"
    },
    {
        "label": "2100",
        "value": "2100"
    },
    {
        "label": "2099",
        "value": "2099"
    },
    {
        "label": "2097",
        "value": "2097"
    },
    {
        "label": "2096",
        "value": "2096"
    },
    {
        "label": "2095",
        "value": "2095"
    },
    {
        "label": "2094",
        "value": "2094"
    },
    {
        "label": "2093",
        "value": "2093"
    },
    {
        "label": "2092",
        "value": "2092"
    },
    {
        "label": "2090",
        "value": "2090"
    },
    {
        "label": "2089",
        "value": "2089"
    },
    {
        "label": "2088",
        "value": "2088"
    },
    {
        "label": "2087",
        "value": "2087"
    },
    {
        "label": "2086",
        "value": "2086"
    },
    {
        "label": "2085",
        "value": "2085"
    },
    {
        "label": "2084",
        "value": "2084"
    },
    {
        "label": "2083",
        "value": "2083"
    },
    {
        "label": "2082",
        "value": "2082"
    },
    {
        "label": "2081",
        "value": "2081"
    },
    {
        "label": "2080",
        "value": "2080"
    },
    {
        "label": "2079",
        "value": "2079"
    },
    {
        "label": "2077",
        "value": "2077"
    },
    {
        "label": "2076",
        "value": "2076"
    },
    {
        "label": "2075",
        "value": "2075"
    },
    {
        "label": "2074",
        "value": "2074"
    },
    {
        "label": "2073",
        "value": "2073"
    },
    {
        "label": "2072",
        "value": "2072"
    },
    {
        "label": "2071",
        "value": "2071"
    },
    {
        "label": "2070",
        "value": "2070"
    },
    {
        "label": "2069",
        "value": "2069"
    },
    {
        "label": "2068",
        "value": "2068"
    },
    {
        "label": "2067",
        "value": "2067"
    },
    {
        "label": "2066",
        "value": "2066"
    },
    {
        "label": "2065",
        "value": "2065"
    },
    {
        "label": "2064",
        "value": "2064"
    },
    {
        "label": "2063",
        "value": "2063"
    },
    {
        "label": "2062",
        "value": "2062"
    },
    {
        "label": "2061",
        "value": "2061"
    },
    {
        "label": "2060",
        "value": "2060"
    },
    {
        "label": "2052",
        "value": "2052"
    },
    {
        "label": "2050",
        "value": "2050"
    },
    {
        "label": "2049",
        "value": "2049"
    },
    {
        "label": "2048",
        "value": "2048"
    },
    {
        "label": "2047",
        "value": "2047"
    },
    {
        "label": "2046",
        "value": "2046"
    },
    {
        "label": "2045",
        "value": "2045"
    },
    {
        "label": "2044",
        "value": "2044"
    },
    {
        "label": "2043",
        "value": "2043"
    },
    {
        "label": "2042",
        "value": "2042"
    },
    {
        "label": "2041",
        "value": "2041"
    },
    {
        "label": "2040",
        "value": "2040"
    },
    {
        "label": "2039",
        "value": "2039"
    },
    {
        "label": "2038",
        "value": "2038"
    },
    {
        "label": "2037",
        "value": "2037"
    },
    {
        "label": "2036",
        "value": "2036"
    },
    {
        "label": "2035",
        "value": "2035"
    },
    {
        "label": "2034",
        "value": "2034"
    },
    {
        "label": "2033",
        "value": "2033"
    },
    {
        "label": "2032",
        "value": "2032"
    },
    {
        "label": "2031",
        "value": "2031"
    },
    {
        "label": "2030",
        "value": "2030"
    },
    {
        "label": "2029",
        "value": "2029"
    },
    {
        "label": "2028",
        "value": "2028"
    },
    {
        "label": "2027",
        "value": "2027"
    },
    {
        "label": "2026",
        "value": "2026"
    },
    {
        "label": "2025",
        "value": "2025"
    },
    {
        "label": "2024",
        "value": "2024"
    },
    {
        "label": "2023",
        "value": "2023"
    },
    {
        "label": "2022",
        "value": "2022"
    },
    {
        "label": "2021",
        "value": "2021"
    },
    {
        "label": "2020",
        "value": "2020"
    },
    {
        "label": "2019",
        "value": "2019"
    },
    {
        "label": "2018",
        "value": "2018"
    },
    {
        "label": "2017",
        "value": "2017"
    },
    {
        "label": "2016",
        "value": "2016"
    },
    {
        "label": "2015",
        "value": "2015"
    },
    {
        "label": "2011",
        "value": "2011"
    },
    {
        "label": "2010",
        "value": "2010"
    },
    {
        "label": "2009",
        "value": "2009"
    },
    {
        "label": "2008",
        "value": "2008"
    },
    {
        "label": "2007",
        "value": "2007"
    },
    {
        "label": "2006",
        "value": "2006"
    },
    {
        "label": "2000",
        "value": "2000"
    },
    {
        "label": "6799",
        "value": "6799"
    },
    {
        "label": "6798",
        "value": "6798"
    },
    {
        "label": "2914",
        "value": "2914"
    },
    {
        "label": "2913",
        "value": "2913"
    },
    {
        "label": "2912",
        "value": "2912"
    },
    {
        "label": "2911",
        "value": "2911"
    },
    {
        "label": "2906",
        "value": "2906"
    },
    {
        "label": "2905",
        "value": "2905"
    },
    {
        "label": "2904",
        "value": "2904"
    },
    {
        "label": "2903",
        "value": "2903"
    },
    {
        "label": "2902",
        "value": "2902"
    },
    {
        "label": "2617",
        "value": "2617"
    },
    {
        "label": "2615",
        "value": "2615"
    },
    {
        "label": "2614",
        "value": "2614"
    },
    {
        "label": "2612",
        "value": "2612"
    },
    {
        "label": "2609",
        "value": "2609"
    },
    {
        "label": "2607",
        "value": "2607"
    },
    {
        "label": "2606",
        "value": "2606"
    },
    {
        "label": "2605",
        "value": "2605"
    },
    {
        "label": "2604",
        "value": "2604"
    },
    {
        "label": "2603",
        "value": "2603"
    },
    {
        "label": "2602",
        "value": "2602"
    },
    {
        "label": "2601",
        "value": "2601"
    },
    {
        "label": "2600",
        "value": "2600"
    }
]

  private searchSubject = new Subject<DebouncedSearch>();
  private vehicleLookupSubject = new Subject<VehicleLookupSearch>();

  constructor(){
    this.prepareVehicleLookupDebounce()
  }

  ngOnInit(): void {
    this.MAPPINGS.set(FORM_MAP[this.sessionService.currentObjectKey()])
    if(this.hasVehicleDetails()){
        this.manualVehicleEntry.set(true)
        return
    }
    this.prepareOptions()
  }

  hasVehicleDetails(){
    return ['year','make','model'].some(f=>f!=='')
  }

  prepareOptions(){
   
  }

  attachSelectedOption(){
    let currObj = this.sessionService.currentObject()
    if(currObj[this.MAPPINGS()['business_address']]){
    }
  }



  prepareVehicleLookupDebounce() {
    this.vehicleLookupSubject.pipe(
      debounceTime(500),
      switchMap((lookupData: VehicleLookupSearch) => {
        if (!lookupData.plate || !lookupData.state) {
          return of(null);
        }

        this.isLookingUpVehicle.set(true);
        this.error.set("");
        this.noVehicleFound.set(false);
        this.lookupMessage.set(`Looking up vehicle registration ${lookupData.plate} in ${lookupData.state}...`);
        const request: VehicleLookupByPlateRequest = {
          plate: lookupData.plate,
          state: lookupData.state
        };
        
        return this.vehicleService.vehicleLookupByPlate(request).pipe(
          catchError((error: HttpErrorResponse) => {
            this.isLookingUpVehicle.set(false);
            console.log(error)
            this.error.set("Unfortunately we could find the details of your vehicle. Please enter them manually.");
            this.manualVehicleEntry.set(true)

            return of(null);
          })
        );
      })
    ).subscribe({
      next: (result: VehicleLookupByPlateResponse | null) => {
        if (result && result.result && result.result.length > 0) {
          this.handleVehicleLookupByRegoResult(result.result[0]);
          this.manualVehicleEntry.set(true)
        } else {
          this.isLookingUpVehicle.set(false);
          this.noVehicleFound.set(true);
          // Clear auto-populated fields to allow manual entry
          this.clearVehicleFields();
          this.manualVehicleEntry.set(true)

        }
      }
    });
  }

  ngOnDestroy() {
    this.searchSubject.unsubscribe();
    this.vehicleLookupSubject.unsubscribe();
  }


  handleVehicleLookupByRegoResult(vehicleResult: any) {
    if (vehicleResult.nvic) {
      this.lookupMessage.set("Getting detailed vehicle specifications...");
      const nvicRequest: VehicleDetailsLookupByNVICRequest = {
        model: "A",
        nvic: vehicleResult.nvic
      };
      
      this.vehicleService.vehicleLookupByNVIC(nvicRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          this.isLookingUpVehicle.set(false);
          console.log(error);
          this.error.set("Unfortunately we could find the details of your vehicle. Please enter them manually.");
          this.manualVehicleEntry.set(true)

          return of(null);
        })
      ).subscribe({
        next: (details: VehicleDetailsLookupByNVICResponse | null) => {
          this.isLookingUpVehicle.set(false);
          if (details && details.length > 0) {
            this.mapVehicleDetailsToForm(details[0]);
          } else {
            this.noVehicleFound.set(true);
            this.clearVehicleFields();
          }
        }
      });
    } else {
      this.isLookingUpVehicle.set(false);
    }
  }

  mapVehicleDetailsToForm(vehicleDetail: VehicleDetail) {
    let currObj = this.sessionService.currentObject();
    
    // Set flag to prevent cascading API calls
    this.isSettingValuesProgram.set(true)
    
    currObj[this.MAPPINGS()['make']] = vehicleDetail.ManufacturerName;
    currObj[this.MAPPINGS()['model']] = vehicleDetail.FamilyName;
    currObj[this.MAPPINGS()['variant']] = vehicleDetail.VariantName;
    currObj[this.MAPPINGS()['year']] = parseInt(vehicleDetail.YearCreate) || 0;
    currObj[this.MAPPINGS()['engine_size']] = vehicleDetail.CCName;
    currObj[this.MAPPINGS()['sum_insured']] = vehicleDetail.Trade;
    currObj[this.MAPPINGS()['segment']] = vehicleDetail.SegmentName;
    
    this.vehicleDetails.set(vehicleDetail);
    this.sessionService.currentObject.set(currObj);
    
    // Set to readonly mode when vehicle details are successfully retrieved
    
    this.cd.markForCheck();
    
    // Reset flag after a small delay to ensure all model updates are complete
    setTimeout(() => {
      this.isSettingValuesProgram.set(false)
    }, 200);
    
    this.syncFormData();
  }

  clearVehicleFields(notYear = false) {
    let currObj = this.sessionService.currentObject();


    
    currObj[this.MAPPINGS()['make']] = '';
    currObj[this.MAPPINGS()['model']] = '';
    currObj[this.MAPPINGS()['variant']] = '';
    if(!notYear) currObj[this.MAPPINGS()['year']] = null;
    currObj[this.MAPPINGS()['engine_size']] = '';
    currObj[this.MAPPINGS()['sum_insured']] = '';
    currObj[this.MAPPINGS()['segment']] = '';
    // currObj[this.MAPPINGS()['type']] = '';
    currObj[this.MAPPINGS()['electric_vehicle']] = '';

    
    this.vehicleDetails.set(undefined);
    this.selectedMakeCode.set(undefined)
    this.selectedModelCode.set(undefined)

    this.selectedVariant.set(undefined)

    this.sessionService.currentObject.set(currObj);
    this.cd.markForCheck();
    
    // Reset flag after a small delay
    setTimeout(() => {
    this.isSettingValuesProgram.set(false)

    }, 100);
  }

  onRegoOrStateChange() {
    const currObj = this.sessionService.currentObject();
    const isNewVehicle = currObj[this.MAPPINGS()['is_new_not_registered']];
    
    if (!isNewVehicle) {
      const plate = currObj[this.MAPPINGS()['rego']];
      const state = currObj[this.MAPPINGS()['state']];
      
      if (plate && state) {
        this.vehicleLookupSubject.next({ plate, state });
      }
    }
  }

   syncFormData(){
      console.log('Form Object',this.sessionService.currentObject());
      console.log('Mappings:', this.MAPPINGS());
      let eventData : ParentAppOutput = new ParentAppOutput()
      //only send updated object in the current path
      eventData.Payload.TargetObject = this.sessionService.currentObject()
      this.coreService.emiParentAppData(eventData)
      
      const isNewVehicle = this.sessionService.currentObject()[this.MAPPINGS()['is_new_not_registered']];
      if(!this.manualVehicleEntry()){
        if (isNewVehicle) {
            this.noVehicleFound.set(false);
            const year = this.sessionService.currentObject()[this.MAPPINGS()['year']];
            if (year) {
              this.onYearChange();
            }
            return
          } 
        this.clearCascadingDropdowns('year');
      }
      
   }

   onYearChange() {
     // Skip if we're setting values programmatically
     if (this.isSettingValuesProgram()) {
       return;
     }
     
     const year = this.sessionService.currentObject()[this.MAPPINGS()['year']];

     if (!year) {
       this.clearCascadingDropdowns('year');
       return;
     }
     this.clearVehicleFields(true)
     this.manualVehicleEntry.set(false)

     this.isLoadingMakes.set(true);
     this.clearCascadingDropdowns('year');
     
     const request: VehicleMakeLookupRequest = {
       model: "A",
       yearFrom: year,
       yearTo: year
     };

     this.vehicleService.vehicleMakeLookup(request).pipe(
       catchError((error: HttpErrorResponse) => {
         this.isLoadingMakes.set(false);
         this.error.set(GetServerMsgFromHttpError(error));
         this.manualVehicleEntry.set(true)
         return of([]);
       })
     ).subscribe({
       next: (makes) => {
         this.isLoadingMakes.set(false);
         this.makeOptions.set(makes || []);
         if(!this.makeOptions().length) this.manualVehicleEntry.set(true)
          else this.manualVehicleEntry.set(false)
         this.cd.markForCheck();
       }
     });
   }

   onMakeSelect() {
     const make = this.selectedMake();
     if (!make) return;
     
     // Find the selected make option before clearing
     const selectedMakeOption = this.makeOptions().find(m => m.name === make);
     if (!selectedMakeOption) return;
     
     // Set the actual make value
     let currObj = this.sessionService.currentObject();
     console.log('Setting make:', make, 'to property:', this.MAPPINGS()['make']);
     currObj[this.MAPPINGS()['make']] = make;
     this.sessionService.currentObject.set(currObj);
     
     // Store the make code for future API calls
     this.selectedMakeCode.set(selectedMakeOption.code);
     
     // Clear the selection and hide the dropdown
     this.makeOptions.set([]);
     
     // Trigger the next API call for models
     const year = currObj[this.MAPPINGS()['year']];

     if (year) {
       this.loadModels(year, selectedMakeOption.code);
     } else{
        this.manualVehicleEntry.set(true)
     }
     
     this.syncFormData();
   }
   
   loadModels(year: number, makeCode: string) {
     this.isLoadingModels.set(true);
     this.clearCascadingDropdowns('make');
     
     const request: VehicleModelLookupRequest = {
       model: "A",
       yearFrom: year,
       yearTo: year,
       makeCode: makeCode
     };

     this.vehicleService.vehicleModelLookup(request).pipe(
       catchError((error: HttpErrorResponse) => {
         this.isLoadingModels.set(false);
         this.error.set(GetServerMsgFromHttpError(error));
         this.manualVehicleEntry.set(true)
         this.cd.markForCheck();

         return of([]);

       })
     ).subscribe({
       next: (models) => {
         this.isLoadingModels.set(false);
         this.modelOptions.set(models || []);
         if(!this.modelOptions().length) this.manualVehicleEntry.set(true)
          else this.manualVehicleEntry.set(false)

        this.cd.markForCheck();

       }
     });
   }



   onModelSelect() {
     const model = this.selectedModel();
     if (!model) return;
     
     // Find the selected model option before clearing
     const selectedModelOption = this.modelOptions().find(m => m.name === model);
     if (!selectedModelOption) return;
     
     // Set the actual model value
     let currObj = this.sessionService.currentObject();
     currObj[this.MAPPINGS()['model']] = model;
     this.sessionService.currentObject.set(currObj);
     
     // Store the model code for future API calls
     this.selectedModelCode.set(selectedModelOption.code);
     
     // Clear the selection and hide the dropdown
     this.modelOptions.set([]);
     
     // Trigger the next API call for variants
     const year = currObj[this.MAPPINGS()['year']];
     const makeCode = this.selectedMakeCode();
     if (year && makeCode) {
       this.loadVariants(year, makeCode, selectedModelOption.code);
     } else{
        this.manualVehicleEntry.set(true)
     }
     
     this.syncFormData();
   }
   
   loadVariants(year: number, makeCode: string, familyCode: string) {
     this.isLoadingVariants.set(true);
     this.clearCascadingDropdowns('model');
     
     const request: VehicleVariantLookupRequest = {
       model: "A",
       yearFrom: year,
       yearTo: year,
       makeCode: makeCode,
       familyCode: familyCode
     };

     this.vehicleService.vehicleVariantLookup(request).pipe(
       catchError((error: HttpErrorResponse) => {
         this.isLoadingVariants.set(false);
         this.error.set(GetServerMsgFromHttpError(error));
         this.manualVehicleEntry.set(true)

         return of([]);
       })
     ).subscribe({
       next: (variants) => {
         this.isLoadingVariants.set(false);
         this.variantOptions.set(variants || []);
         if(!this.variantOptions().length) this.manualVehicleEntry.set(true)
          else this.manualVehicleEntry.set(false)


         this.cd.markForCheck();
       }
     });
   }


   onVariantSelect() {
     const variant = this.selectedVariant();
     if (!variant) return;
     
     // Set the actual variant value
     let currObj = this.sessionService.currentObject();
     currObj[this.MAPPINGS()['variant']] = variant;
     this.sessionService.currentObject.set(currObj);
     
     // Clear the selection and hide the dropdown
     this.variantOptions.set([]);
     
     // Trigger the next API call for NVIC options
     const year = currObj[this.MAPPINGS()['year']];
     const makeCode = this.selectedMakeCode();
     const modelCode = this.selectedModelCode();
     if (year && makeCode && modelCode) {
       this.loadNvicOptions(year, makeCode, modelCode);
     } else{
        this.manualVehicleEntry.set(true)
     }
     
     this.syncFormData();
   }
   
   loadNvicOptions(year: number, makeCode: string, familyCode: string) {
     this.isLoadingNvicOptions.set(true);
     this.clearCascadingDropdowns('variant');
     
     const request: VehicleNvicListLookupRequest = {
       model: "A",
       yearFrom: year,
       yearTo: year,
       makeCode: makeCode,
       familyCode: familyCode
     };

     this.vehicleService.vehicleNvicListLookup(request).pipe(
       catchError((error: HttpErrorResponse) => {
         this.isLoadingNvicOptions.set(false);
         this.error.set(GetServerMsgFromHttpError(error));
         this.manualVehicleEntry.set(true)

         return of([]);
       })
     ).subscribe({
       next: (nvicList) => {
         this.isLoadingNvicOptions.set(false);
         this.nvicOptions.set(nvicList || []);
         if(!this.nvicOptions().length) this.manualVehicleEntry.set(true)
          else this.manualVehicleEntry.set(false)


         this.cd.markForCheck();

       }
     });
   }



   onNvicSelect() {
     const selectedNvic = this.selectedNvic();
     if (!selectedNvic) return;

     this.lookupMessage.set("Getting detailed vehicle specifications...");
     this.isLookingUpVehicle.set(true);
     
     const nvicRequest: VehicleDetailsLookupByNVICRequest = {
       model: "A",
       nvic: selectedNvic.nvicCur
     };
     
     this.vehicleService.vehicleLookupByNVIC(nvicRequest).pipe(
       catchError((error: HttpErrorResponse) => {
         this.isLookingUpVehicle.set(false);
         this.error.set(GetServerMsgFromHttpError(error));
         this.manualVehicleEntry.set(true)
         return of(null);
       })
     ).subscribe({
       next: (details: VehicleDetailsLookupByNVICResponse | null) => {
         this.isLookingUpVehicle.set(false);
         if (details && details.length > 0) {
           this.mapVehicleDetailsToForm(details[0]);
         }
         this.manualVehicleEntry.set(true)
          
         this.cd.markForCheck()
       }
     });
   }

   clearCascadingDropdowns(fromLevel: 'year' | 'make' | 'model' | 'variant') {
     const currObj = this.sessionService.currentObject();
     
     // Set flag to prevent cascading API calls when clearing dropdowns
    this.isSettingValuesProgram.set(true)

     
     const clearFields = (type: "make" | "model" | "variant" | "nvic", options?: WritableSignal<any[]>) =>{
      if(type !== "nvic" && options){
        options.set([])
        return
      }
      this.nvicOptions.set([]);
     }


     if (fromLevel === 'year') {
       clearFields('make',this.makeOptions)
       clearFields('model',this.modelOptions)
       clearFields('variant',this.variantOptions)
       clearFields('nvic')
     } else if (fromLevel === 'make') {
        clearFields('model',this.modelOptions)
        clearFields('variant',this.variantOptions)
        clearFields('nvic')
     } else if (fromLevel === 'model') {
        clearFields('variant',this.variantOptions)
        clearFields('nvic')
     } else if (fromLevel === 'variant') {
        clearFields('nvic')
     }
     
     this.sessionService.currentObject.set(currObj);
     this.cd.markForCheck();
     
     // Reset flag after a small delay
     setTimeout(() => {
       this.isSettingValuesProgram.set(false)
     }, 100);
   }

   showVehicleDetails(): boolean {
     const currObj = this.sessionService.currentObject();
     const isNewVehicle = currObj[this.MAPPINGS()['is_new_not_registered']];
     const hasVehicleData = currObj[this.MAPPINGS()['make']] || currObj[this.MAPPINGS()['model']] || 
                            currObj[this.MAPPINGS()['year']] || currObj[this.MAPPINGS()['variant']];
     
     // Show details if:
     // 1. It's a new vehicle being manually entered
     // 2. We have vehicle data from lookup
     // 3. We had a lookup failure and are in manual mode
     return (isNewVehicle || hasVehicleData || this.noVehicleFound()) && 
            !this.isLookingUpVehicle() && !this.error();
   }

   toggleEditMode() {
     
     // If switching to edit mode for a registered vehicle, clear lookup states
     if ( !this.sessionService.currentObject()[this.MAPPINGS()['is_new_not_registered']]) {
       this.noVehicleFound.set(false);
       this.error.set("");
     }
   }
}
