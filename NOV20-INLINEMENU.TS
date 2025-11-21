export interface MenuItem {
  label: string;
  route?: string;
  icon?: string;
  roles: string[]; // ['Admin', 'Contributor']
  children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Navigation One',
    route: '/nav1',
    icon: 'mail',
    roles: ['Admin', 'Contributor']
  },
  {
    label: 'Navigation Two',
    icon: 'appstore',
    roles: ['Admin', 'Contributor'],
    children: [
      {
        label: 'Option 5',
        route: '/nav2/option5',
        icon: 'dot-chart',
        roles: ['Admin', 'Contributor']
      },
      {
        label: 'Option 6',
        route: '/nav2/option6',
        icon: 'bar-chart',
        roles: ['Admin', 'Contributor']
      },
      {
        label: 'Submenu',
        roles: ['Admin'], // nested submenu visible only to Admin
        children: [
          {
            label: 'Option 7',
            route: '/nav2/submenu/option7',
            icon: 'area-chart',
            roles: ['Admin']
          },
          {
            label: 'Option 8',
            route: '/nav2/submenu/option8',
            icon: 'pie-chart',
            roles: ['Admin']
          }
        ]
      }
    ]
  },
  {
    label: 'Navigation Three',
    icon: 'setting',
    roles: ['Admin'],
    children: [
      {
        label: 'System Logs',
        route: '/nav3/logs',
        icon: 'file-search',
        roles: ['Admin']
      }
    ]
  }
];


filterMenuByRole(menuItems: MenuItem[], userRole: string): MenuItem[] {
  return menuItems
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      ...item,
      children: item.children ? this.filterMenuByRole(item.children, userRole) : undefined
    }));
}
export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Navigation One',
    route: '/nav-one',
    icon: 'mail',
    roles: ['Admin', 'Requestor']
  },
  {
    label: 'Navigation Two',
    icon: 'appstore',
    roles: ['Admin', 'Requestor'],
    children: [
      { label: 'Option 5', route: '/nav-two/opt5', roles: ['Admin', 'Requestor'] },
      { label: 'Option 6', route: '/nav-two/opt6', roles: ['Admin'] },
      {
        label: 'Submenu',
        roles: ['Admin'],
        children: [
          { label: 'Option 7', route: '/nav-two/submenu/opt7', roles: ['Admin'] },
          { label: 'Option 8', route: '/nav-two/submenu/opt8', roles: ['Admin'] }
        ]
      }
    ]
  },
  {
    label: 'Navigation Three',
    icon: 'setting',
    roles: ['Admin'],
    children: [
      { label: 'Option A', route: '/nav-three/a', roles: ['Admin'] }
    ]
  }
];


<nz-menu
  [nzMode]="'inline'"
  [nzTheme]="'dark'"
  [nzInlineCollapsed]="isCollapsed"
>
  <ng-container *ngFor="let item of menuItems">
    <ng-container *ngIf="hasRole(item.roles)">
      <!-- Parent with children -->
      <nz-submenu *ngIf="item.children && item.children.length">
        <ng-template #title>
          <span *ngIf="item.icon" nz-icon [nzType]="item.icon"></span>
          <span>{{ item.label }}</span>
        </ng-template>
        <!-- Recursive render for children -->
        <ng-container *ngTemplateOutlet="renderMenuItems; context: { $implicit: item.children }"></ng-container>
      </nz-submenu>

      <!-- Leaf item -->
      <nz-menu-item *ngIf="!item.children || !item.children.length" [routerLink]="item.route">
        <span *ngIf="item.icon" nz-icon [nzType]="item.icon"></span>
        <span>{{ item.label }}</span>
      </nz-menu-item>
    </ng-container>
  </ng-container>

  <!-- Recursive Template -->
  <ng-template #renderMenuItems let-children>
    <ng-container *ngFor="let child of children">
      <ng-container *ngIf="hasRole(child.roles)">
        <nz-submenu *ngIf="child.children && child.children.length">
          <ng-template #title>
            <span *ngIf="child.icon" nz-icon [nzType]="child.icon"></span>
            <span>{{ child.label }}</span>
          </ng-template>
          <ng-container *ngTemplateOutlet="renderMenuItems; context: { $implicit: child.children }"></ng-container>
        </nz-submenu>

        <nz-menu-item *ngIf="!child.children || !child.children.length" [routerLink]="child.route">
          <span *ngIf="child.icon" nz-icon [nzType]="child.icon"></span>
          <span>{{ child.label }}</span>
        </nz-menu-item>
      </ng-container>
    </ng-container>
  </ng-template>
</nz-menu>

