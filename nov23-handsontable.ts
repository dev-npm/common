ngOnInit(): void {
    const columnMap = this.buildDynamicColumns(this.apiData);
    const nestedHeaders = this.buildNestedHeaders(columnMap);
    const flattenedRows = this.flattenRows(this.apiData, columnMap);

    this.hotSettings = {
      data: flattenedRows,
      rowHeaders: true,
      colHeaders: false,
      nestedHeaders: nestedHeaders,
      stretchH: 'all',
      licenseKey: 'non-commercial-and-evaluation',
      columns: columnMap.map(c => ({ data: c.key }))
    };
  }

  /* ============================================================
     1. Build dynamic column list
  ============================================================ */
  buildDynamicColumns(records: HpRecord[]): ColumnMap[] {
    if (records.length === 0) return [];

    const first = records[0];
    const productSections = Object.keys(first.product_json);

    const columnMap: ColumnMap[] = [];

    // 1️⃣ STATIC SECTION
    this.STATIC_SECTION.fields.forEach(f => {
      columnMap.push({
        key: f,
        header1: this.STATIC_SECTION.sectionName,
        header2: this.toTitle(f),
        getValue: r => (r as any)[f]
      });
    });

    // 2️⃣ DYNAMIC PRODUCT SECTIONS
    productSections.forEach(productName => {
      const productFields = Object.keys(first.product_json[productName]);

      productFields.forEach(field => {
        columnMap.push({
          key: `${productName}.${field}`,
          header1: productName,
          header2: this.toTitle(field),
          getValue: r => r.product_json[productName]?.[field] ?? null
        });
      });
    });

    // 3️⃣ TAIL STATIC SECTION
    const tailFields = ["indicator", "notes"];
    tailFields.forEach(f => {
      columnMap.push({
        key: f,
        header1: "",
        header2: this.toTitle(f),
        getValue: r => (r as any)[f]
      });
    });

    return columnMap;
  }

  /* ============================================================
     2. Convert columnMap into Handsontable nestedHeaders
  ============================================================ */
  buildNestedHeaders(columnMap: ColumnMap[]) {
    const row1: any[] = [];
    const row2: any[] = [];

    let currentGroup = "";
    let spanCount = 0;

    const flush = () => {
      if (!currentGroup && spanCount > 0) {
        // tail static case
        row1.push({ label: "", colspan: spanCount });
      } else if (spanCount > 0) {
        row1.push({ label: currentGroup, colspan: spanCount });
      }
      spanCount = 0;
    };

    columnMap.forEach((col, index) => {
      const label = col.header1 || "";

      if (index === 0) {
        currentGroup = label;
        spanCount = 1;
      } else if (label === currentGroup) {
        spanCount++;
      } else {
        flush();
        currentGroup = label;
        spanCount = 1;
      }

      if (index === columnMap.length - 1) {
        flush();
      }
    });

    // Build row2 (subheaders)
    columnMap.forEach(col => row2.push(col.header2));

    return [row1, row2];
  }

  /* ============================================================
     3. Flatten records → rows for Handsontable
  ============================================================ */
  flattenRows(records: HpRecord[], columnMap: ColumnMap[]) {
    return records.map(rec => {
      const row: any = {};
      columnMap.forEach(col => {
        row[col.key] = col.getValue(rec);
      });
      return row;
    });
  }

  /* ============================================================
     Helper to convert field → Pretty Name
  ============================================================ */
  toTitle(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }



.hp-grid {
  .ht_clone_top thead th {
    font-weight: bold;
    text-align: center;
  }

  /* Optional: match Excel color scheme */
  .handsontable thead th {
    background-color: #d4eef9 !important; /* light teal */
  }
}
