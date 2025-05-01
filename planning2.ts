allGroupedColumns = [
  {
    value: '2024-Q1',
    label: '2024 Q1',
    color: '#e6f7ff',
    children: [
      { label: 'Jan', value: '2024-01' },
      { label: 'Feb', value: '2024-02' },
      { label: 'Mar', value: '2024-03' }
    ]
  },
  {
    value: '2024-Q2',
    label: '2024 Q2',
    color: '#f9f0ff',
    children: [
      { label: 'Apr', value: '2024-04' },
      { label: 'May', value: '2024-05' },
      { label: 'Jun', value: '2024-06' }
    ]
  },
  {
    value: '2024-Q3',
    label: '2024 Q3',
    color: '#fff7e6',
    children: [
      { label: 'Jul', value: '2024-07' },
      { label: 'Aug', value: '2024-08' },
      { label: 'Sep', value: '2024-09' }
    ]
  },
  {
    value: '2024-Q4',
    label: '2024 Q4',
    color: '#f6ffed',
    children: [
      { label: 'Oct', value: '2024-10' },
      { label: 'Nov', value: '2024-11' },
      { label: 'Dec', value: '2024-12' }
    ]
  }
];

selectedQuarter = 'All';
groupedColumns = this.allGroupedColumns; // default to all

filterQuarter(): void {
  const selected = this.allGroupedColumns.find(q => q.value === this.selectedQuarter);
  this.groupedColumns = selected ? [selected] : this.allGroupedColumns;
}
ganttData = this.rawData.map(item => {
  const markers: any = {};
  Object.keys(this.milestoneColors).forEach(key => {
    const date = item[key];
    if (date) {
      const month = date.slice(0, 7); // 'YYYY-MM'
      if (!markers[month]) markers[month] = [];
      markers[month].push({
        milestone: key,
        date,
        color: this.milestoneColors[key]
      });
    }
  });
  return {
    name: item.Name,
    markers
  };
});


<table class="gantt-table">
  <thead>
    <tr>
      <th rowspan="2">Name</th>
      <ng-container *ngFor="let group of allGroupedColumns">
        <th [attr.colspan]="group.children.length">{{ group.label }}</th>
      </ng-container>
    </tr>
    <tr>
      <ng-container *ngFor="let group of allGroupedColumns">
        <th *ngFor="let col of group.children">{{ col.label }}</th>
      </ng-container>
    </tr>
  </thead>
  <tbody>
    <tr *ngFor="let row of ganttData">
      <td>{{ row.name }}</td>
      <ng-container *ngFor="let group of allGroupedColumns">
        <td *ngFor="let col of group.children">
          <div class="gantt-cell">
            <ng-container *ngFor="let marker of row.markers[col.value] || []">
              <div
                class="gantt-marker"
                [ngStyle]="{ 'background-color': marker.color }"
                [title]="marker.milestone + ' | ' + marker.date"
              ></div>
            </ng-container>
          </div>
        </td>
      </ng-container>
    </tr>
  </tbody>
</table>

<nz-select [(ngModel)]="selectedQuarter" (ngModelChange)="filterQuarter()" style="width: 200px;">
  <nz-option nzValue="All" nzLabel="All Quarters"></nz-option>
  <nz-option *ngFor="let q of allGroupedColumns" [nzValue]="q.value" [nzLabel]="q.label"></nz-option>
</nz-select>
.gantt-table {
  border-collapse: collapse;
  width: 100%;
}
.gantt-table th,
.gantt-table td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: center;
}
.gantt-marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 2px auto;
}
.gantt-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 24px;
}

