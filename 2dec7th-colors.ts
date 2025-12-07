
  applyFirstHeaderColors() {
    const nestedHeaders = this.gridSettings.nestedHeaders || [];

    if (nestedHeaders.length === 0) {
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

    // Build a color assignment map based on the API structure (source of truth)
    const productColorMap = new Map<string, { bg1: string; bg2: string }>();
    let colorIndex = 0;

    firstHeaderRow.forEach((header: any) => {
      if (typeof header === 'object' && header.colspan) {
        productColorMap.set(header.label, colors[colorIndex % colors.length]);
        colorIndex++;
      }
    });

    // Apply to ALL Handsontable clones (Handsontable creates multiple table clones for scrolling)
    const allTables = document.querySelectorAll('.handsontable table');

    allTables.forEach((table) => {
      const firstRowHeaders = table.querySelectorAll('thead tr:first-child th');
      const secondRowHeaders = table.querySelectorAll(
        'thead tr:nth-child(2) th'
      );

      // Skip tables without proper header structure
      if (firstRowHeaders.length === 0 || secondRowHeaders.length === 0) {
        return;
      }

      // Build a map of product labels to their cells in THIS specific table
      const tableCellMap = new Map<string, HTMLElement>();
      firstRowHeaders.forEach((cell) => {
        const text = cell.textContent?.trim();
        const colspan = cell.getAttribute('colspan');
        if (text && colspan && parseInt(colspan) > 1) {
          tableCellMap.set(text, cell as HTMLElement);
        }
      });

      // Now apply colors using the pre-built color map (consistent across all tables)
      let secondRowColumnIndex = 0;

      firstHeaderRow.forEach((header: any) => {
        if (typeof header === 'object' && header.colspan) {
          const color = productColorMap.get(header.label);
          const colspan = header.colspan;

          if (color) {
            // COLOR THE FIRST ROW HEADER
            const firstRowHeaderCell = tableCellMap.get(header.label);

            if (firstRowHeaderCell) {
              firstRowHeaderCell.style.setProperty(
                'background',
                `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
                'important'
              );
              firstRowHeaderCell.style.setProperty(
                'background-image',
                `linear-gradient(to bottom, ${color.bg1} 0%, ${color.bg2} 100%)`,
                'important'
              );
              firstRowHeaderCell.style.setProperty(
                'color',
                'white',
                'important'
              );
              firstRowHeaderCell.style.setProperty(
                'font-weight',
                'bold',
                'important'
              );
            }

            // COLOR ALL SECOND ROW COLUMNS UNDER THIS PRODUCT
            for (let i = 0; i < colspan; i++) {
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
          }

          secondRowColumnIndex += colspan;
        } else {
          secondRowColumnIndex++;
        }
      });
    });
  }
