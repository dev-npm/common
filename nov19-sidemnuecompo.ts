<!-- contract-layout.component.html -->
<nz-layout class="contract-layout">

  <!-- Top header with hamburger -->
  <nz-header class="contract-header">
    <button nz-button nzType="text" (click)="isCollapsed = !isCollapsed">
      <span nz-icon nzType="menu"></span>
    </button>
    <span class="contract-title">Contract Portal</span>
  </nz-header>

  <nz-layout>
    <!-- Collapsible sider -->
    <nz-sider
      nzTheme="dark"
      nzCollapsible
      nzTrigger="null"
      [(nzCollapsed)]="isCollapsed"
      [nzWidth]="220"
      class="contract-sider">

      <!-- INLINE MENU (multi-level) -->
      <ul
        nz-menu
        nzMode="inline"
        nzTheme="dark"
        [nzInlineCollapsed]="isCollapsed">

        <!-- Level 0 item -->
        <li nz-menu-item
            [routerLink]="['/contract','home']"
            nzMatchRouter>
          <span nz-icon nzType="home"></span>
          <span>Home</span>
        </li>

        <!-- Level 1 submenu -->
        <li nz-submenu nzTitle="Requests" nzIcon="file-text">
          <ul>
            <li nz-menu-item
                [routerLink]="['/contract','requests','new']"
                nzMatchRouter>
              <span>New Request</span>
            </li>

            <li nz-menu-item
                [routerLink]="['/contract','requests','list']"
                nzMatchRouter>
              <span>Request List</span>
            </li>

            <!-- Level 2 submenu inside Requests -->
            <li nz-submenu nzTitle="Reports">
              <ul>
                <li nz-menu-item
                    [routerLink]="['/contract','requests','reports','summary']"
                    nzMatchRouter>
                  <span>Summary Report</span>
                </li>
                <li nz-menu-item
                    [routerLink]="['/contract','requests','reports','detail']"
                    nzMatchRouter>
                  <span>Detail Report</span>
                </li>
              </ul>
            </li>
          </ul>
        </li>

        <!-- Another Level 1 submenu -->
        <li nz-submenu nzTitle="Templates" nzIcon="profile">
          <ul>
            <li nz-menu-item
                [routerLink]="['/contract','templates','master']"
                nzMatchRouter>
              <span>Master Templates</span>
            </li>
            <li nz-menu-item
                [routerLink]="['/contract','templates','customer']"
                nzMatchRouter>
              <span>Customer Templates</span>
            </li>
          </ul>
        </li>

      </ul>
    </nz-sider>

    <!-- Content area -->
    <nz-content class="contract-content">
      <div class="contract-inner">
        <router-outlet></router-outlet>
      </div>
    </nz-content>
  </nz-layout>
</nz-layout>


                  /* contract-layout.component.scss */
.contract-layout {
  height: 100vh;
}

.contract-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.contract-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.contract-sider {
  min-height: calc(100vh - 64px); // 64px default header height
}

.contract-content {
  padding: 16px;
  background: #f5f5f5;
}

.contract-inner {
  background: #fff;
  min-height: calc(100vh - 96px);
  padding: 16px;
  border-radius: 4px;
}


const routes: Routes = [
  // ... other routes

  {
    path: 'contract',
    component: ContractLayoutComponent,
    // canActivate: [AuthGuard, ContractRoleGuard], // your role guard(s)
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },

      { path: 'home', component: ContractHomeComponent },

      { path: 'requests/new', component: ContractNewRequestComponent },
      { path: 'requests/list', component: ContractRequestListComponent },

      { path: 'requests/reports/summary', component: ContractReportSummaryComponent },
      { path: 'requests/reports/detail', component: ContractReportDetailComponent },

      { path: 'templates/master', component: ContractMasterTemplatesComponent },
      { path: 'templates/customer', component: ContractCustomerTemplatesComponent }
    ]
  }
];
