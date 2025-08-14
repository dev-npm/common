import { Component } from '@angular/core';

@Component({
  selector: 'app-customer-codes',
  templateUrl: './customer-codes.component.html'
})
export class CustomerCodesComponent {
  customerCodes: string = '';

  formatCustomerCodes() {
    if (!this.customerCodes) return;

    // Replace new lines with commas first (in case they paste mixed format)
    let cleaned = this.customerCodes.replace(/\n/g, ',');

    // Split by comma, trim spaces, remove empty items
    let codesArray = cleaned
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0);

    // Join back with newline so each code is on its own line
    this.customerCodes = codesArray.join('\n');
  }
}
