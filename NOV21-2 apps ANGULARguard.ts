// src/app/app-access.config.ts

export type AppKey = 'ExcelApp1' | 'ExcelApp2' | 'ContractApp';

export interface RouteAccessRule {
  pathPattern: RegExp;           // regex match on Angular route
  allowedRoles: string[];        // exact Azure AD roles
}

// Host → AppKey mapping (dev + prod)
export const HOST_APP_MAP: Record<string, AppKey> = {
  'excelapp1-dev-ui.company.com': 'ExcelApp1',
  'excelapp1.company.com': 'ExcelApp1',

  'excelapp2-dev-ui.company.com': 'ExcelApp2',
  'excelapp2.company.com': 'ExcelApp2',

  'contractapp-dev-ui.company.com': 'ContractApp',
  'contractapp.company.com': 'ContractApp'
};

export function resolveAppFromHost(host: string): AppKey | null {
  const normalized = host.toLowerCase();
  return (HOST_APP_MAP[normalized] as AppKey) ?? null;
}

// Path → role rules per app
export const APP_ACCESS_MATRIX: Record<AppKey, RouteAccessRule[]> = {
  ExcelApp1: [
    { pathPattern: /^\/excel1-admin(\/|$)/, allowedRoles: ['ExcelApp1-Admin'] },
    { pathPattern: /^\/excel1-view(\/|$)/,  allowedRoles: ['ExcelApp1-Admin', 'ExcelApp1-Viewer'] }
  ],

  ExcelApp2: [
    { pathPattern: /^\/excel2-admin(\/|$)/, allowedRoles: ['ExcelApp2-Admin'] },
    { pathPattern: /^\/excel2-report(\/|$)/, allowedRoles: ['ExcelApp2-Admin', 'ExcelApp2-Viewer'] }
  ],

  ContractApp: [
    { pathPattern: /^\/contract-admin(\/|$)/, allowedRoles: ['ContractApp-Admin'] },
    { pathPattern: /^\/contract(\/|$)/,       allowedRoles: ['ContractApp-User', 'ContractApp-Admin'] }
  ]
};



---------------

  // src/environments/environment.ts
import { AppKey } from '../app/app-access.config';

export const environment = {
  production: false,
  envName: 'dev',
  appEnvAccess: {
    ExcelApp1: ['dev'],
    ExcelApp2: ['dev', 'prod'],
    ContractApp: ['dev', 'prod']
  } as Record<AppKey, string[]>
};
--------

  // src/environments/environment.prod.ts
import { AppKey } from '../app/app-access.config';

export const environment = {
  production: true,
  envName: 'prod',
  appEnvAccess: {
    ExcelApp1: [],                  // blocked in prod
    ExcelApp2: ['prod'],            // prod allowed
    ContractApp: ['prod']           // prod allowed
  } as Record<AppKey, string[]>
};
-----------


  // src/app/app-key.service.ts
import { Injectable } from '@angular/core';
import { AppKey, resolveAppFromHost } from './app-access.config';

@Injectable({ providedIn: 'root' })
export class AppKeyService {

  getActiveAppKey(url: string): AppKey | null {
    const host = window.location.hostname.toLowerCase();

    // 1. Try host → app (dev/prod)
    let appKey = resolveAppFromHost(host);

    // 2. Localhost fallback → detect by URL prefix
    if (!appKey && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
      if (url.startsWith('/excel1')) return 'ExcelApp1';
      if (url.startsWith('/excel2')) return 'ExcelApp2';
      if (url.startsWith('/contract')) return 'ContractApp';
    }

    return appKey ?? null;
  }
}
------------

  // src/app/app-access.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { environment } from '../environments/environment';
import { APP_ACCESS_MATRIX, AppKey } from './app-access.config';
import { AppKeyService } from './app-key.service';

@Injectable({ providedIn: 'root' })
export class AppAccessGuard implements CanActivate {

  constructor(
    private msal: MsalService,
    private router: Router,
    private appKeyService: AppKeyService
  ) {}

  canActivate(_: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkAccess(state.url);
  }

  private checkAccess(url: string): boolean | UrlTree {
    // 1️⃣ AppKey from host / url
    const appKey = this.appKeyService.getActiveAppKey(url);
    if (!appKey) return this.router.parseUrl('/unauthorized');

    // 2️⃣ Environment restriction
    const envAllowed = environment.appEnvAccess[appKey] ?? [];
    if (!envAllowed.includes(environment.envName))
      return this.router.parseUrl('/unauthorized');

    // 3️⃣ Roles from MSAL
    const account = this.msal.instance.getActiveAccount();
    const claims: any = account?.idTokenClaims ?? {};
    const allRoles: string[] = claims.roles ?? [];
    if (!allRoles.length) return this.router.parseUrl('/unauthorized');

    // Filter roles ONLY belonging to this app
    const appPrefix = `${appKey}-`;
    const appRoles = allRoles.filter(r => r.startsWith(appPrefix));
    if (!appRoles.length) return this.router.parseUrl('/unauthorized');

    // 4️⃣ URL regex rule
    const rules = APP_ACCESS_MATRIX[appKey];
    const matchedRule = rules.find(r => r.pathPattern.test(url));
    if (!matchedRule) return this.router.parseUrl('/unauthorized');

    // 5️⃣ Role intersection
    const allowed = appRoles.some(r => matchedRule.allowedRoles.includes(r));
    return allowed ? true : this.router.parseUrl('/unauthorized');
  }
}
-----------

  // src/app/app-key.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppKeyService } from './app-key.service';

@Injectable()
export class AppKeyInterceptor implements HttpInterceptor {

  constructor(private appKeyService: AppKeyService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const path = this.getPath(req.url);
    const appKey = this.appKeyService.getActiveAppKey(path);
    if (!appKey) return next.handle(req);

    const cloned = req.clone({ setHeaders: { 'X-App-Key': appKey } });
    return next.handle(cloned);
  }

  private getPath(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://'))
      return new URL(url).pathname;
    return url; // relative
  }
}
------------

  providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AppKeyInterceptor, multi: true }
]
-------------

  // src/app/app-routing.module.ts

const routes: Routes = [
  {
    path: 'excel1',
    canActivate: [AppAccessGuard],
    component: aprLayoutComponent,
    children: [
      { path: 'excel1-admin', component: Excel1AdminComponent },
      { path: 'excel1-view', component: Excel1ViewComponent }
    ]
  },

  {
    path: 'excel2',
    canActivate: [AppAccessGuard],
    component: aprLayoutComponent,
    children: [
      { path: 'excel2-admin', component: Excel2AdminComponent },
      { path: 'excel2-report', component: Excel2ReportComponent }
    ]
  },

  {
    path: '',
    canActivate: [AppAccessGuard],
    component: ContractLayoutComponent,
    children: [
      { path: 'contract', component: ContractHomeComponent },
      { path: 'contract-admin', component: ContractAdminComponent }
    ]
  },

  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', redirectTo: 'unauthorized' }
];
