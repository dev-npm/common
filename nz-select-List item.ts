<nz-list
  [nzDataSource]="items"
  [nzRenderItem]="item"
  [nzBordered]="true"
  class="selectable-list"
></nz-list>

<ng-template #item let-item>
  <nz-list-item
    [ngClass]="{ 'selected-item': isSelected(item) }"
    (click)="toggleSelection(item)"
  >
    {{ item.name }}
  </nz-list-item>
</ng-template>
export class MyComponent {
  items = [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Beta' },
    { id: 3, name: 'Gamma' }
  ];

  selectedItems: any[] = [];

  isSelected(item: any): boolean {
    return this.selectedItems.some(i => i.id === item.id);
  }

  toggleSelection(item: any): void {
    const idx = this.selectedItems.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.selectedItems.splice(idx, 1);
    } else {
      this.selectedItems.push(item);
    }
  }
}
.selectable-list .ant-list-item {
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.selectable-list .ant-list-item.selected-item {
  background-color: #f0f0f0;
}


.selectable-list .ant-list-item {
  cursor: pointer;
  transition: background-color 0.3s ease;
  padding: 6px 12px !important;  /* reduce vertical space */
  line-height: 20px !important;
  font-size: 13px;
}
.selectable-list .ant-list-item.selected-item {
  background-color: #f0f0f0;
}
