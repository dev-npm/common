<nz-row
  [nzJustify]="isEditMode ? 'center' : 'start'"
  [nzGutter]="16"
>
  <ng-container *ngFor="let cardCtrl of cards; let i = index">
    <nz-col
      [nzSpan]="isEditMode ? 12 : 6"
      *ngIf="!isEditMode || i === 0"
    >
      <nz-card [nzTitle]="'Card ' + (i + 1)">
        <!-- form controls for each card -->
      </nz-card>
    </nz-col>
  </ng-container>
</nz-row>
