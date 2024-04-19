curPastDateValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } => {
      const now = this.getSystemDateValue().setHours(0, 0, 0, 0);
      const date = control.value;
      if (date && date.getTime() !== 0 && !Number.isNaN(date.valueOf())) {
        date.setHours(0, 0, 0, 0);
        return date.getTime() <= now ? null : { curPastDate: true };
      }
      return { curPastDate: true };
    };
  }
