async exportToExcel() {
    const workbook = new ExcelJS.Workbook();

    // Loop through each sheet tab
    for (const sheet of this.sheets) {
      const worksheet = workbook.addWorksheet(sheet.label);

      // Get nested headers from sheet's gridSettings
      const nestedHeaders = sheet.gridSettings.nestedHeaders || [];
      const columns = Array.isArray(sheet.gridSettings.columns)
        ? sheet.gridSettings.columns
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

            // Apply color based on headerClassName if available
            const headerClassName = header.headerClassName || '';
            const colorArgb = this.sectionColors[headerClassName] || 'FFF0F0F0';
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorArgb },
            };

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
          // Extract labels from objects (handle both string and object formats)
          const secondRowLabels = secondRow.map((item: any) =>
            typeof item === 'object' && item.label ? item.label : item
          );
          const headerRow = worksheet.addRow(secondRowLabels);
          headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };

            // Apply color based on headerClassName from the second row
            const headerItem = secondRow[colNumber - 1];
            const headerClassName =
              typeof headerItem === 'object' && headerItem.headerClassName
                ? headerItem.headerClassName
                : '';
            const colorArgb = this.sectionColors[headerClassName] || 'FFE0E0E0';

            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: colorArgb },
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
      sheet.gridData.forEach((rowData, rowIndex) => {
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

      // Add blank row before legend
      const lastDataRow = worksheet.lastRow?.number || 2;
      worksheet.addRow([]);

      // Add Legend header
      const legendHeaderRow = worksheet.addRow(['Legend']);
      legendHeaderRow.getCell(1).font = { bold: true, size: 14 };
      legendHeaderRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      legendHeaderRow.getCell(1).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };

      // Add Legend column headers
      const legendColHeaders = worksheet.addRow(['Code', 'Description']);
      legendColHeaders.eachCell((cell) => {
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

      // Add legend data
      sheet.legendData.forEach((legendRow) => {
        const row = worksheet.addRow(legendRow);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          };
        });
      });

      // Set legend column widths
      worksheet.getColumn(1).width = 10;
      worksheet.getColumn(2).width = 30;
    }

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'handsontable-data.xlsx');
  }
