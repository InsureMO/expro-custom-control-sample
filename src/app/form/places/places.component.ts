import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CoreService } from '../../services/core.service';
import { SessionService } from '../../services/session.service';
import { FORM_MAP } from '../form.map';
import { FormsModule } from '@angular/forms';
import { ParentAppOutput } from '../../types/output';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SearchPalcesRequest, SearchPlacesResult, PlacePrediction, PlaceDetailsResult } from './model';
import { HttpErrorResponse } from '@angular/common/http';
import { GetServerMsgFromHttpError } from '../../shared/utils/http';
import {  debounceTime, Subject, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { GetShadowRootElementByID } from '../../shared/utils/dom';
import { PlacesService } from './places.service';
type SearchType = 'name' | 'number'
type DebouncedSearch = {
  query: string
  type: SearchType
}

@Component({
  selector: 'app-places',  
  imports: [FormsModule,InputTextModule,SelectModule,InputNumberModule,
    MessageModule],
  providers: [PlacesService],
  templateUrl: './places.component.html',
  styleUrl: './places.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlacesComponent implements OnInit,OnDestroy{


  cd = inject(ChangeDetectorRef)
  coreService = inject(CoreService)
  sessionService = inject(SessionService)
  placesService = inject(PlacesService)


  PlacesResults: WritableSignal<PlacePrediction[]> = signal([])

  selectedPlacePrediction: WritableSignal<PlacePrediction | undefined> = signal(undefined)
  selectedPlace: WritableSignal<PlaceDetailsResult | undefined> = signal(undefined)


  searchNameQuery: WritableSignal<string> = signal("")
  
  MAPPINGS : WritableSignal<Record<string,string>> = signal({})
  error : WritableSignal<string> = signal("")
  searchingByType: WritableSignal<SearchType | ""> = signal("")

  QUERY_BOX_ID = 'query-box'

  private searchSubject = new Subject<DebouncedSearch>();

  constructor(){
    this.prepareSearchDebounce()
  }

  ngOnInit(): void {
    this.MAPPINGS.set(FORM_MAP[this.sessionService.currentObjectKey()])
    this.prepareOptions()
  }

  //only on INIt
  prepareOptions(){
    let currObj = this.sessionService.currentObject()
    if(currObj[this.MAPPINGS()['business_address']]){
      this.onPlaceChange(currObj[this.MAPPINGS()['business_address']])
    }
  }

  //only on INIT
  attachSelectedOption(){
    let currObj = this.sessionService.currentObject()
    if(currObj[this.MAPPINGS()['business_address']]){
      let found = this.PlacesResults().find(f=>f.description===currObj[this.MAPPINGS()['business_address']])
      if(found) this.selectedPlacePrediction.set(found)
    }
  }

  prepareSearchDebounce(){
    this.searchSubject.pipe(
      debounceTime(300), // wait 300ms after user stops typing
      distinctUntilChanged(), // only emit if the value has changed
      switchMap((searchData:DebouncedSearch) => {
        if (!searchData || !searchData.query.length) {
          this.PlacesResults.set([]);
          return of(null);
        }

        this.searchingByType.set(searchData.type);
        return this.placesService.searchPlacesByText({ input: searchData.query }).pipe(
          catchError((error: HttpErrorResponse) => {
            this.searchingByType.set("");
            this.error.set(GetServerMsgFromHttpError(error));
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (results: SearchPlacesResult | null) => {
        if(results) this.handlePostSearchResults(results)
        this.searchingByType.set("");
      }
    });
  }

  // don't forget to unsubscribe on destroy to prevent memory leaks
  ngOnDestroy() {
    this.searchSubject.unsubscribe();
  }

  autoFocusQuery(){
    setTimeout(()=>GetShadowRootElementByID(this.QUERY_BOX_ID)?.focus(),300)
  }


  onPlaceChange(event:string){
    this.searchSubject.next({type:'name',query:event});
  }

  handlePostSearchResults(result: SearchPlacesResult){
    this.PlacesResults.set(result.predictions);
    this.attachSelectedOption()
  }

  onPlaceSelect(){
    if(this.selectedPlacePrediction()){
      this.placesService.searchPlaceDetailByPlaceID(
        this.selectedPlacePrediction()!.place_id 
      ).pipe(
        catchError((error: HttpErrorResponse) => {
          this.error.set(GetServerMsgFromHttpError(error));
          return of(null);
        })
      ).subscribe({
        next: (result) => {
          if(result && result.result) {
            const placeDetails = result.result;
            let currObj = this.sessionService.currentObject();
            
            // Helper function to find address component by type
            const getAddressComponent = (types: string[]): string => {
              const component = placeDetails.address_components.find(comp => 
                types.some(type => comp.types.includes(type))
              );
              return component?.long_name || '';
            };
            
            // Map address components to form fields
            currObj[this.MAPPINGS()['street_address']] = getAddressComponent(['street_number']) + ' ' + getAddressComponent(['route']);
            currObj[this.MAPPINGS()['suburb']] = getAddressComponent(['locality', 'sublocality', 'sublocality_level_1']);
            currObj[this.MAPPINGS()['city']] = getAddressComponent(['locality', 'administrative_area_level_2']);
            currObj[this.MAPPINGS()['post_code']] = getAddressComponent(['postal_code']);
            currObj[this.MAPPINGS()['state']] = getAddressComponent(['administrative_area_level_1']);
            currObj[this.MAPPINGS()['country']] = getAddressComponent(['country']);
            
            this.selectedPlace.set(placeDetails);
            this.sessionService.currentObject.set(currObj);
            this.cd.markForCheck()

            this.syncFormData();
          }
        }
      });
    } else {
      this.syncFormData();
    }
  }

   syncFormData(){
      console.log('Form Object',this.sessionService.currentObject());
      let eventData : ParentAppOutput = new ParentAppOutput()
      //only send updated object in the current path
      eventData.Payload.TargetObject = this.sessionService.currentObject()
      this.coreService.emiParentAppData(eventData)
   }
}
