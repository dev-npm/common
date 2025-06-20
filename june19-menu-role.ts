reportMenus: { [customerType: string]: AppReport[] } = {};

ngOnInit(): void {
  const role = this.authService.getUserRole(); // e.g., 'Planner', 'Admin'

  this.reportService.getReportsByRole(role).subscribe(reports => {
    this.reportMenus = {};

    for (const rpt of reports) {
      const group = rpt.customer_type_name;

      if (!this.reportMenus[group]) {
        this.reportMenus[group] = [];
      }

      this.reportMenus[group].push(rpt);
    }
  });
}

get customerTypes(): string[] {
  return Object.keys(this.reportMenus);
}

openReport(report: AppReport): void {
  this.router.navigate(['/reports', report.route_path], {
    state: {
      reportId: report.id,
      customerTypeId: report.customer_type_id,
      isCustom: report.is_custom_report
    }
  });
}


<div style="display: flex; gap: 16px;">
  <nz-dropdown *ngFor="let type of customerTypes" nzTrigger="click">
    <a nz-dropdown>
      {{ type }} Reports <i nz-icon nzType="down"></i>
    </a>
    <ul nz-menu>
      <nz-menu-group nzTitle="Standard">
        <li nz-menu-item *ngFor="let rpt of reportMenus[type]" 
            *ngIf="!rpt.is_custom_report"
            (click)="openReport(rpt)">
          {{ rpt.report_name }}
        </li>
      </nz-menu-group>

      <nz-menu-group nzTitle="Custom">
        <li nz-menu-item *ngFor="let rpt of reportMenus[type]" 
            *ngIf="rpt.is_custom_report"
            (click)="openReport(rpt)">
          {{ rpt.report_name }}
        </li>
      </nz-menu-group>
    </ul>
  </nz-dropdown>
</div>
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReportDto>>> GetReportsByRole([FromQuery] string role)
    {
        var customerTypeIds = await _context.RoleCustomerTypeMaps
            .Where(r => r.RoleName == role)
            .Select(r => r.CustomerTypeId)
            .ToListAsync();

        var reports = await _context.AppReports
            .Include(r => r.CustomerType)
            .Where(r => customerTypeIds.Contains(r.CustomerTypeId))
            .Select(r => new ReportDto
            {
                Id = r.Id,
                ReportName = r.ReportName,
                IsCustomReport = r.IsCustomReport,
                CustomerTypeId = r.CustomerTypeId,
                CustomerTypeName = r.CustomerType.Name,
                RoutePath = r.RoutePath
            })
            .ToListAsync();

        return Ok(reports);
    }
}


99999999999
<nz-menu nzMode="horizontal">

  <!-- DYNAMIC REPORT DROPDOWNS -->
  <ng-container *ngFor="let type of customerTypes">
    <li nz-submenu [nzTitle]="type + ' Reports'">
      <ul>
        <nz-menu-group nzTitle="Standard">
          <li nz-menu-item *ngFor="let rpt of reportMenus[type]" 
              *ngIf="!rpt.is_custom_report"
              (click)="openReport(rpt)">
            {{ rpt.report_name }}
          </li>
        </nz-menu-group>

        <nz-menu-group nzTitle="Custom">
          <li nz-menu-item *ngFor="let rpt of reportMenus[type]" 
              *ngIf="rpt.is_custom_report"
              (click)="openReport(rpt)">
            {{ rpt.report_name }}
          </li>
        </nz-menu-group>
      </ul>
    </li>
  </ng-container>

  <!-- STATIC: ADMIN SETTINGS -->
  <li nz-submenu nzTitle="Admin Settings">
    <ul>
      <li nz-menu-item routerLink="/user-management">User Management</li>
      <li nz-menu-item routerLink="/role-permissions">Role Permissions</li>
    </ul>
  </li>

  <!-- STATIC: PROJECT SETTINGS -->
  <li nz-submenu nzTitle="Project Settings">
    <ul>
      <li nz-menu-item routerLink="/project-list">Projects</li>
      <li nz-menu-item routerLink="/project-config">Configuration</li>
      <li nz-menu-item routerLink="/milestones">Milestones</li>
    </ul>
  </li>

</nz-menu>

