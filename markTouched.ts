markAllAsTouched(control: FormGroup | FormArray) {
  if (control instanceof FormGroup) {
    Object.keys(control.controls).forEach(key => {
      const c = control.controls[key];
      if (c instanceof FormControl) {
        c.markAsTouched();
      } else {
        this.markAllAsTouched(c);
      }
    });
  } else if (control instanceof FormArray) {
    control.controls.forEach(c => {
      if (c instanceof FormControl) {
        c.markAsTouched();
      } else {
        this.markAllAsTouched(c);
      }
    });
  }
}
