import { Component } from '@angular/core';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  ganttData = [
    {
      customer: 'IP1',
      releases: [
        { milestone: 'MSDK-A1', release: 'Alpha',   date: '2024-01-08', color: '#1890ff' },
        { milestone: 'MSDK-A2', release: 'Beta',    date: '2024-01-15', color: '#40a9ff' },
        { milestone: 'MSDK-B1', release: 'Gamma',   date: '2024-02-05', color: '#73d13d' },
        { milestone: 'MSDK-B2', release: 'Delta',   date: '2024-02-12', color: '#95de64' },
        { milestone: 'MSDK-B3', release: 'Epsilon', date: '2024-02-22', color: '#b7eb8f' },
        { milestone: 'MSDK-C1', release: 'Zeta',    date: '2024-03-18', color: '#ffc53d' }
      ]
    },
    {
      customer: 'IP2',
      releases: [
        { milestone: 'MSDK-D1', release: 'Eta',     date: '2024-04-03', color: '#eb2f96' },
        { milestone: 'MSDK-D2', release: 'Theta',   date: '2024-05-15', color: '#fa541c' },
        { milestone: 'MSDK-D3', release: 'Iota',    date: '2024-06-10', color: '#fa8c16' }
      ]
    }
  ];

  groupedColumns: any[] = [];

  ngOnInit(): void {
    this.groupedColumns = [
      {
        label: '2024 Q1',
        color: '#e6f7ff',
        children: [
          { label: 'Jan', value: '2024-01' },
          { label: 'Feb', value: '2024-02' },
          { label: 'Mar', value: '2024-03' }
        ]
      },
      {
        label: '2024 Q2',
        color: '#f9f0ff',
        children: [
          { label: 'Apr', value: '2024-04' },
          { label: 'May', value: '2024-05' },
          { label: 'Jun', value: '2024-06' }
        ]
      }
    ];
  }

  getCellData(customer: any, month: string): any[] {
    return customer.releases.filter(r => r.date.startsWith(month));
  }

  formatFullDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}
