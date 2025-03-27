/* Month & quarter column sizes */
th,
td {
  min-width: 30px;
  max-width: 40px;
  width: 35px;
  padding: 2px;
  box-sizing: border-box;
  text-align: center;
}

/* Compress quarter header font and height */
thead th {
  font-size: 11px;
  padding: 4px 2px;
  white-space: nowrap;
}

/* IP column (optional): narrower */
.ip-column {
  width: 100px;
  max-width: 100px;
  min-width: 80px;
  font-size: 12px;
  padding: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Gantt marker */
.gantt-marker {
  width: 6px;
  height: 6px;
  transform: rotate(45deg);
  border-radius: 1px;
  flex-shrink: 0;
}

/* Remove subtext for compact mode (or show on hover if needed) */
.gantt-subtext {
  display: none; /* Optional: hide milestone label */
}
