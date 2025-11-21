<ul nz-menu [nzMode]="'inline'" [nzTheme]="'dark'">
  <ng-container *ngFor="let item of visibleMenuItems">
    <li *ngIf="item.children?.length" nz-submenu [nzTitle]="item.label" [nzIcon]="item.icon">
      <ul>
        <ng-container *ngFor="let child of item.children">
          <li *ngIf="child.children?.length" nz-submenu [nzTitle]="child.label" [nzIcon]="child.icon">
            <ul>
              <li *ngFor="let grandChild of child.children" nz-menu-item>
                <a *ngIf="grandChild.route" [routerLink]="grandChild.route">{{ grandChild.label }}</a>
                <a *ngIf="!grandChild.route" (click)="onMenuItemClick(grandChild)">{{ grandChild.label }}</a>
              </li>
            </ul>
          </li>
          <li *ngIf="!child.children?.length" nz-menu-item>
            <a *ngIf="child.route" [routerLink]="child.route">{{ child.label }}</a>
            <a *ngIf="!child.route" (click)="onMenuItemClick(child)">{{ child.label }}</a>
          </li>
        </ng-container>
      </ul>
    </li>

    <li *ngIf="!item.children?.length" nz-menu-item [nzIcon]="item.icon">
      <a *ngIf="item.route" [routerLink]="item.route">{{ item.label }}</a>
      <a *ngIf="!item.route" (click)="onMenuItemClick(item)">{{ item.label }}</a>
    </li>
  </ng-container>
</ul>
visibleMenuItems: MenuItem[] = [
  {
    label: 'Navigation One',
    icon: 'mail',
    route: '/nav1',
    roles: ['Admin', 'Requestor']
  },
  {
    label: 'Navigation Two',
    icon: 'appstore',
    roles: ['Admin'],
    children: [
      { label: 'Option 5', route: '/opt5', roles: ['Admin'] },
      { label: 'Option 6', route: '/opt6', roles: ['Admin'] },
      {
        label: 'Submenu',
        children: [
          { label: 'Option 7', route: '/opt7', roles: ['Admin'] },
          { label: 'Option 8', route: '/opt8', roles: ['Admin'] }
        ]
      }
    ]
  },
  {
    label: 'Navigation Three',
    icon: 'setting',
    children: [],
    roles: ['Admin']
  }
];
