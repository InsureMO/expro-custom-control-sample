import { bootstrapApplication, createApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';
import { createCustomElement} from '@angular/elements';


const APP_COMPONENT_TAG = "expro-custom-control"

if (isDevMode()) {
  bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
}
else{
  createApplication(appConfig).then((appRef) => {
    const appCompWrapper = createCustomElement(
      AppComponent, 
      { injector: appRef.injector} 
    );
    
    customElements.define(APP_COMPONENT_TAG, appCompWrapper)
  })
}