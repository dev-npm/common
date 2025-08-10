import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface Customer {
  id: number;
  name: string;
  // optional: presetConfigId?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  getCustomers(): Observable<Customer[]> {
    // Simulate async API; includes the special "Customize" row
    return of([
      { id: 55, name: 'Customize' },
      { id: 1,  name: 'Acme' },
      { id: 2,  name: 'Globex' },
      { id: 3,  name: 'Initech' },
      { id: 4,  name: 'Umbrella' },
    ]).pipe(delay(150));
  }
}


import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Customer, CustomerService } from './customer.service';
import { startWith } from 'rxjs/operators';

@Component({
  selector: 'app-customer-picker',
  templateUrl: './customer-picker.component.html'
})
export class CustomerPickerComponent implements OnInit {
  form: FormGroup;

  customers: Customer[] = [];
  customersById = new Map<number, Customer>();

  // Baseline choices = all except "Customize"
  baselineChoices: Customer[] = [];

  // UI flag
  showBaseline = false;

  constructor(
    private fb: FormBuilder,
    private api: CustomerService
  ) {
    this.form = this.fb.group({
      selectedCustomers: [[] as number[]],         // main multi-select (IDs)
      baselineCustomer: [null as number | null],   // single select (ID)
    });
  }

  ngOnInit(): void {
    // Load data
    this.api.getCustomers().subscribe(list => {
      this.customers = list;
      this.customersById = new Map(list.map(c => [c.id, c]));
      this.baselineChoices = list.filter(c => !this.isCustomize(c.name));

      // Wire up baseline persistence AFTER data is present
      this.setupBaselinePersistence();
    });
  }

  /** Case-insensitive name check for "Customize" */
  private isCustomize(name: string | undefined | null): boolean {
    return (name ?? '').trim().toLowerCase() === 'customize';
  }

  /** True if any selected ID corresponds to the "Customize" row (by name) */
  private hasCustomizeSelected(ids: number[] | null | undefined): boolean {
    if (!Array.isArray(ids)) return false;
    for (const id of ids) {
      const c = this.customersById.get(id);
      if (c && this.isCustomize(c.name)) return true;
    }
    return false;
  }

  /** Keep baseline as-is, clear only when Customize is removed */
  private setupBaselinePersistence(): void {
    const selectedCtrl = this.form.get('selectedCustomers')!;
    const baselineCtrl = this.form.get('baselineCustomer')!;

    selectedCtrl.valueChanges
      .pipe(startWith(selectedCtrl.value as number[] | undefined))
      .subscribe((ids: number[] = []) => {
        const hasCustomize = this.hasCustomizeSelected(ids);
        this.showBaseline = hasCustomize;

        // Clear baseline ONLY when Customize is no longer selected
        if (!hasCustomize && baselineCtrl.value !== null) {
          baselineCtrl.patchValue(null, { emitEvent: false });
        }
      });
  }

  /** Options for main multi-select:
   *  - Always keep "Customize"
   *  - Hide already-selected non-Customize customers
   */
  get filteredCustomers(): Customer[] {
    const selectedIds: number[] = this.form.get('selectedCustomers')?.value ?? [];
    const selected = new Set<number>(selectedIds);

    return this.customers.filter(c =>
      this.isCustomize(c.name) || !selected.has(c.id)
    );
  }

  trackById = (_: number, item: Customer) => item.id;

  submit(): void {
    console.log('FORM:', this.form.value);
    // POST to API, etc.
  }
}



<nz-form-item>
  <nz-form-label [nzSpan]="6">Customers</nz-form-label>
  <nz-form-control [nzSpan]="18">
    <nz-select
      formControlName="selectedCustomers"
      nzMode="multiple"
      nzAllowClear
      nzPlaceHolder="Select customers"
      style="width: 360px">
      <nz-option
        *ngFor="let c of filteredCustomers; trackBy: trackById"
        [nzLabel]="c.name"
        [nzValue]="c.id">
      </nz-option>
    </nz-select>
    <div class="hint">“Customize” is always available; other picks disappear once selected.</div>
  </nz-form-control>
</nz-form-item>

<nz-form-item *ngIf="showBaseline">
  <nz-form-label [nzSpan]="6">Baseline</nz-form-label>
  <nz-form-control [nzSpan]="18">
    <nz-select
      formControlName="baselineCustomer"
      nzPlaceHolder="Select a baseline customer"
      style="width: 360px">
      <nz-option
        *ngFor="let c of baselineChoices; trackBy: trackById"
        [nzLabel]="c.name"
        [nzValue]="c.id">
      </nz-option>
    </nz-select>
    <div class="hint">Baseline persists while Customize is selected; it clears if you remove Customize.</div>
  </nz-form-control>
</nz-form-item>

<button nz-button nzType="primary" (click)="submit()">Save</button>

<!-- Debug preview (optional) -->
<pre>{{ form.value | json }}</pre>
