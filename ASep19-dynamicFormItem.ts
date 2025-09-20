<form nz-form [formGroup]="validateForm" (ngSubmit)="submitForm()" style="max-width: 600px;">
  <ng-container *ngFor="let item of listOfControl">
    <nz-form-item>
      <nz-form-label [nzSpan]="4" nzRequired>Label + URL</nz-form-label>
      <nz-form-control [nzSpan]="18">
        <nz-input-group nzCompact>
          <input type="text" nz-input [formControlName]="item.labelControl" placeholder="Label" style="width: 30%;" />
          <input type="text" nz-input [formControlName]="item.urlControl" placeholder="URL" style="width: 70%;" />
        </nz-input-group>
      </nz-form-control>
      <nz-form-control [nzSpan]="2">
        <button nz-button nzType="link" (click)="removeField(item, $event)" [disabled]="listOfControl.length === 1">Remove</button>
      </nz-form-control>
    </nz-form-item>
  </ng-container>

  <nz-form-item>
    <nz-form-control [nzSpan]="24">
      <button nz-button nzType="dashed" (click)="addField($event)" style="width: 100%;">Add field</button>
    </nz-form-control>
  </nz-form-item>

  <nz-form-item>
    <nz-form-control [nzSpan]="24">
      <button nz-button nzType="primary" [disabled]="!validateForm.valid">Submit</button>
    </nz-form-control>
  </nz-form-item>
</form>
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormRecord, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface LabelUrl {
  id?: number;
  label: string;
  url: string;
}

@Component({
  selector: 'app-dynamic-input-group',
  templateUrl: './dynamic-input-group.component.html'
})
export class DynamicInputGroupComponent implements OnInit {
  validateForm: FormRecord<FormControl<string>> = this.fb.record({});
  listOfControl: Array<{ id: number; labelControl: string; urlControl: string; dbId?: number }> = [];
  deletedIds: number[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFormData();
  }

  loadFormData(): void {
    // Example: edit mode - replace with actual API call
    const incomingData: LabelUrl[] = [
      { id: 1, label: 'Google', url: 'https://google.com' },
      { id: 2, label: 'GitHub', url: 'https://github.com' }
    ];

    if (incomingData.length > 0) {
      incomingData.forEach((item, index) => {
        const id = index;
        const labelControl = `label${id}`;
        const urlControl = `url${id}`;
        this.listOfControl.push({ id, labelControl, urlControl, dbId: item.id });
        this.validateForm.addControl(labelControl, this.fb.control(item.label, Validators.required));
        this.validateForm.addControl(urlControl, this.fb.control(item.url, [Validators.required, Validators.pattern(/^https?:\/\//)]));
      });
    } else {
      this.addField();
    }
  }

  addField(e?: MouseEvent): void {
    e?.preventDefault();
    const id = this.listOfControl.length > 0 ? this.listOfControl[this.listOfControl.length - 1].id + 1 : 0;
    const labelControl = `label${id}`;
    const urlControl = `url${id}`;
    this.listOfControl.push({ id, labelControl, urlControl });
    this.validateForm.addControl(labelControl, this.fb.control('', Validators.required));
    this.validateForm.addControl(urlControl, this.fb.control('', [Validators.required, Validators.pattern(/^https?:\/\//)]));
  }

  removeField(item: { id: number; labelControl: string; urlControl: string; dbId?: number }, e: MouseEvent): void {
    e.preventDefault();
    const index = this.listOfControl.indexOf(item);
    if (index > -1) {
      this.listOfControl.splice(index, 1);
      this.validateForm.removeControl(item.labelControl);
      this.validateForm.removeControl(item.urlControl);
      if (item.dbId) {
        this.deletedIds.push(item.dbId);
      }
    }
  }

  submitForm(): void {
    if (this.validateForm.valid) {
      const add: LabelUrl[] = [];
      const update: LabelUrl[] = [];

      for (const item of this.listOfControl) {
        const label = this.validateForm.get(item.labelControl)?.value || '';
        const url = this.validateForm.get(item.urlControl)?.value || '';

        if (item.dbId) {
          update.push({ id: item.dbId, label, url });
        } else {
          add.push({ label, url });
        }
      }

      const payload = {
        add,
        update,
        delete: this.deletedIds
      };

      console.log('Submit Payload:', payload);

      // POST to .NET Core API
      this.http.post('/api/labelurl/save', payload).subscribe(res => {
        console.log('Saved', res);
      });
    } else {
      Object.values(this.validateForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}



[HttpPost("save")]
public IActionResult SaveLabelUrls([FromBody] LabelUrlBatchDto data)
{
    foreach (var id in data.Delete)
    {
        _db.LabelUrls.Remove(new LabelUrl { Id = id });
    }

    foreach (var item in data.Add)
    {
        _db.LabelUrls.Add(new LabelUrl { Label = item.Label, Url = item.Url });
    }

    foreach (var item in data.Update)
    {
        var existing = _db.LabelUrls.FirstOrDefault(x => x.Id == item.Id);
        if (existing != null)
        {
            existing.Label = item.Label;
            existing.Url = item.Url;
        }
    }

    _db.SaveChanges();
    return Ok();
}

public class LabelUrlBatchDto
{
    public List<LabelUrl> Add { get; set; }
    public List<LabelUrl> Update { get; set; }
    public List<int> Delete { get; set; }
}
