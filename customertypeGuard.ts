@Injectable({ providedIn: 'root' })
export class CustomerTypeGuard implements CanActivate {
  constructor(private router: Router, private auth: AuthService, private route: ActivatedRoute) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const customerTypeId = +route.queryParamMap.get('customer_type_id')!;
    const userRole = this.auth.getCurrentUserRole(); // e.g., 'Contributor'

    const allowedTypes = roleCustomerMap[userRole] || [];

    if (allowedTypes.includes(customerTypeId)) {
      return true;
    }

    // Redirect to error page or dashboard
    this.router.navigate(['/unauthorized']);
    return false;
  }
}

{
  path: 'reports/mainreport/:reportId',
  component: ReportComponent,
  canActivate: [CustomerTypeGuard]
}

const roleCustomerMap: Record<string, number[]> = {
  Admin: [2],
  SuperUser: [2],
  Viewer: [2],
  Planner: [3],
  Contributor: [3]
};

