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


import { AbstractControl, FormGroup, FormArray, FormControl } from '@angular/forms';

markAllAsTouched(control: AbstractControl): void {
  if (control instanceof FormControl) {
    control.markAsTouched({ onlySelf: true });
  } else if (control instanceof FormGroup) {
    Object.keys(control.controls).forEach(key => {
      this.markAllAsTouched(control.controls[key]);
    });
  } else if (control instanceof FormArray) {
    control.controls.forEach(c => this.markAllAsTouched(c));
  }
}

markControlsDirty(control: AbstractControl): void {
  if (control instanceof FormControl) {
    control.markAsDirty({ onlySelf: true });
    control.updateValueAndValidity({ onlySelf: true });
  } else if (control instanceof FormGroup) {
    Object.values(control.controls).forEach(c => this.markControlsDirty(c));
  } else if (control instanceof FormArray) {
    control.controls.forEach(c => this.markControlsDirty(c));
  }
}

