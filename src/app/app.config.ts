import { ApplicationConfig,provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideHttpClient, withJsonpSupport } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { PatchService } from './patch/patch.service';
import { ThemeConfig } from '../theme/config';


export const appConfig: ApplicationConfig = {
  
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideHttpClient(withJsonpSupport()), //withJsonpSupport for google maps js
    PatchService, //ensure prime ng providers are imported after patch service
    MessageService,
    providePrimeNG({
      theme: ThemeConfig
    }      
    ),
  ]
};
