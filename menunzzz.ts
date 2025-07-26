<div class="main__header__menu" style="min-width: 550px;">
  <div nz-menu nzMode="horizontal" style="margin-top: 2px;">
    <ng-container *ngFor="let node of menuItems">
      <ng-container *ngIf="!node.children; else hasChildren">
        <li nz-menu-item>
          <a [routerLink]="[ node.routerLink ]">{{ node.label }}</a>
        </li>
      </ng-container>
      <ng-template #hasChildren>
        <li nz-submenu>
          <span title>{{ node.label }}</span>
          <ul>
            <li nz-menu-item *ngFor="let child of node.children">
              <a [routerLink]="[ child.routerLink ]">{{ child.label }}</a>
            </li>
          </ul>
        </li>
      </ng-template>
    </ng-container>
  </div>
</div>
