import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, inject, Input, isDevMode, OnDestroy, OnInit, Output, signal, ViewEncapsulation, WritableSignal } from '@angular/core';
import { GetShadowHost, GetShadowRoot } from './shared/utils/dom';
import { CoreService } from './services/core.service';
import { PatchService } from './patch/patch.service';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { Observable, catchError, map, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { SafeJsonParse } from './shared/utils/json';
import { REQUIRES_MAP_JS, SessionService } from './services/session.service';
import { AppLoadError } from './types/app';
import { CustomAppContext, DefaultAppContext } from './types/input';
import { AddressComponent } from './form/address/address.component';
import { AbnComponent } from './form/abn/abn.component';
import { VehicleComponent } from "./form/vehicle/vehicle.component";

@Component({
  selector: 'expro-custom-control',
  imports: [InputTextModule, AddressComponent, AbnComponent,
    AsyncPipe, VehicleComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  styleUrls: [
    './app.component.scss', //host itself
    //import styles from asset to apply on root of shadow dom
    '../../node_modules/primeicons/primeicons.css',

    '../../src/styles.scss',
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [CoreService,SessionService]
})


export class AppComponent implements OnInit,OnDestroy{
  
  //readonly transaction data passed from parent app
  //custom app ctx attribute (HTML attribute will be: default-context)
  //first invocation of the app will be stringified data, but subsequent updates might be an object
  @Input() set defaultContext(data:DefaultAppContext){
    if(typeof data ==='string'){
      let [parsedCtx,errorMsg] = SafeJsonParse(data)
      if(!errorMsg.length) data = parsedCtx
      else this.appLoadError.set(new AppLoadError("Invalid custom context injected",`Error Caught: ${errorMsg}`))
    }

    this.sessionService.setDefaultContext(data)
  }

  //custom app ctx attribute (HTML attribute will be: custom-context)
  //use this for any custom data you need for this control
  @Input() set customContext(ctx:string){
    let [parsedCtx,errorMsg] = SafeJsonParse(ctx)
    if(!errorMsg.length){
        this.sessionService.setCustomContext(parsedCtx)
    }else{
        this.appLoadError.set(new AppLoadError("Invalid custom context injected",`Error Caught: ${errorMsg}`))
    }
  }

  //expro app output event for updated form object
  @Output() parentAppData: EventEmitter<any> = new EventEmitter();

   
  httpClient: HttpClient = inject(HttpClient)
  coreService = inject(CoreService);
  patchService = inject(PatchService);
  sessionService = inject(SessionService);

  appLoadError : WritableSignal<AppLoadError | undefined> = signal(undefined)

  APPEND_TO_ELEM_ID = 'shadow-append-to';
  apiLoaded! : Observable<boolean> 

  constructor() {
      this.coreService.registerComponent(this, 'App');
    }

  ngOnInit(): void {
    console.log('ExPro custom address control has been initialized.');  
    if(isDevMode()) this.attachDevContext()
    this.safeLoadMaps()
  }

  attachDevContext(){
    let ctx : CustomAppContext = {
      googlemaps:  environment.googlemaps,
      abn: environment.abn,
      insuremo: environment.insuremo,
      places: environment.places,
      vehicle: environment.vehicle
    }
    this.sessionService.setCustomContext(ctx)
  }

  safeLoadMaps(){
    if(!REQUIRES_MAP_JS.includes(this.sessionService.currentObjectKey())) return
    
    if(this.coreService.mapLoaded){
       this.apiLoaded  = of(true)
       return
    }
   
    //check if script already loaded in previous app injection
    if(this.coreService.checkScriptExists("places_impl.js")){
      this.coreService.mapLoaded = true
      this.apiLoaded  = of(true)
      return 
    }

    try{
      const mapUrl = new URL(this.sessionService.customAppContext()?.googlemaps?.bundle ?? "")
      mapUrl.searchParams.append("key",this.sessionService.customAppContext()?.googlemaps.token ?? '')

      mapUrl.searchParams.append("libraries","places")

      this.apiLoaded = this.httpClient.jsonp(mapUrl.toString(), 'callback')
      .pipe(
        map(() => {
          this.coreService.mapLoaded = true
          return true
        }),
        catchError((error:any) => {
          this.coreService.mapLoaded = false
          console.log('error loading maps',error);
          return of(false)
        }),
      )
    }
    catch(e){
      this.apiLoaded = of(false)
      return
    }
    return 
  }


  registerFont(){
    let style = document.createElement('style')
    style.innerHTML =   `
    @font-face {
    font-family: 'primeicons';
    font-display: block;
    src: url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.eot');
    src: url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.eot?#iefix') format('embedded-opentype'), url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.woff2') format('woff2'), url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.woff') format('woff'), url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.ttf') format('truetype'), url('https://insuremolearnstore.blob.core.windows.net/product-viewer/primeicons.svg?#primeicons') format('svg');
    font-weight: normal;
    font-style: normal;
  }`
  GetShadowHost()?.appendChild(style)
 }

  ngAfterViewInit(): void {
    this.patchService.setTheme();
    this.registerFont()
    this.coreService.appendTo = GetShadowRoot()?.getElementById(this.APPEND_TO_ELEM_ID) ?? null;
  }

  ngOnDestroy() {
    console.log('ExPro Custom Address Root Component Destroyed');
    this.coreService.reset();
    this.patchService.reset();
    this.sessionService.reset()
  }



}
