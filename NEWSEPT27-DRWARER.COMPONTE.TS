import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzDrawerRef } from 'ng-zorro-antd/drawer';

/** Drawer form to select or create class and enter customer codes */
@Component({
  selector: 'app-drawer-form',
  templateUrl: './drawer-form.component.html'
})
export class DrawerFormComponent implements OnInit {
  form!: FormGroup;

  customerClassOptions: { id: number, name: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private drawerRef: NzDrawerRef,
  ) {
    const params = this.drawerRef.getConfig()?.nzContentParams;
    this.customerClassOptions = params?.customerClassOptions ?? [];
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      classId: [null],
      className: [''],
      customerCodes: ['', Validators.required]
    });

    this.form.get('classId')!.valueChanges.subscribe(id => {
      if (id) {
        const selected = this.customerClassOptions.find(c => c.id === id);
        this.form.get('className')!.setValue(selected?.name || '');
      } else {
        this.form.get('className')!.setValue('');
      }
    });
  }

  cancel(): void {
    this.drawerRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      const { classId, className, customerCodes } = this.form.value;
      const parsedCodes = customerCodes
        .split(',')
        .map(code => code.trim())
        .filter(code => !!code);

      this.drawerRef.close({
        classId: classId || null,
        className: className || null,
        customerCodes: parsedCodes
      });
    }
  }
}
<form [formGroup]="form" (ngSubmit)="submit()">
  <nz-form-item>
    <nz-form-label [nzSpan]="24">Customer Class</nz-form-label>
    <nz-form-control [nzSpan]="24">
      <nz-select
        formControlName="classId"
        nzPlaceHolder="Select existing class or leave blank to add new"
        [nzAllowClear]="true"
        [nzOptions]="customerClassOptions.map(c => ({ label: c.name, value: c.id }))"
      ></nz-select>
    </nz-form-control>
  </nz-form-item>

  <nz-form-item *ngIf="!form.get('classId')?.value">
    <nz-form-label [nzSpan]="24">New Class Name</nz-form-label>
    <nz-form-control [nzSpan]="24">
      <input nz-input formControlName="className" placeholder="Enter new class name" />
    </nz-form-control>
  </nz-form-item>

  <nz-form-item>
    <nz-form-label [nzSpan]="24">Customer Codes (comma-separated)</nz-form-label>
    <nz-form-control [nzSpan]="24">
      <textarea nz-input rows="4" formControlName="customerCodes"></textarea>
    </nz-form-control>
  </nz-form-item>

  <div style="text-align: right;">
    <button nz-button nzType="default" (click)="cancel()" type="button">Cancel</button>
    <button nz-button nzType="primary" [disabled]="form.invalid" type="submit">Submit</button>
  </div>
</form>
,,,

this.drawerService.create<
  { customerClassOptions: { id: number; name: string }[] },
  { classId: number | null; className: string | null; customerCodes: string[] }
>({
  nzTitle: 'Add Customer Codes',
  nzContent: DrawerFormComponent,
  nzWidth: 400,
  nzContentParams: {
    customerClassOptions: this.existingCustomerClasses
  }
});













interface CodeEntry {
  id: number | null;    // id of customer_code (null if new)
  code: string;         // the code value
}

interface CustomerClassGroup {
  classId: number | null;  // id of customer_class (null if new)
  className: string;       // name of customer_class (VIP, Retail)
  codes: CodeEntry[];
}
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { DrawerFormComponent } from '../drawer-form/drawer-form.component';

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html'
})
export class ParentComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private drawerService: NzDrawerService) {
    this.form = this.fb.group({
      customerGroups: this.fb.array([])
    });
  }

  get customerGroups(): FormArray {
    return this.form.get('customerGroups') as FormArray;
  }

  getGroupCodes(group: FormGroup): FormArray {
    return group.get('codes') as FormArray;
  }

  openDrawer(): void {
    const drawerRef = this.drawerService.create<
      void,
      { customerClass: string; customerCodes: string[] }
    >({
      nzTitle: 'Add Customer Codes',
      nzContent: DrawerFormComponent,
      nzWidth: 400
    });

    drawerRef.afterClose.subscribe(result => {
      if (!result) return;

      const { customerClass, customerCodes } = result;

      // Find existing group by className
      const existingGroup = this.customerGroups.controls.find(
        g => g.get('className')?.value === customerClass
      ) as FormGroup | undefined;

      const newCodeControls = customerCodes.map(code =>
        this.fb.group({ id: null, code })
      );

      if (existingGroup) {
        const codesArray = this.getGroupCodes(existingGroup);
        const existingCodes = new Set(codesArray.controls.map(ctrl => ctrl.value.code));
        newCodeControls.forEach(ctrl => {
          if (!existingCodes.has(ctrl.value.code)) {
            codesArray.push(ctrl);
          }
        });
      } else {
        this.customerGroups.push(
          this.fb.group({
            classId: null,                // id of customer_class (null if new)
            className: customerClass,     // name of class
            codes: this.fb.array(newCodeControls)
          })
        );
      }
    });
  }

  saveToBackend(): void {
    const payload = this.form.value.customerGroups.flatMap(group =>
      group.codes.map(code => ({
        class_id: group.classId,
        class_name: group.className,
        code_id: code.id,
        code: code.code
      }))
    );
    console.log('Payload for backend:', payload);
  }
}



<button nz-button nzType="primary" (click)="openDrawer()">Add Customer</button>
<button nz-button nzType="default" (click)="saveToBackend()">Save</button>

<form [formGroup]="form">
  <nz-collapse>
    <nz-collapse-panel
      *ngFor="let group of customerGroups.controls"
      [nzHeader]="group.get('className')?.value"
      [nzActive]="true"
    >
      <div [formGroup]="group">
        <div formArrayName="codes">
          <nz-list
            [nzData]="group.get('codes')?.value"
            [nzRenderItem]="item"
            [nzBordered]="false"
          >
            <ng-template #item let-code>
              <nz-list-item>
                <nz-list-item-meta
                  [nzTitle]="code.code"
                  [nzDescription]="
                    code.id === null
                      ? 'New code (class_id: ' + group.get('classId')?.value + ')'
                      : 'Existing code id: ' + code.id
                  "
                ></nz-list-item-meta>
              </nz-list-item>
            </ng-template>
          </nz-list>
        </div>
      </div>
    </nz-collapse-panel>
  </nz-collapse>
</form>
