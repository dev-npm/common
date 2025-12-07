import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { GridSettings } from '@handsontable/angular-wrapper';
import { HotTableComponent } from '@handsontable/angular-wrapper';
import { registerAllModules } from 'handsontable/registry';
import { ApiService, ApiResponse } from './api.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Register all Handsontable modules
registerAllModules();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'Handsontable with Nested Headers';

  @ViewChild(HotTableComponent, { static: false })
  hotTableComponent!: HotTableComponent;

  constructor(private apiService: ApiService) {}

  // Separate data from settings - this is how the new angular-wrapper expects it
 
  ];

  // Grid settings without data - data is passed separately
  // nestedHeaders and columns will be built dynamically from API response
  gridSettings: GridSettings = {
    licenseKey: 'non-commercial-and-evaluation',
    rowHeaders: true,
    height: 500,
    stretchH: 'all',
    contextMenu: true,
    dropdownMenu: [
      'filter_by_condition', // Filter by conditions (equals, contains, etc.)
      'filter_by_value', // Filter by checkbox values
      'filter_action_bar', // Clear filter button
    ], // Use true to get all menu items including filters
    filters: true,
    manualColumnResize: true,
    manualRowResize: true,
    colHeaders: true,
  };

  // Legend data separate from settings
  legendData: any[][] = [
    ['D', 'Distilled Account'],
    ['I', 'Interest account'],
  ];

  legendSettings: GridSettings = {
    licenseKey: 'non-commercial-and-evaluation',
    colHeaders: ['', 'Legend'],
    columns: [
      { data: 0, width: 50, readOnly: true },
      { data: 1, width: 200, readOnly: true },
    ],
    rowHeaders: false,
    height: 100,
    stretchH: 'none',
    contextMenu: false,
    className: 'legend-table',
  };

  ngOnInit() {
    this.apiService.getData().subscribe((response: ApiResponse) => {
      // Build everything FIRST
      const builtNestedHeaders = this.buildNestedHeaders(response);
      const builtColumns = this.buildColumns(response);

      // Then assign ALL AT ONCE with filters enabled
      this.gridSettings = {
        ...this.gridSettings,
        nestedHeaders: builtNestedHeaders,
        columns: builtColumns,
        colHeaders: true,
        dropdownMenu: [
          'filter_by_condition', // Filter by conditions (equals, contains, etc.)
          'filter_by_value', // Filter by checkbox values
          'filter_action_bar', // Clear filter button
        ], // Use true to get all menu items including filters
        filters: true,
        afterRender: (isForced: boolean) => {
          // Apply colors after each render using requestAnimationFrame
          // This ensures the browser has painted the DOM before we apply colors
          requestAnimationFrame(() => {
            this.applyFirstHeaderColors();
          });
        },
        afterScrollHorizontally: () => {
          // Also apply after horizontal scroll to catch recreated clones
          requestAnimationFrame(() => {
            this.applyFirstHeaderColors();
          });
        },
      };
      this.gridData = response.data;

      console.log('Grid data:', this.gridData);
      console.log('Grid settings:', this.gridSettings);
    });
  }

  buildNestedHeaders(response: ApiResponse): any[] {
    // Build nested headers from API response
    // You can add custom logic here to transform the response
    return response.nestedHeaders;
  }

  buildColumns(response: ApiResponse): any[] {
    // Build columns from API response
    // You can add custom logic here to transform the response
    return response.columns;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const hotInstance = this.hotTableComponent?.hotInstance;
      if (hotInstance) {
        console.log('Handsontable instance:', hotInstance);

        // Force enable and render the dropdown menu
        const dropdownMenuPlugin = hotInstance.getPlugin('dropdownMenu');
        if (dropdownMenuPlugin && !dropdownMenuPlugin.isEnabled()) {
          dropdownMenuPlugin.enablePlugin();
        }
        console.log('DropdownMenu plugin:', dropdownMenuPlugin);
        console.log(
          'Is dropdownMenu enabled:',
          dropdownMenuPlugin?.isEnabled()
        );

        const filtersPlugin = hotInstance.getPlugin('filters');
        if (filtersPlugin && !filtersPlugin.isEnabled()) {
          filtersPlugin.enablePlugin();
        }
        console.log('Filters plugin:', filtersPlugin);
        console.log('Is filters enabled:', filtersPlugin?.isEnabled());

        // Force a render to show the buttons
        hotInstance.render();

        // Apply dynamic colors to first header row after render
        setTimeout(() => {
          this.applyFirstHeaderColors();
        }, 500);
      }
    }, 1000);
  }

  applyFirstHeaderColors() {
    console.log('=== Applying Header Colors ===');
    const nestedHeaders = this.gridSettings.nestedHeaders || [];
    console.log('Nested Headers:', nestedHeaders);

    if (nestedHeaders.length === 0) {
      console.log('No nested headers found');
      return;
    }

    // Define color palette for products
    const colors = [
      { bg1: '#70AD47', bg2: '#507E32' }, // Green - always for GBT
      { bg1: '#4472C4', bg2: '#2E5396' }, // Blue
      { bg1: '#ED7D31', bg2: '#C65911' }, // Orange
      { bg1: '#FFC000', bg2: '#C87F00' }, // Yellow
      { bg1: '#5B9BD5', bg2: '#2E75B5' }, // Light Blue
      { bg1: '#C55A11', bg2: '#843C0C' }, // Dark Orange
      { bg1: '#44546A', bg2: '#2E3B4A' }, // Dark Blue
      { bg1: '#7030A0', bg2: '#4A1F6B' }, // Purple
      { bg1: '#E7E6E6', bg2: '#AEAAAA' }, // Gray
    ];

    const firstHeaderRow = nestedHeaders[0];

    // Apply to ALL Handsontable clones (Handsontable creates multiple table clones for scrolling)
    const allTables = document.querySelectorAll('.handsontable table');
    console.log('Total Handsontable tables found:', allTables.length);

    allTables.forEach((table, tableIdx) => {
      const firstRowHeaders = table.querySelectorAll('thead tr:first-child th');
      const secondRowHeaders = table.querySelectorAll(
        'thead tr:nth-child(2) th'
      );

      console.log(
        `Table ${tableIdx}: firstRow=${firstRowHeaders.length}, secondRow=${secondRowHeaders.length}`
      );

      // DEBUG: Print ALL first row headers to see the actual structure
      console.log(`Table ${tableIdx} - All first row headers:`);
      firstRowHeaders.forEach((cell, idx) => {
        console.log(
          `  [${idx}]: "${cell.textContent?.trim()}" colspan=${cell.getAttribute(
            'colspan'
          )}`
        );
      });

      // Skip tables without proper header structure
      if (firstRowHeaders.length === 0 || secondRowHeaders.length === 0) {
        console.log(`Skipping table ${tableIdx} - incomplete`);
        return;
      }

      // Build a map of product labels to their actual cells by searching through all first row cells
      const productCellMap = new Map<string, HTMLElement>();
      firstRowHeaders.forEach((cell, idx) => {
        const text = cell.textContent?.trim();
        const colspan = cell.getAttribute('colspan');
        if (text && colspan && parseInt(colspan) > 1) {
          // This is a product header with colspan
          productCellMap.set(text, cell as HTMLElement);
          console.log(`Found product header: "${text}" at index ${idx}`);
        }
      });

      let secondRowColumnIndex = 0; // Track position in second row
      let colorIndex = 0;

      firstHeaderRow.forEach((header: any, idx: number) => {
        if (typeof header === 'object' && header.colspan) {
          // This is a product group header (GBT, Product X1, Product X2, etc.)
          const color = colors[colorIndex % colors.length];
          const colspan = header.colspan;

          // COLOR THE FIRST ROW HEADER by finding it in the map
          const firstRowHeaderCell = productCellMap.get(header.label);

          console.log(
            `Table ${tableIdx}, Product: ${header.label}, Found in map:`,
            firstRowHeaderCell ? 'YES' : 'NO'
          );

          if (firstRowHeaderCell) {
            // Apply colors regardless of text content
            // Use both background and background-image for better compatibility
            (firstRowHeaderCell as HTMLElement).style.setProperty(
              'background',
              `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
              'important'
            );
            (firstRowHeaderCell as HTMLElement).style.setProperty(
              'background-image',
              `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
              'important'
            );
            (firstRowHeaderCell as HTMLElement).style.setProperty(
              'color',
              'white',
              'important'
            );
            (firstRowHeaderCell as HTMLElement).style.setProperty(
              'font-weight',
              'bold',
              'important'
            );
            console.log(`✓ First row colored (${header.label}):`, color);
          } else {
            console.log(`✗ First row header NOT FOUND for ${header.label}`);
          }

          // COLOR ALL SECOND ROW COLUMNS UNDER THIS PRODUCT
          for (let i = 0; i < colspan; i++) {
            // +1 to skip row header column
            const secondRowHeaderCell =
              secondRowHeaders[secondRowColumnIndex + i + 1];
            if (secondRowHeaderCell) {
              (secondRowHeaderCell as HTMLElement).style.setProperty(
                'background',
                `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
                'important'
              );
              (secondRowHeaderCell as HTMLElement).style.setProperty(
                'background-image',
                `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
                'important'
              );
              (secondRowHeaderCell as HTMLElement).style.setProperty(
                'color',
                'white',
                'important'
              );
              (secondRowHeaderCell as HTMLElement).style.setProperty(
                'font-weight',
                'bold',
                'important'
              );
            }
          }
          console.log(
            `✓ Second row colored ${colspan} columns under ${header.label}`
          );

          secondRowColumnIndex += colspan;
          colorIndex++;
        } else {
          // This is a standalone header (Indicator, Notes)
          secondRowColumnIndex++;
        }
      });
    });

    console.log('=== Color Application Complete ===');
  }

  async exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Get nested headers from gridSettings
    const nestedHeaders = this.gridSettings.nestedHeaders || [];
    const columns = Array.isArray(this.gridSettings.columns)
      ? this.gridSettings.columns
      : [];

    // Add nested headers
    if (nestedHeaders.length > 0) {
      // First row - grouped headers (GBT, Product X1, Product X2)
      const firstRow = worksheet.addRow([]);
      let colIndex = 1;

      nestedHeaders[0].forEach((header: any) => {
        if (typeof header === 'object' && header.colspan) {
          const cell = worksheet.getCell(1, colIndex);
          cell.value = header.label;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Apply different colors for different groups
          if (header.label === 'GBT') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF70AD47' },
            };
          } else if (header.label === 'Product X1') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4472C4' },
            };
          } else if (header.label === 'Product X2') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFED7D31' },
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF0F0F0' },
            };
          }

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };

          // Merge cells for colspan
          worksheet.mergeCells(1, colIndex, 1, colIndex + header.colspan - 1);
          colIndex += header.colspan;
        } else {
          const cell = worksheet.getCell(1, colIndex);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
          colIndex++;
        }
      });

      // Second row - column names
      if (nestedHeaders.length > 1) {
        const secondRow = nestedHeaders[1];
        const headerRow = worksheet.addRow(secondRow);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      }
    }

    // Add data rows
    this.gridData.forEach((rowData, rowIndex) => {
      const row: any[] = [];
      columns.forEach((col: any) => {
        row.push(rowData[col.data]);
      });

      const dataRow = worksheet.addRow(row);

      // Apply alternating row colors
      dataRow.eachCell((cell) => {
        if (rowIndex % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' },
          };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });
    });

    // Set column widths
    columns.forEach((col: any, index: number) => {
      worksheet.getColumn(index + 1).width = (col.width || 100) / 7; // Approximate conversion
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'handsontable-data.xlsx');
  }
}
