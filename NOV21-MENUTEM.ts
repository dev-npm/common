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


***************************
  <ul nz-menu nzMode="inline" nzTheme="dark" [nzInlineCollapsed]="isCollapsed">
  <ng-container *ngFor="let item of menuItems">
    <li *ngIf="!item.children" nz-menu-item [routerLink]="item.route" nzMatchRouter (click)="handleClick(item)">
      <span *ngIf="item.icon" nz-icon [nzType]="item.icon"></span>
      <span>{{ item.label }}</span>
    </li>

    <li *ngIf="item.children" nz-submenu [nzTitle]="item.label" [nzIcon]="item.icon">
      <ul>
        <ng-container *ngFor="let child of item.children">
          <li *ngIf="!child.children" nz-menu-item [routerLink]="child.route" nzMatchRouter (click)="handleClick(child)">
            {{ child.label }}
          </li>

          <li *ngIf="child.children" nz-submenu [nzTitle]="child.label">
            <ul>
              <li *ngFor="let grand of child.children"
                  nz-menu-item
                  [routerLink]="grand.route"
                  nzMatchRouter
                  (click)="handleClick(grand)">
                {{ grand.label }}
              </li>
            </ul>
          </li>
        </ng-container>
      </ul>
    </li>
  </ng-container>
</ul>
// component.ts
menuItems: MenuItem[] = [
  {
    label: 'Home',
    icon: 'home',
    route: ['/contract']
  },
  {
    label: 'Requests',
    icon: 'file-text',
    children: [
      {
        label: 'New Request',
        route: ['/contract', 'requests', 'new']
      },
      {
        label: 'Request List',
        route: ['/contract', 'requests', 'list']
      },
      {
        label: 'Reports',
        children: [
          {
            label: 'Summary',
            route: ['/contract', 'requests', 'reports', 'summary']
          },
          {
            label: 'Detail',
            modalAction: 'openDetailReportModal' // instead of route
          }
        ]
      }
    ]
  },
  {
    label: 'Templates',
    icon: 'profile',
    children: [
      {
        label: 'Master',
        route: ['/contract', 'templates', 'master']
      },
      {
        label: 'Customer',
        modalAction: 'openCustomerTemplateModal'
      }
    ]
  }
];


handleClick(item: MenuItem): void {
  if (item.modalAction) {
    switch (item.modalAction) {
      case 'openDetailReportModal':
        this.modal.create({ nzContent: DetailReportModalComponent });
        break;
      case 'openCustomerTemplateModal':
        this.modal.create({ nzContent: CustomerTemplateModalComponent });
        break;
      default:
        console.warn('Unknown modal action:', item.modalAction);
    }
  }
}

