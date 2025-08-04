export interface MenuItem {
  label: string;
  route: string;
  icon?: string;
  roles: string[]; // visible to these roles
  children?: MenuItem[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'dashboard',
    roles: ['Admin', 'Contributor']
  },
  {
    label: 'Requests',
    route: '/requests',
    icon: 'form',
    roles: ['Admin', 'Contributor']
  },
  {
    label: 'Admin Panel',
    route: '/admin',
    icon: 'tool',
    roles: ['Admin']
  }
];


@Injectable({ providedIn: 'root' })
export class AuthService {
  private decodedToken: any;

  constructor(...) {
    const token = msalInstance.getActiveAccount()?.idToken;
    if (token) this.decodedToken = jwtDecode(token);
  }

  getUserRoles(): string[] {
    return this.decodedToken?.roles || []; // this.roles = ['Admin'] or ['Contributor']
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }
}


menuItems: MenuItem[] = [];

ngOnInit(): void {
  const roles = this.authService.getUserRoles();

  this.menuItems = MENU_ITEMS.filter(item =>
    item.roles.some(role => roles.includes(role))
  );
}


<ul>
  <li *ngFor="let item of menuItems">
    <a [routerLink]="item.route">
      <i nz-icon [nzType]="item.icon"></i>
      {{ item.label }}
    </a>
  </li>
</ul>


