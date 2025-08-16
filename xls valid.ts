import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-excel-link-form',
  templateUrl: './excel-link-form.component.html'
})
export class ExcelLinkFormComponent {
  form = this.fb.group({
    excelUrl: ['', [Validators.required, this.excelSharepointUrlValidator]]
  });

  constructor(private fb: FormBuilder) {}

  excelSharepointUrlValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value || '').trim();
    if (!value) return null; // let "required" handle empty

    try {
      const url = new URL(value);
      const filename = decodeURIComponent(url.pathname.split('/').pop() || '');
      return /\.xlsx?(?=$|[?#])/i.test(filename) ? null : { notExcel: true };
    } catch {
      return { url: true }; // not a valid URL
    }
  }

  submit() {
    if (this.form.valid) {
      console.log('✅ Valid Excel SharePoint link:', this.form.value.excelUrl);
    } else {
      console.log('❌ Invalid form');
    }
  }
}
<form nz-form [formGroup]="form" (ngSubmit)="submit()">
  <nz-form-item>
    <nz-form-label [nzSpan]="6" nzRequired>Excel Link</nz-form-label>
    <nz-form-control
      [nzSpan]="18"
      [nzValidateStatus]="form.get('excelUrl')"
      [nzErrorTip]="errorTpl">
      <input nz-input placeholder="Paste SharePoint Excel link" formControlName="excelUrl" />
    </nz-form-control>
  </nz-form-item>

  <button nz-button nzType="primary" [disabled]="form.invalid">Submit</button>
</form>

<ng-template #errorTpl let-control>
  <ng-container *ngIf="control.hasError('required')">
    This field is required.
  </ng-container>
  <ng-container *ngIf="control.hasError('url')">
    Please enter a valid URL.
  </ng-container>
  <ng-container *ngIf="control.hasError('notExcel')">
    Link must point to a .xls or .xlsx file.
  </ng-container>
</ng-template>
