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
