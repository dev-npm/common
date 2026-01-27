@Component({
  selector: 'app-file-modal',
  templateUrl: './file-modal.component.html'
})
export class FileModalComponent implements OnInit {

  @Input() configureDataset: ConfigureDatasetItem[] = [];
  @Input() isCustomEnabled = false; // global toggle

  sections: SectionVm[] = [];

  ngOnInit(): void {
    this.buildSections();
  }

  private buildSections(): void {
    const sectionMap = new Map<number, SectionVm>();

    const filteredDataset = this.isCustomEnabled
      ? this.configureDataset
      : this.configureDataset.filter(x => x.categoryId !== 2);

    for (const row of filteredDataset) {

      // 1️⃣ Section (Category)
      if (!sectionMap.has(row.categoryId)) {
        sectionMap.set(row.categoryId, {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          tabs: []
        });
      }

      const section = sectionMap.get(row.categoryId)!;

      // 2️⃣ Recipient Tab
      section.tabs.push({
        key: `${row.categoryId}_${row.recipientId}`,
        categoryId: row.categoryId,
        categoryName: row.categoryName,

        recipientId: row.recipientId,
        recipientName: row.recipientName,

        gbtFileId: row.gbtFileId,
        gbtFileName: row.gbtFileName,
        isCustom: row.isCustom,

        loaded: false,
        loading: false,

        allItems: [],
        removedGvtIds: []
      });
    }

    // stable ordering
    this.sections = Array.from(sectionMap.values())
      .sort((a, b) => a.categoryId - b.categoryId);

    this.sections.forEach(s =>
      s.tabs.sort((a, b) => a.recipientId - b.recipientId)
    );
  }



  onRecipientTabChange(section: SectionVm, index: number): void {
    const tab = section.tabs[index];
    if (!tab || tab.loaded || tab.loading) return;

    this.loadTabData(tab);
  }

  private loadTabData(tab: RecipientTabVm): void {
    tab.loading = true;

    // 🔴 SERVICE CALL WILL GO HERE (later)
    // For now, simulate response
    setTimeout(() => {
      tab.allItems = []; // replace with service response
      tab.loaded = true;
      tab.loading = false;
    }, 300);
  }
<div *ngFor="let section of sections" class="section-block">

  <h3>{{ section.categoryName }}</h3>

  <nz-tabset (nzSelectedIndexChange)="onRecipientTabChange(section, $event)">
    <nz-tab *ngFor="let tab of section.tabs" [nzTitle]="tab.recipientName">

      <ng-container *ngIf="tab.loaded; else loadingTpl">
        <app-child-item-filter-list
          [allItems]="tab.allItems"
          [isEditMode]="true"
          (removedIdsChange)="handlegvtItemsRemoved(tab, $event.gvtIds, $event.action)">
        </app-child-item-filter-list>
      </ng-container>

    </nz-tab>
  </nz-tabset>

</div>

<ng-template #loadingTpl>
  <nz-spin nzTip="Loading..."></nz-spin>
</ng-template>


  this.modal.create({
  nzTitle: 'Configure Files',
  nzContent: FileModalComponent,
  nzComponentParams: {
    configureDataset: this.configureDataset,
    isCustomEnabled: this.isCustomEnabled
  },
  nzFooter: null
});

***************jan26*********

  private getAllTabs(): RecipientTabVm[] {
  return this.sections.flatMap(s => s.tabs);
}
private loadTabForAddMode(tab: RecipientTabVm): Observable<void> {
  // If already loaded, do nothing
  if (tab.loaded) {
    return of(void 0);
  }

  tab.loading = true;

  return this.svc.getAvailableItems(tab.gbtFileId).pipe(
    tap(available => {
      // Add mode uses persisted state if exists,
      // otherwise defaults to all selected
      const persisted = this.persistedLookup.get(tab.key);

      tab.allItems = this.buildAddModeItems(available, persisted);

      tab.loaded = true;
      tab.loading = false;
    }),
    map(() => void 0),
    catchError(err => {
      tab.loading = false;
      throw err;
    })
  );
}


save(): void {
  if (this.isEditMode) {
    // Edit mode: existing behavior
    this.finalizeAndClose();
    return;
  }

  // ------------------------------------------------------------
  // ADD MODE POLICY:
  // Auto-load ALL tabs before saving so that
  // "all selected by default" applies to every tab,
  // even if user never visited it.
  // ------------------------------------------------------------

  const tabs = this.getAllTabs();

  const loadOperations = tabs.map(tab =>
    this.loadTabForAddMode(tab)
  );

  // Wait until ALL tabs are loaded
  forkJoin(loadOperations).subscribe({
    next: () => {
      // Now every tab has allItems populated
      this.finalizeAndClose();
    },
    error: () => {
      // handle error UI if needed
    }
  });
}


private finalizeAndClose(): void {
  const result: PersistedTabState[] = [];

  for (const section of this.sections) {
    for (const tab of section.tabs) {

      // By now, tab.loaded === true for all tabs in Add mode
      const selectedItems = tab.allItems
        .filter(i => i.selected === true)
        .map(i => ({
          gvtId: i.gvtId, // null in add mode
          itemData: i.itemData,
          itemDataIndicator: i.itemDataIndicator,
          priority: i.priority
        }));

      result.push({
        categoryId: tab.categoryId,
        recipientId: tab.recipientId,
        gbtFileId: tab.gbtFileId,

        selectedItems,

        // In Add mode this will be empty; in Edit mode it is meaningful
        removedgvtIds: Array.from(tab.removedgvtIds)
      });
    }
  }

  this.modalRef.close(result);
}


***************** 
  <nz-tabset (nzSelectedIndexChange)="onRecipientTabChange(section, $event)">
  <nz-tab *ngFor="let tab of section.tabs">
    
    <!-- Custom tab title -->
    <ng-template nz-tab-title>
      <span class="tab-title">
        {{ tab.recipientName }}

        <!-- Icon shown ONLY if tab is NOT visited -->
        <span
          *ngIf="!tab.loaded"
          nz-tooltip
          nzTooltipTitle="Not reviewed">
          <i nz-icon nzType="info-circle" nzTheme="outline" class="tab-warning-icon"></i>
        </span>
      </span>
    </ng-template>

    <!-- Tab content -->
    <ng-container *ngIf="tab.loaded; else loadingTpl">
      <app-child-item-filter-list
        [allItems]="tab.allItems"
        [isEditMode]="isEditMode"
        (removedIdsChange)="handleRemovedIds(tab, $event.pvtIds, $event.action)">
      </app-child-item-filter-list>
    </ng-container>

  </nz-tab>
</nz-tabset>
<button
  nz-button
  nzType="primary"
  [disabled]="!canSave"
  nz-tooltip
  nzTooltipTitle="Please visit all tabs before saving">
  Save
</button>
.tab-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tab-warning-icon {
  color: #faad14; /* Ant Design warning color */
  font-size: 12px;
}


