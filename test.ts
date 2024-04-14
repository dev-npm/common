import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserDataService } from './user-data.service';

@Component({
  selector: 'app-user-select-form',
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <nz-select formControlName="selectedUsers" nzMode="multiple" nzAllowClear nzPlaceHolder="Select users">
        <nz-option *ngFor="let user of users" [nzValue]="user" [nzLabel]="user.name"></nz-option>
      </nz-select>
      <button type="submit">Submit</button>
    </form>
  `,
  styles: []
})
export class UserSelectFormComponent implements OnInit {
  userForm: FormGroup;
  users = [
    { id: 1, name: 'testuser' },
    { id: 2, name: 'user2' },
    { id: 3, name: 'testuser1' },
    { id: 4, name: 'user4' }
  ];
  initialUserIds = new Set();

  constructor(private userDataService: UserDataService) {}

  ngOnInit(): void {
    this.userForm = new FormGroup({
      selectedUsers: new FormControl([])
    });

    // Simulate fetching patched values (initial values) from an API
    this.patchInitialValues();
  }

  patchInitialValues() {
    const patchedUsers = this.users.filter(user => [1, 3].includes(user.id));
    this.userForm.patchValue({ selectedUsers: patchedUsers });
    this.initialUserIds = new Set(patchedUsers.map(user => user.id));

    this.userForm.get('selectedUsers').valueChanges.subscribe(selectedUsers => {
      this.updateChangeTracking(selectedUsers);
    });
  }

  updateChangeTracking(selectedUsers: any[]) {
    const currentIds = new Set(selectedUsers.map(user => user.id));
    const added = selectedUsers.filter(user => !this.initialUserIds.has(user.id));
    const removed = [...this.initialUserIds].filter(id => !currentIds.has(id));
    const unchanged = selectedUsers.filter(user => this.initialUserIds.has(user.id));

    console.log('Added:', added);
    console.log('Removed:', removed);
    console.log('Unchanged:', unchanged);

    // Update tracking sets
    this.initialUserIds = currentIds;
  }

  onSubmit(): void {
    this.userDataService.updateUserSelections(this.userForm.value).subscribe(
      response => console.log('Form submitted successfully', response),
      error => console.error('Error submitting form', error)
    );

    // Optionally reset the form here if needed
  }
}
