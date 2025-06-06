import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal, ViewEncapsulation, WritableSignal } from '@angular/core';
import { GetShadowHost, GetShadowRoot } from './shared/utils/dom';
import { CoreService } from './services/core.service';
import { PatchService } from './patch/patch.service';
import { InputTextModule } from 'primeng/inputtext';
import { AddressFormComponent } from './form/form.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { Observable, catchError, map, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AppConfig } from './types/config';

@Component({
  selector: 'expro-custom-address',
  imports: [InputTextModule,AddressFormComponent,AsyncPipe],
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
})


export class AppComponent implements OnInit,OnDestroy{
  
  @Input() set transaction(data:string){
    if(data) {
      try{
        this.currentTransaction = JSON.parse(data)
        console.log("Current Injected Txn",this.currentTransaction);
        // this.handleTxnInjection()
      }catch(e){
        let msg = `<strong class="text-danger">Invalid transaction JSON injected. Please check.
        Error Caught: ${(e as Error).message}</strong>`
        this.appLoadError.set(msg)
      }
     }
  }
  @Input() set readonly(boolean:string){
    this.isReadonly = boolean==="true"
  }

  @Input() set appConfig(conf:string){
    this.config = JSON.parse(conf)
  }

  @Output() parentAppData: EventEmitter<any> = new EventEmitter();

   
  coreService = inject(CoreService);
  patchService = inject(PatchService);
  
  currentTransaction : Record<string,any> = {}
  isReadonly: boolean = false
  config: AppConfig | undefined 

  appLoadError : WritableSignal<string | undefined> = signal(undefined)

  APPEND_TO_ELEM_ID = 'shadow-append-to';

  apiLoaded : Observable<boolean> 

  constructor(httpClient: HttpClient) {
    this.coreService.registerComponent(this, 'App');
    
    if(!this.coreService.mapLoaded){
      const mapUrl = new URL(environment.googlemaps.bundle)
      mapUrl.searchParams.append("key",environment.googlemaps.token)
      mapUrl.searchParams.append("libraries","places")


      this.apiLoaded = httpClient.jsonp(mapUrl.toString(), 'callback')
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
      );
    }else{
      this.apiLoaded = of(true)
    }

  }

  initAlready = false
  ngOnInit(): void {
    this.initAlready = true
    console.log('ExPro Custom Address Root Component Init');
  
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
  }



}
