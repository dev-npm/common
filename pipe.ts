import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'extractNames'
})
export class ExtractNamesPipe implements PipeTransform {
  transform(value: string): string[] {
    if (!value) {
      return [];
    }
    return value.split('|')  // Split by the pipe character
      .map(part => {
        const trimmedPart = part.trim();  // Trim whitespace
        const dashIndex = trimmedPart.indexOf('-');
        return dashIndex !== -1 ? trimmedPart.substring(dashIndex + 1).trim() : null;
      })
      .filter(name => name !== null && name !== '');  // Filter out empty or null results
  }
}
