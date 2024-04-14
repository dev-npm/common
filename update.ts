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
  lastValue = [];

  constructor(private userDataService: UserDataService) {}

  ngOnInit(): void {
    this.userForm = new FormGroup({
      selectedUsers: new FormControl([])
    });

    this.userForm.get('selectedUsers').valueChanges.subscribe(selectedUsers => {
      this.trackChanges(selectedUsers);
    });
  }

  trackChanges(selectedUsers: any[]): void {
    const currentIds = new Set(selectedUsers.map(user => user.id));
    const previousIds = new Set(this.lastValue.map(user => user.id));

    const added = selectedUsers.filter(user => !previousIds.has(user.id));
    const removed = this.lastValue.filter(user => !currentIds.has(user.id));

    console.log('Added:', added);
    console.log('Removed:', removed);

    this.lastValue = selectedUsers.slice(); // Update lastValue for next comparison
  }

  onSubmit(): void {
    const currentUsers = this.userForm.value.selectedUsers;
    const currentIds = new Set(currentUsers.map(u => u.id));
    const previousIds = new Set(this.lastValue.map(u => u.id));

    const added = currentUsers.filter(user => !previousIds.has(user.id));
    const removed = this.lastValue.filter(user => !currentIds.has(user.id));
    const unchanged = this.lastValue.filter(user => currentIds.has(user.id));

    const submissionData = {
      added,
      removed,
      unchanged
    };

    this.userDataService.updateUserSelections(submissionData).subscribe(
      response => {
        console.log('Success:', response);
      },
      error => {
        console.error('Error:', error);
      }
    );
  }
}
