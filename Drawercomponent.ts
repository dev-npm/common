// drawer-form.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzDrawerRef } from 'ng-zorro-antd/drawer';

/** Drawer form content — emits result via close */
@Component({
  selector: 'app-drawer-form',
  templateUrl: './drawer-form.component.html'
})
export class DrawerFormComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private drawerRef: NzDrawerRef<{ customerClass: string; customerCodes: string[] }>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerClass: ['', Validators.required],
      customerCodes: ['', Validators.required]
    });
  }

  cancel(): void {
    this.drawerRef.close();  // close returns undefined
  }

  submit(): void {
    if (this.form.valid) {
      const { customerClass, customerCodes } = this.form.value;
      const parsedCodes = customerCodes
        .split(',')
        .map(code => code.trim())
        .filter(code => code);
      this.drawerRef.close({ customerClass, customerCodes: parsedCodes });
    }
  }
}

<!-- drawer-form.component.html -->
<form [formGroup]="form" (ngSubmit)="submit()">
  <nz-form-item>
    <nz-form-label [nzSpan]="24">Customer Class</nz-form-label>
    <nz-form-control [nzSpan]="24">
      <input nz-input formControlName="customerClass" />
    </nz-form-control>
  </nz-form-item>

  <nz-form-item>
    <nz-form-label [nzSpan]="24">Customer Codes (comma‑separated)</nz-form-label>
    <nz-form-control [nzSpan]="24">
      <textarea nz-input formControlName="customerCodes" rows="4"></textarea>
    </nz-form-control>
  </nz-form-item>

  <div style="text-align: right;">
    <button nz-button nzType="default" (click)="cancel()" type="button">Cancel</button>
    <button nz-button nzType="primary" [disabled]="form.invalid" type="submit">Submit</button>
  </div>
</form>
// parent.component.ts
import { Component } from '@angular/core';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { DrawerFormComponent } from '../drawer-form/drawer-form.component';

interface CustomerEntry {
  class: string;
  codes: string[];
}

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html'
})
export class ParentComponent {
  customerData: CustomerEntry[] = [];

  constructor(private drawerService: NzDrawerService) {}

  openDrawer(): void {
    const drawerRef = this.drawerService.create<
      { customerClass: string; customerCodes: string[] },
      any
    >({
      nzTitle: 'Add Customer Codes',
      nzContent: DrawerFormComponent,
      nzWidth: 400,
      // you can pass params via nzContentParams if needed
      // nzContentParams: { ... }
    });

    drawerRef.afterClose.subscribe(result => {
      if (result && result.customerClass && Array.isArray(result.customerCodes)) {
        this.customerData.push({
          class: result.customerClass,
          codes: result.customerCodes
        });
      }
    });
  }
}


<!-- parent.component.html -->
<button nz-button nzType="primary" (click)="openDrawer()">Add Customer</button>

<nz-list [nzDataSource]="customerData" [nzRenderItem]="item">
  <ng-template #item let-data>
    <nz-list-item>
      <nz-list-item-meta
        [nzTitle]="data.class"
        [nzDescription]="data.codes.join(', ')">
      </nz-list-item-meta>
    </nz-list-item>

  
  </ng-template>
</nz-list>

  *****************88


<nz-collapse>
  <nz-collapse-panel
    *ngFor="let group of groupedItems"
    [nzHeader]="group.category"
    [nzActive]="true"
  >
    <nz-list
      [nzData]="group.items"
      [nzRenderItem]="item"
      [nzBordered]="false"
    >
      <ng-template #item let-item>
        <nz-list-item>
          <nz-list-item-meta
            [nzTitle]="item.name"
            [nzDescription]="item.access"
          ></nz-list-item-meta>
          <div>{{ item.type }}</div>
        </nz-list-item>
      </ng-template>
    </nz-list>

    <!-- Input + Add New Button -->
    <div style="margin-top: 8px; display: flex; gap: 8px;">
      <input
        nz-input
        [(ngModel)]="group.newItem"
        placeholder="Add new permission"
        style="flex: 1"
      />
      <button
        nz-button
        nzType="primary"
        (click)="addItemToGroup(group)"
      >
        Add
      </button>
    </div>
  </nz-collapse-panel>
</nz-collapse>


