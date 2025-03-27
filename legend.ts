// Master milestone set with 24 bright colors
const milestoneColorMap: { [key: string]: string } = {
  'MSDK-A1': '#FF5733', // Bright Orange-Red
  'MSDK-A2': '#36CFC9', // Bright Aqua
  'MSDK-A3': '#FFC107', // Bright Yellow
  'MSDK-A4': '#52C41A', // Bright Green
  'MSDK-A5': '#FA8C16', // Bright Orange
  'MSDK-B1': '#2F54EB', // Bright Blue
  'MSDK-B2': '#9254DE', // Bright Purple
  'MSDK-B3': '#13C2C2', // Bright Cyan
  'MSDK-B4': '#FADB14', // Bright Lime
  'MSDK-B5': '#F5222D', // Bright Red
  'MSDK-C1': '#E91E63', // Bright Pink
  'MSDK-C2': '#9C27B0', // Bright Magenta
  'MSDK-C3': '#00BCD4', // Bright Teal
  'MSDK-C4': '#4CAF50', // Bright Green
  'MSDK-C5': '#FFEB3B', // Bright Gold
  'MSDK-D1': '#03A9F4', // Bright Sky Blue
  'MSDK-D2': '#FF9800', // Bright Deep Orange
  'MSDK-D3': '#795548', // Bright Brown
  'MSDK-D4': '#607D8B', // Bright Blue-Gray
  'MSDK-D5': '#FF4081', // Bright Hot Pink
  'MSDK-E1': '#FFC0CB', // Bright Pinkish
  'MSDK-E2': '#8B5CF6', // Bright Violet
  'MSDK-E3': '#1E90FF', // Bright Dodger Blue
  'MSDK-E4': '#32CD32', // Bright Lime Green
  'MSDK-E5': '#FF6347'  // Bright Tomato
};

// Default fallback color if milestone is not found
const defaultColor = '#BFBFBF'; // Gray fallback


// Create a Set of unique milestone names
const uniqueMilestones = Array.from(new Set(apiResponse.map(item => item.milestone)));

// Generate a random HEX color
function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Create a legend with milestone and random color
const milestoneLegend = uniqueMilestones.map(milestone => ({
  milestone,
  color: getRandomColor()
}));

console.log('Legend:', milestoneLegend);
<!-- Legend Section -->
<div class="legend-container">
  <div *ngFor="let item of milestoneLegend" class="legend-item">
    <span class="legend-color" [ngStyle]="{ 'background-color': item.color }"></span>
    <span class="legend-label">{{ item.milestone }}</span>
  </div>
</div>


  .legend-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.legend-label {
  font-size: 14px;
  color: #333;
}
