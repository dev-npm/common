/**
 * Determines the state and disabled status of a toggle control based on a business rule.
 * @param rule The admin rule (1, 2, or 3).
 * @returns An object with 'state' (boolean) and 'disabled' (boolean) properties.
 */
getToggleControlState(rule: number): { state: boolean; disabled: boolean } {
  let toggleState = false;
  let toggleDisabled = false;

  switch (rule) {
    case 1: // Disabled and OFF
      toggleState = false;
      toggleDisabled = true;
      break;
    case 2: // Disabled and ON
      toggleState = true;
      toggleDisabled = true;
      break;
    case 3: // Enabled for the user to change
      toggleState = false; // Default to off
      toggleDisabled = false;
      break;
    default:
      // Good practice to handle unexpected rules
      console.warn(`Unknown rule: ${rule}. Defaulting to disabled and off.`);
      toggleState = false;
      toggleDisabled = true;
      break;
  }

  return { state: toggleState, disabled: toggleDisabled };
}
