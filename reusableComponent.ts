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
    this.form = this.fb.group({
      commentText: ['']
    });
  }

  ngOnInit(): void {
    this.form.patchValue({ commentText: this.initialText || '' });
  }

  save(): void {
    const text = this.form.value.commentText;
    this.modal.close(text); // return to parent
  }

  cancel(): void {
    this.modal.destroy(); // don't return value
  }
}


<form [formGroup]="form">
  <textarea formControlName="commentText" rows="6" style="width: 100%;"></textarea>

  <div style="text-align: right; margin-top: 12px;">
    <button nz-button (click)="cancel()">Cancel</button>
    <button nz-button nzType="primary" (click)="save()" style="margin-left: 8px;">Save</button>
  </div>
</form>


**********parent 
import { Component } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ReusableEditorComponent } from './reusable-editor.component';

@Component({
  selector: 'app-parent',
  templateUrl: './parent.component.html'
})
export class ParentComponent {
  savedText: string = '';

  constructor(private modal: NzModalService) {}

  openEditor(): void {
    const modalRef = this.modal.create<ReusableEditorComponent>({
      nzTitle: 'Edit Content',
      nzContent: ReusableEditorComponent,
      nzComponentParams: {
        initialText: this.savedText
      },
      nzFooter: null
    });

    modalRef.afterClose.subscribe((result: string | undefined) => {
      if (result !== undefined) {
        this.savedText = result;
        console.log('Updated text:', result);
      }
    });
  }
}

