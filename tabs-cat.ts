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
