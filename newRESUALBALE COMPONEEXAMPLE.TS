import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ReusableEditorComponent } from './reusable-editor.component';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-multi-list-edit',
  templateUrl: './multi-list-edit.component.html'
})
export class MultiListEditComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private modal: NzModalService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      listA: [''],
      listB: [''],
      listC: [''],
      listD: ['']
    });

    this.loadListData().subscribe(data => {
      this.form.patchValue({
        listA: data.listA ?? '',
        listB: data.listB ?? '',
        listC: data.listC ?? '',
        listD: data.listD ?? ''
      });
    });
  }

  loadListData(): Observable<any> {
    return of({
      listA: 'Server A1\nServer A2',
      listB: 'Server B1\nServer B2',
      listC: 'Server C1\nServer C2',
      listD: 'Server D1\nServer D2'
    });
  }

  openEditor(listKey: string): void {
    const currentText = this.form.get(listKey)?.value || '';

    const modalRef = this.modal.create<ReusableEditorComponent>({
      nzTitle: `Edit ${listKey}`,
      nzContent: ReusableEditorComponent,
      nzComponentParams: {
        initialText: currentText
      },
      nzFooter: null
    });

    modalRef.afterClose.subscribe((result: string | undefined) => {
      if (result !== undefined) {
        this.form.get(listKey)?.patchValue(result);
      }
    });
  }

  getLines(value: string): string[] {
    return String(value || '').split('\n').filter(Boolean);
  }
}


<form [formGroup]="form">
  <div class="lists-container">

    <div class="list-wrapper">
      <div class="list-header">
        <h4>List A</h4>
        <button nz-button nzType="link" (click)="openEditor('listA')">Edit</button>
      </div>
      <nz-list [nzDataSource]="getLines(form.get('listA')?.value)" [nzRenderItem]="tplA" nzBordered></nz-list>
      <ng-template #tplA let-line>
        <div class="ant-list-item">{{ line }}</div>
      </ng-template>
    </div>

    <div class="list-wrapper">
      <div class="list-header">
        <h4>List B</h4>
        <button nz-button nzType="link" (click)="openEditor('listB')">Edit</button>
      </div>
      <nz-list [nzDataSource]="getLines(form.get('listB')?.value)" [nzRenderItem]="tplB" nzBordered></nz-list>
      <ng-template #tplB let-line>
        <div class="ant-list-item">{{ line }}</div>
      </ng-template>
    </div>

    <div class="list-wrapper">
      <div class="list-header">
        <h4>List C</h4>
        <button nz-button nzType="link" (click)="openEditor('listC')">Edit</button>
      </div>
      <nz-list [nzDataSource]="getLines(form.get('listC')?.value)" [nzRenderItem]="tplC" nzBordered></nz-list>
      <ng-template #tplC let-line>
        <div class="ant-list-item">{{ line }}</div>
      </ng-template>
    </div>

    <div class="list-wrapper">
      <div class="list-header">
        <h4>List D</h4>
        <button nz-button nzType="link" (click)="openEditor('listD')">Edit</button>
      </div>
      <nz-list [nzDataSource]="getLines(form.get('listD')?.value)" [nzRenderItem]="tplD" nzBordered></nz-list>
      <ng-template #tplD let-line>
        <div class="ant-list-item">{{ line }}</div>
      </ng-template>
    </div>

  </div>
</form>
import { Component, Input, OnInit } from '@angular/core';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-reusable-editor',
  templateUrl: './reusable-editor.component.html'
})
export class ReusableEditorComponent implements OnInit {
  @Input() initialText: string = '';
  form: FormGroup;

  constructor(private fb: FormBuilder, private modal: NzModalRef) {
    this.form = this.fb.group({ commentText: [''] });
  }

  ngOnInit(): void {
    this.form.patchValue({ commentText: this.initialText });
  }

  save(): void {
    this.modal.close(this.form.value.commentText);
  }

  cancel(): void {
    this.modal.destroy();
  }
}


<form [formGroup]="form">
  <textarea formControlName="commentText" rows="8" style="width: 100%; height: 220px;"></textarea>
  <div style="text-align: right; margin-top: 12px;">
    <button nz-button (click)="cancel()">Cancel</button>
    <button nz-button nzType="primary" (click)="save()" style="margin-left: 8px;">Save</button>
  </div>
</form>


.lists-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.list-wrapper {
  flex: 1 0 220px;
  max-width: 250px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
