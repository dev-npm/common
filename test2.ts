onSubmit(): void {
  const selectedUsers = this.userForm.value.selectedUsers;
  const currentIds = new Set(selectedUsers.map(user => user.id));

  const added = selectedUsers.filter(user => !this.initialUserIds.has(user.id));
  const removed = [...this.initialUserIds].filter(id => !currentIds.has(id));
  const unchanged = selectedUsers.filter(user => this.initialUserIds.has(user.id));

  const submissionData = {
    added: added.map(user => user.id), // or user for full objects if the server needs them
    removed: removed, // Assuming IDs are enough; adjust if the server needs full objects
    unchanged: unchanged.map(user => user.id) // or user for full objects if the server needs them
  };

  this.userDataService.updateUserSelections(submissionData).subscribe(
    response => {
      console.log('Form submitted successfully', response);
      // Optionally reset the form here if needed or update initial tracking
      this.initialUserIds = new Set(selectedUsers.map(user => user.id)); // Reset initial IDs
    },
    error => console.error('Error submitting form', error)
  );
}
