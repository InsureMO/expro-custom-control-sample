import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, input, Input, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CoreService } from '../services/core.service';
import { SessionService } from '../services/session.service';
import { ParentAppOutput } from '../types/output';
import { FORM_MAPPER, SupportedFieldGroup } from './form.mapper';


@Component({
  selector: 'app-address-form',
  imports: [InputTextModule,MessageModule,FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressFormComponent implements OnInit {

  @ViewChild('addressControl') addressControl!: ElementRef;

  cd = inject(ChangeDetectorRef)
  coreService = inject(CoreService)
  sessionService = inject(SessionService)

  fullAddress : string = ""

  AUTO_COMPLETE_STYLE_ID = 'expro-address-google-autocomplete'
  AUTO_COMPLETE_Z_INDEX = '999999'

  MAPPINGS : WritableSignal<Record<string,string>> = signal({})

  ngOnInit(): void {
    this.MAPPINGS.set(FORM_MAPPER[this.sessionService.currentObjectKey()])
  }
  
  //address auto complete helper
  ngAfterViewInit() {
    let formObj = this.sessionService.currentObject()
    this.addressControl.nativeElement.value = formObj && formObj[this.sessionService.currentObjectKey()] ? 
    formObj[this.sessionService.currentObjectKey()] : ""
    this.getPlaceAutocomplete();
  }

  private getPlaceAutocomplete() {
    if(!google) return
    if(this.addressControl){
      const itemAutoComplete = new google.maps.places.Autocomplete(this.addressControl.nativeElement)
      this.patchAutoCompleteZindex()
      google.maps.event.addListener(itemAutoComplete, 'place_changed', () => {
        
        const itemPlace = itemAutoComplete.getPlace();
        this.populateAddressData(itemPlace,this.sessionService.currentObject() ?? {})
        this.cd.markForCheck()
      })
    }
}

private patchAutoCompleteZindex(){
  let found = document.head.querySelector(this.AUTO_COMPLETE_STYLE_ID)
  if(found) return

  // override pac-container z-index for google autocomplete globally
  const style = document.createElement('style');
  style.id = this.AUTO_COMPLETE_STYLE_ID
  style.textContent = `
    .pac-container {
      z-index: ${this.AUTO_COMPLETE_Z_INDEX} !important;
    }
      `
      document.head.appendChild(style);
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

  addressObject[this.MAPPINGS()['apt_number']] = apt_number ?? ""
  addressObject[this.MAPPINGS()['street_address']] = street_address ?? ""
  addressObject[this.MAPPINGS()['city']] = city ?? ""
  addressObject[this.MAPPINGS()['state']] = state ?? ""
  addressObject[this.MAPPINGS()['post_code']] = postcode ?? ""
  addressObject[this.MAPPINGS()['country']] = country ?? ""

  this.fullAddress = placeResult.formatted_address ?? ""
  this.sessionService.currentObject.set(addressObject)
  
  this.syncFormData()
}

 syncFormData(){
    console.log('Form Object',this.sessionService.currentObject());
    let eventData : ParentAppOutput = new ParentAppOutput()
    //only send updated object in the current path
    eventData.Payload.TargetObject = this.sessionService.currentObject()
    this.coreService.emiParentAppData(eventData)
 }

}

