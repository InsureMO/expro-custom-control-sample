import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { CoreService } from '../../services/core.service';
import { SessionService } from '../../services/session.service';
import { FORM_MAP } from '../form.map';
import { FormsModule } from '@angular/forms';
import { ParentAppOutput } from '../../types/output';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SearchByNameRequest, SearchByNameResult, SearchByNumRequest, SearchByNumResult } from './model';
import { AbnService } from './abn.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GetServerMsgFromHttpError } from '../../shared/utils/http';
import {  debounceTime, Subject, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { InputNumberModule } from 'primeng/inputnumber';
import { GetShadowRootElementByID } from '../../shared/utils/dom';
import { PlacesComponent } from "../places/places.component";
type SearchType = 'name' | 'number'
type DebouncedSearch = {
  query: string
  type: SearchType
}

@Component({
  selector: 'app-abn',  
  imports: [FormsModule, InputTextModule, SelectModule, InputNumberModule,
    MessageModule, PlacesComponent],
  providers: [AbnService],
  templateUrl: './abn.component.html',
  styleUrl: './abn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AbnComponent implements OnInit,OnDestroy{


  cd = inject(ChangeDetectorRef)
  coreService = inject(CoreService)
  sessionService = inject(SessionService)
  abnService = inject(AbnService)


  businessResults: WritableSignal<SearchByNameResult[]> = signal([])

  selectedBusiness: WritableSignal<SearchByNameResult | undefined> = signal(undefined)
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
    if(currObj[this.MAPPINGS()['business_name']]){
      this.onBusinessChange(currObj[this.MAPPINGS()['business_name']])
    }
  }

  //only on INIT
  attachSelectedOption(){
    let currObj = this.sessionService.currentObject()
    if(currObj[this.MAPPINGS()['business_name']]){
      let found = this.businessResults().find(f=>f.name===currObj[this.MAPPINGS()['business_name']])
      if(found) this.selectedBusiness.set(found)
    }
  }

  prepareSearchDebounce(){
    this.searchSubject.pipe(
      debounceTime(300), // wait 300ms after user stops typing
      distinctUntilChanged(), // only emit if the value has changed
      switchMap((searchData:DebouncedSearch) => {
      if (!searchData || !searchData.query.length) {
        this.businessResults.set([]);
        return of(null);
      }

      this.searchingByType.set(searchData.type);
      if(searchData.type=='name'){
        return this.abnService.searchByName({ name: searchData.query }).pipe(
          catchError((error: HttpErrorResponse) => {
            this.searchingByType.set("");
            this.error.set(GetServerMsgFromHttpError(error));
            return of(null);
          })
        );
      }
      else if(searchData.type==='number'){
        let req: SearchByNumRequest = {
          searchString:searchData.query,
          includeHistoricalDetails:"Y"
        }
          return this.abnService.searchByNumber(req).pipe(
          catchError((error: HttpErrorResponse) => {
            this.searchingByType.set("");
            this.error.set(GetServerMsgFromHttpError(error));
            return of(null);
          })
        );
      }else{
        return of(null);
      }

    })
  ).subscribe({
    next: (results: SearchByNameResult[] | SearchByNumResult[] | null) => {
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
  searchBusinessByNum(){
    this.searchSubject.next({type:'number',query:this.selectedBusiness()?.abn ?? ''});
  }

  onBusinessChange(event:string){
    this.searchSubject.next({type:'name',query:event});
  }

  handlePostSearchResults(results: SearchByNameResult[] | SearchByNumResult[]){
     if (this.searchingByType()==='name') {
        this.businessResults.set(results as SearchByNameResult[]);
        this.attachSelectedOption()
        return
    }
    
    if (this.searchingByType()==='number') {
      let details : SearchByNumResult = results[0] as SearchByNumResult
      let currObj = this.sessionService.currentObject()
      currObj[this.MAPPINGS()['operating_years']] = this.abnService.calculateOperatingYears(details)

      this.sessionService.currentObject.set(currObj)
      this.cd.markForCheck()
      console.log(this.sessionService.currentObject()[this.MAPPINGS()['operating_years']]);
      this.syncFormData()
    }
  }

  onBusinessSelect(){
    let currObj = this.sessionService.currentObject()
    if(this.selectedBusiness()){
      currObj[this.MAPPINGS()['abn']] = this.selectedBusiness()?.abn
      currObj[this.MAPPINGS()['business_name']] = this.selectedBusiness()?.name
      currObj[this.MAPPINGS()['post_code']] = this.selectedBusiness()?.postCode
      currObj[this.MAPPINGS()['state']] = this.selectedBusiness()?.stateCode
      this.searchBusinessByNum()
      return
    }
    
    currObj[this.MAPPINGS()['abn']] = ""
    currObj[this.MAPPINGS()['business_name']] = ""
    currObj[this.MAPPINGS()['operating_years']] = undefined
    this.sessionService.currentObject.set(currObj)
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
