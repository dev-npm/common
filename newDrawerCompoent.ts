import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { DrawerFormComponent } from '../drawer-form/drawer-form.component';

interface GroupItem {
  id: string | null;
  name: string;
}

interface Group {
  category: string;
  items: GroupItem[];
}

/** Parent component managing grouped form with FormArray */
@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html'
})
export class ParentComponent {
  form: FormGroup;

  constructor(private fb: FormBuilder, private drawerService: NzDrawerService) {
    this.form = this.fb.group({
      groups: this.fb.array([])
    });
  }

  get groups(): FormArray {
    return this.form.get('groups') as FormArray;
  }

  /** Find group by category or create new */
  addOrUpdateGroup(category: string, codes: string[]): void {
    const items = codes.map(code => this.fb.group({ id: null, name: code }));

    const existingIndex = this.groups.controls.findIndex(
      g => g.value.category === category
    );

    if (existingIndex !== -1) {
      const itemsArray = this.groups.at(existingIndex).get('items') as FormArray;
      const existingNames = new Set(itemsArray.controls.map(ctrl => ctrl.value.name));
      codes.forEach(code => {
        if (!existingNames.has(code)) {
          itemsArray.push(this.fb.group({ id: null, name: code }));
        }
      });
    } else {
      this.groups.push(
        this.fb.group({
          category,
          items: this.fb.array(items)
        })
      );
    }
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
      this.addOrUpdateGroup(customerClass, customerCodes);
    });
  }
}
<button nz-button nzType="primary" (click)="openDrawer()">Add Customer</button>

<form [formGroup]="form">
  <nz-collapse>
    <nz-collapse-panel
      *ngFor="let group of groups.controls; let i = index"
      [nzHeader]="group.value.category"
      [nzActive]="true"
    >
      <div [formGroup]="group">
        <div formArrayName="items">
          <nz-list
            [nzData]="group.get('items')!.value"
            [nzRenderItem]="item"
            [nzBordered]="false"
          >
            <ng-template #item let-itemData let-idx="index">
              <nz-list-item>
                <nz-list-item-meta
                  [nzTitle]="itemData.name"
                  [nzDescription]="itemData.id === null ? 'New' : itemData.id"
                ></nz-list-item-meta>
              </nz-list-item>
            </ng-template>
          </nz-list>
        </div>
      </div>
    </nz-collapse-panel>
  </nz-collapse>
</form>
