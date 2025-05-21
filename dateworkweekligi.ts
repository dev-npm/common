// src/app/helpers/custom-date-helper.ts
import { Injectable } from '@angular/core';
import { DateHelperByDateFns } from 'ng-zorro-antd/i18n';

/**
 * Custom Date Helper to calculate Work Week starting Jan 1 as Week 1,
 * and incrementing every 7 days, no ISO 8601 logic.
 */
@Injectable()
export class CustomDateHelper extends DateHelperByDateFns {
  override getISOWeek(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diffInDays = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(diffInDays / 7) + 1;
  }
}

// app.module.ts
import { NgModule } from '@angular/core';
import { NZ_DATE_HELPER_SERVICE, DateHelperByDateFns } from 'ng-zorro-antd/i18n';
import { CustomDateHelper } from './helpers/custom-date-helper';

@NgModule({
  providers: [
    { provide: NZ_DATE_HELPER_SERVICE, useClass: CustomDateHelper }
  ]
})
export class AppModule {}
import { NZ_DATE_CONFIG } from 'ng-zorro-antd/i18n';

@NgModule({
  providers: [
    { provide: NZ_DATE_CONFIG, useValue: { firstDayOfWeek: 0 } }
  ]
})
