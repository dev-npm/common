<nz-select
  [(ngModel)]="selectedUsers"
  [nzMode]="'multiple'"
  [nzShowSearch]="true"
  [nzServerSearch]="true"
  [compareWith]="compareById"
  [nzOptions]="userOptions"
  (nzOnSearch)="onSearch($event)"
  style="width: 100%"
>
</nz-select>


selectedUsers: Array<{ id: string; name: string }> = [];
userOptions: Array<{ label: string; value: { id: string; name: string } }> = [];

onSearch(keyword: string): void {
  this.fetchUsers(keyword).then(users => {
    const filtered = users.filter(
      user => !this.selectedUsers.some(sel => sel.id === user.id)
    );
    this.userOptions = filtered.map(user => ({
      label: user.name,
      value: user
    }));
  });
}

compareById = (a: any, b: any): boolean => a?.id === b?.id;
