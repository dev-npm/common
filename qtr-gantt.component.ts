import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-gantt',
  templateUrl: './gantt.component.html',
  styleUrls: ['./gantt.component.scss']
})
export class GanttComponent implements OnInit {
  currentStartYear = 2024;
  displayYears = 3;

  customers = [
    {
      customerName: 'Customer A',
      milestones: [
        { type: 'Early', date: '2024-03-05' },
        { type: 'Final', date: '2024-10-01' },
        { type: 'Review', date: '2025-02-12' }
      ]
    },
    {
      customerName: 'Customer B',
      milestones: [
        { type: 'Review', date: '2024-04-18' },
        { type: 'Early', date: '2025-09-22' },
        { type: 'Final', date: '2026-06-30' }
      ]
    }
  ];

  years: { label: string; quarters: string[] }[] = [];

  ngOnInit(): void {
    this.generateYears();
  }

  generateYears() {
    this.years = [];
    for (let y = 0; y < this.displayYears; y++) {
      const year = this.currentStartYear + y;
      this.years.push({ label: year.toString(), quarters: ['Q1', 'Q2', 'Q3', 'Q4'] });
    }
  }

  goBack() {
    this.currentStartYear--;
    this.generateYears();
  }

  goForward() {
    this.currentStartYear++;
    this.generateYears();
  }

  getYear(dateStr: string): string {
    return new Date(dateStr).getFullYear().toString();
  }

  getQuarter(dateStr: string): string {
    const month = new Date(dateStr).getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  }

  getMarkers(row: any, year: string, quarter: string) {
    return (row.milestones || []).filter(m => {
      return this.getYear(m.date) === year && this.getQuarter(m.date) === quarter;
    });
  }

  getColor(type: string): string {
    switch (type) {
      case 'Early': return '#1890ff';
      case 'Final': return '#52c41a';
      case 'Review': return '#fa8c16';
      default: return '#bfbfbf';
    }
  }
}