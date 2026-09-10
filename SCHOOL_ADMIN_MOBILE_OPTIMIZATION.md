# School Admin Dashboard - Mobile Optimization Guide

## Current Status
The dashboard has basic mobile support but needs deeper optimization for small screens.

## Key Issues on Mobile
1. **Tabs overcrowding**: 5 tabs don't fit well on small screens
2. **Grid layouts**: Staff/student lists use columns that don't work on mobile
3. **Forms too wide**: Broadcast form takes full width
4. **Tables not scrollable**: Data tables overflow on mobile

## Solutions Implemented

### 1. Tab Navigation - Icon Only on Mobile
```tsx
// Show full label on desktop, icon only on mobile
<span className="hidden sm:inline">Staff</span>
<span className="sm:hidden">👨‍🏫</span>
```

### 2. Staff/Student Lists - Stack on Mobile
```tsx
// Desktop: 3-column grid
// Tablet: 2-column grid
// Mobile: 1-column (full width)
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```

### 3. Forms - Responsive Inputs
```tsx
// Inputs stack vertically on mobile
// Buttons full width on mobile, side-by-side on desktop
className="grid grid-cols-1 sm:grid-cols-2 gap-4"
```

### 4. Data Tables - Horizontal Scroll
```tsx
// Wrap tables in scrollable container
className="overflow-x-auto"
```

## Implementation Checklist

- [ ] Update tab styling with `hidden sm:inline` for labels
- [ ] Change all grids to responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- [ ] Wrap tables in `overflow-x-auto`
- [ ] Reduce padding on mobile: `px-3 sm:px-6`
- [ ] Stack form inputs on mobile
- [ ] Make buttons full width on mobile: `w-full sm:w-auto`
- [ ] Adjust font sizes for mobile readability

## Next Steps
1. Apply these changes to the dashboard page
2. Test on mobile devices
3. Verify all tabs and sections are usable
4. Check form submission works on mobile

