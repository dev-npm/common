import { NgModule, APP_INITIALIZER, Injectable, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en-US';
import { NzI18nService, en_US } from 'ng-zorro-antd/i18n';
import { AppComponent } from './app.component';

// Register Angular's locale data
registerLocaleData(localeEn);

// Configuration service within the module
@Injectable({ providedIn: 'root' })
export class ZorroLocaleInitializer {
  constructor(private i18n: NzI18nService) {}

  initialize() {
    this.i18n.setLocale({
      ...en_US,
      DatePicker: {
        ...en_US.DatePicker,
        weekStart: 0, // 0 = Sunday, 1 = Monday
        weekFormat: 'ww',
        yearFormat: 'yyyy',
        weekYearFormat: 'yyyy'
      }
    });
  }
}

// Factory function for APP_INITIALIZER
export function initializeZorroLocale(initializer: ZorroLocaleInitializer) {
  return () => initializer.initialize();
}

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [
    // Set Angular's default locale
    { provide: LOCALE_ID, useValue: 'en-US' },
    
    // Configure ng-zorro locale globally
    {
      provide: APP_INITIALIZER,
      useFactory: initializeZorroLocale,
      deps: [ZorroLocaleInitializer],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
