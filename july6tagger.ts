<div style="max-width: 400px; margin: 20px auto;">
  <nz-input-group [nzSuffix]="addBtn">
    <textarea
      nz-input
      [(ngModel)]="inputValue"
      (keydown.enter)="addItem()"
      rows="2"
    ></textarea>
  </nz-input-group>

  <ng-template #addBtn>
    <button nz-button nzType="primary" (click)="addItem()">Add</button>
  </ng-template>

  <div style="margin-top: 12px;">
    <div *ngFor="let item of items" style="margin-bottom: 6px;">
      <nz-tag [nzMode]="'closeable'" (nzOnClose)="removeItem(item)">
        {{ item }}
      </nz-tag>
    </div>
  </div>
</div>

        import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  inputValue = '';
  items: string[] = [];

  addItem(): void {
    const rawItems = this.inputValue.split(',');
    const newItems = rawItems
      .map((item) => item.trim())
      .filter((item) => item && !this.items.includes(item));

    this.items.push(...newItems);
    this.inputValue = '';
  }

  removeItem(tag: string): void {
    this.items = this.items.filter((i) => i !== tag);
  }
}

