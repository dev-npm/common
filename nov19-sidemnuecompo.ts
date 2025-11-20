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
<nz-layout class="main-layout">

  <!-- TOP HEADER -->
  <nz-header class="header">
    <div class="left">
      <button nz-button nzType="text" (click)="toggleMenu()">
        <span nz-icon nzType="menu"></span>
      </button>
      <span class="title">Contract Portal</span>
    </div>
  </nz-header>

  <!-- DRAWER -> SLIDE MENU (LIKE ANGULAR.IO) -->
  <nz-drawer
    [nzVisible]="isMenuVisible"
    nzPlacement="left"
    nzClosable="true"
    [nzWidth]="260"
    (nzOnClose)="isMenuVisible = false">

    <!-- MULTI-LEVEL MENU -->
    <ul nz-menu nzMode="inline">
      <li nz-submenu nzTitle="Dashboard" nzIcon="dashboard">
        <ul>
          <li nz-menu-item routerLink="/contract/home">Home</li>
          <li nz-menu-item routerLink="/contract/stats">Stats</li>
        </ul>
      </li>

      <li nz-submenu nzTitle="Reports" nzIcon="file">
        <ul>
          <li nz-menu-item routerLink="/contract/monthly">Monthly</li>
          <li nz-menu-item routerLink="/contract/yearly">Yearly</li>
        </ul>
      </li>

      <li nz-submenu nzTitle="Settings" nzIcon="setting">
        <ul>
          <li nz-menu-item routerLink="/contract/profile">Profile</li>
          <li nz-menu-item routerLink="/contract/access">Access</li>
        </ul>
      </li>
    </ul>

  </nz-drawer>

  <!-- MAIN PAGE -->
  <nz-content class="content">
    <router-outlet></router-outlet>
  </nz-content>

</nz-layout>
import { Component } from '@angular/core';

@Component({
  selector: 'app-contract-layout',
  templateUrl: './contract-layout.component.html',
  styleUrls: ['./contract-layout.component.scss']
})
export class ContractLayoutComponent {

  isMenuVisible = false;

  toggleMenu() {
    this.isMenuVisible = !this.isMenuVisible;
  }
}
.header {
  background: #fff;
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 16px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .title {
      font-size: 18px;
      font-weight: 600;
    }
  }
}

.content {
  padding: 16px;
  min-height: calc(100vh - 64px);
  background: #f5f5f5;
}
