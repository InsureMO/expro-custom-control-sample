import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, input, Input, OnInit, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { GetShadowRootElementByID } from '../shared/utils/dom';
import { CoreService, ParentAppEventData } from '../services/core.service';


@Component({
  selector: 'app-address-form',
  imports: [InputTextModule,MessageModule,FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormComponent {
  isReadonly = input.required<boolean>()
  
  @Input() set transaction(txn:Record<string,any>){
    this.currentTransaction = txn
    this.formObject = txn['MasterCOVIDGLOBaseLayer'][0]['PolicyHolderAddress'] ?? {}
  }
  
  @ViewChild('addressControl') addressControl!: ElementRef;

  
  cd = inject(ChangeDetectorRef)
  coreService = inject(CoreService)

  currentTransaction : Record<string,any> = {}
  formObject : Record<string,any> = {}

  fullAddress : string = ""

  ngOnInit(): void {
  }
  
  //address auto complete helper
  ngAfterViewInit() {
    this.addressControl.nativeElement.value = this.currentTransaction['address'] ?? ''
    this.getPlaceAutocomplete();
  }

  private getPlaceAutocomplete() {
    if(!google) return
    if(this.addressControl){
      const itemAutoComplete = new google.maps.places.Autocomplete(this.addressControl.nativeElement)
      google.maps.event.addListener(itemAutoComplete, 'place_changed', () => {
        const itemPlace = itemAutoComplete.getPlace();
        this.populateAddressData(itemPlace,this.formObject)
        this.cd.markForCheck()
      })
    }
}

private populateAddressData(placeResult: google.maps.places.PlaceResult,addressObject:Record<string,any>){
  if(!placeResult.address_components || !addressObject) return

  let apt_number = ""
  let street_address = ""
  let postcode = "";
  let country = "";
  let state = "";
  let city = "";

   for (const component of placeResult.address_components as google.maps.GeocoderAddressComponent[]) {
    const componentType = component.types[0];

    switch (componentType) {
      case "subpremise": 
        apt_number = `${component.long_name}`;
        break;

      case "street_number": 
        street_address = `${component.long_name} `;
        break;

      case "route":
        street_address += component.long_name;
        break;

      case "postal_code":
        postcode = `${component.long_name}${postcode}`;
        break;

      case "postal_code_suffix":
        postcode = `${postcode}-${component.long_name}`;
        break;

      case "locality":
        city = component.long_name;
        break;

      case "administrative_area_level_1":
        state = component.long_name;
        break;

      case "country":
        country = component.long_name
        break;
    }
  }

  addressObject['PolicyHolderAddresspostcode'] = postcode ?? "" 
  addressObject['PolicyHolderAddressUnitOrApartmentNumber'] = apt_number ?? "" 
  addressObject['PolicyHolderAddressStreetName'] = street_address ?? "" 
  addressObject['PolicyHolderAddresscountry'] = country ?? "" 
  addressObject['PolicyHolderAddressstate'] = state ?? "" 
  addressObject['PolicyHolderAddresscity'] = city ?? "" 

  this.fullAddress = placeResult.formatted_address ?? ""
  console.log('Form Object',addressObject);
  let eventData : ParentAppEventData = new ParentAppEventData()
  eventData.Payload.Transaction = this.currentTransaction
  this.coreService.emiParentAppData(eventData)
}


}

