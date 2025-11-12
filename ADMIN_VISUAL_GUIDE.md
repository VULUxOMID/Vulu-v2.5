# 🎨 Admin Panel Visual Design Guide

## Color Palette Reference

### Primary Colors
```
Background:      #0f1117  ████████  (App background)
Card Background: #151924  ████████  (Cards, modules)
List Item BG:    #14161B  ████████  (Log items)
```

### Text Colors
```
Primary Text:    #FFFFFF  ████████  (Headings, values)
Secondary Text:  #D1D5DB  ████████  (Body text)
Muted Text:      #9AA3B2  ████████  (Labels, timestamps)
```

### Accent Colors
```
Purple (Primary): #5865F2  ████████  (Tabs, primary actions)
Green (Success):  #43B581  ████████  (Active, approved)
Orange (Warning): #F59E0B  ████████  (Updates, streams)
Red (Danger):     #F04747  ████████  (Flagged, suspended)
```

---

## Component Breakdown

### 1. Header (Gradient)
```
┌─────────────────────────────────────────┐
│ ← [Shield Icon] Admin Panel      [↻]   │  ← Purple gradient
│   [SUPER] badge                         │     #7C62F4 → #5B4BD6
└─────────────────────────────────────────┘
```

**Styling:**
- Gradient: `['#7C62F4', '#5B4BD6']`
- Height: Auto (padding-based)
- Shadow: `elevation: 8`, `shadowOpacity: 0.3`
- Icons: 24px white
- Badge: Green pill with shield icon

---

### 2. Tab Bar
```
┌─────────────────────────────────────────┐
│ [📊 Dashboard] [👥 Users] [🛡️ Content] [📋 Logs] │
│      ═══                                │  ← Active indicator (3px purple)
└─────────────────────────────────────────┘
```

**Styling:**
- Background: `#151924`
- Border bottom: `1px solid rgba(255, 255, 255, 0.06)`
- Active indicator: 3px purple bar
- Icons: 18px
- Text: 13px, uppercase for active

---

### 3. Statistics Card
```
┌─────────────────────────────────────────┐
│  ┌────┐  TOTAL USERS                    │  ← Gradient background
│  │ 👥 │  1,234                           │     rgba(255,255,255,0.05)
│  └────┘                                  │  ← Icon in gradient circle
└─────────────────────────────────────────┘     56x56px
```

**Styling:**
- Border radius: 16px
- Padding: 16px
- Icon circle: 56x56px with gradient
- Border: `1px solid rgba(255, 255, 255, 0.06)`
- Shadow: `elevation: 4`

**Icon Gradients:**
- Users: Purple `['#7C62F4', '#5B4BD6']`
- Active: Green `['#43B581', '#2D7D5A']`
- Streams: Orange `['#F59E0B', '#D97706']`
- Flagged: Red `['#F04747', '#C73636']`

---

### 4. Quick Action Button
```
┌──────────────────────┐
│  👥  Manage Users    │  ← Gradient background
└──────────────────────┘     rgba(88,101,242,0.15)
```

**Styling:**
- Border radius: 12px
- Padding: 16px
- Gradient: Color-specific with 15% opacity
- Icon: 20px
- Text: 13px, bold

---

### 5. Log Item (Discord-style)
```
┌─────────────────────────────────────────┐
│  ┌────┐  [USER_SUSPENDED]    2h ago     │
│  │ 🛡️ │  Suspended user for violating   │
│  └────┘  terms of service               │
│          👤 admin@app.com  👤 user@app.com │
└─────────────────────────────────────────┘
```

**Styling:**
- Background: `#14161B`
- Border radius: 14px
- Padding: 16px
- Avatar: 48x48px gradient circle
- Action badge: Pill with dynamic color
- Border: `1px solid rgba(255, 255, 255, 0.06)`

**Badge Colors:**
- Suspend/Delete: `rgba(240, 71, 71, 0.15)` (Red)
- Unsuspend/Create: `rgba(67, 181, 129, 0.15)` (Green)
- Update: `rgba(245, 158, 11, 0.15)` (Orange)
- Default: `rgba(88, 101, 242, 0.15)` (Blue)

---

## Layout Structure

### Dashboard Tab
```
┌─────────────────────────────────────────┐
│                                         │
│  [Stat Card 1]                          │
│  [Stat Card 2]                          │
│  [Stat Card 3]                          │
│  [Stat Card 4]                          │
│  [Stat Card 5]                          │
│  [Stat Card 6]                          │
│                                         │
│  QUICK ACTIONS                          │
│  ┌──────────┐ ┌──────────┐             │
│  │ Manage   │ │ Review   │             │
│  │ Users    │ │ Reports  │             │
│  └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐             │
│  │Analytics │ │ Settings │             │
│  └──────────┘ └──────────┘             │
│                                         │
└─────────────────────────────────────────┘
```

### Logs Tab
```
┌─────────────────────────────────────────┐
│                                         │
│  RECENT ADMIN ACTIONS                   │
│                                         │
│  [Log Item 1]                           │
│  [Log Item 2]                           │
│  [Log Item 3]                           │
│  [Log Item 4]                           │
│  ...                                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Spacing System

```
xs:    4px   ▪
sm:    8px   ▪▪
md:   16px   ▪▪▪▪
lg:   24px   ▪▪▪▪▪▪
xl:   32px   ▪▪▪▪▪▪▪▪
xxl:  48px   ▪▪▪▪▪▪▪▪▪▪▪▪
xxxl: 64px   ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪
```

**Usage:**
- Card padding: `md` (16px)
- Section padding: `md` (16px)
- Gap between cards: `md` (16px)
- Gap between action buttons: `sm` (8px)
- Empty state padding: `xxxl` (64px)

---

## Typography Scale

```
Header Title:     22px, Bold, White
Section Title:    14px, Bold, Muted, UPPERCASE
Stat Value:       28px, Bold, White
Stat Title:       13px, SemiBold, Muted, UPPERCASE
Body Text:        14px, Regular, Secondary
Small Text:       13px, SemiBold, Primary
Tiny Text:        11px, Medium, Muted
Badge Text:       12px, Bold, White, UPPERCASE
```

---

## Shadow & Elevation

### Header
```
shadowColor: '#000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.3
shadowRadius: 8
elevation: 8
```

### Cards
```
shadowColor: '#000'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.2
shadowRadius: 8
elevation: 4
```

### Icon Circles
```
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.3
shadowRadius: 4
elevation: 3
```

---

## Animation Specs

### Tab Switch Animation
```typescript
Fade In:
  - From: opacity 0
  - To: opacity 1
  - Duration: 300ms
  - Easing: Linear

Slide Up:
  - From: translateY 50
  - To: translateY 0
  - Duration: ~300ms
  - Easing: Spring (tension: 50, friction: 7)
```

**Result:** Smooth, natural transition when switching tabs

---

## Icon Reference

### Header
- Back: `arrow-back` (Ionicons, 24px)
- Title: `shield-crown` (MaterialCommunityIcons, 24px)
- Badge: `shield-check` (MaterialCommunityIcons, 12px)
- Refresh: `refresh` (Ionicons, 24px)

### Tabs
- Dashboard: `view-dashboard` (MaterialCommunityIcons, 18px)
- Users: `account-group` (MaterialCommunityIcons, 18px)
- Content: `shield-check` (MaterialCommunityIcons, 18px)
- Logs: `clipboard-text` (MaterialCommunityIcons, 18px)

### Stats
- Total Users: `account-group` (MaterialCommunityIcons, 24px)
- Active Users: `account-check` (MaterialCommunityIcons, 24px)
- Total Streams: `video` (MaterialCommunityIcons, 24px)
- Active Streams: `broadcast` (MaterialCommunityIcons, 24px)
- Messages: `message-text` (MaterialCommunityIcons, 24px)
- Flagged: `alert-circle` (MaterialCommunityIcons, 24px)

### Actions
- Manage Users: `account-group` (MaterialCommunityIcons, 20px)
- Review Reports: `flag` (MaterialCommunityIcons, 20px)
- Analytics: `chart-line` (MaterialCommunityIcons, 20px)
- Settings: `cog` (MaterialCommunityIcons, 20px)

### Log Actions
- Suspend: `account-cancel` (MaterialCommunityIcons, 20px)
- Unsuspend: `account-check` (MaterialCommunityIcons, 20px)
- Delete: `delete` (MaterialCommunityIcons, 20px)
- Update: `pencil` (MaterialCommunityIcons, 20px)
- Create: `plus-circle` (MaterialCommunityIcons, 20px)
- Default: `information` (MaterialCommunityIcons, 20px)

---

## Responsive Breakpoints

### Small Phones (< 375px width)
- All elements scale proportionally
- Minimum touch target: 48x48px maintained
- Font sizes remain readable (min 11px)

### Medium Phones (375px - 414px)
- Optimal layout
- 2-column action button grid
- Comfortable spacing

### Large Phones (> 414px)
- Same layout, more breathing room
- Increased padding feels natural
- No layout shifts

### Landscape
- ScrollView handles overflow
- No horizontal scrolling
- All content accessible

---

## Best Practices Applied

✅ **Consistency:** All components use the same design tokens
✅ **Hierarchy:** Clear visual hierarchy with size, weight, and color
✅ **Spacing:** Consistent 8px grid system throughout
✅ **Contrast:** WCAG AA compliant text contrast ratios
✅ **Touch Targets:** Minimum 48x48px for all interactive elements
✅ **Feedback:** Animations provide clear state changes
✅ **Performance:** Native driver animations for 60fps
✅ **Accessibility:** Proper semantic structure and labels

---

## Testing Checklist

- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (medium screen)
- [ ] Test on iPhone 14 Pro Max (large screen)
- [ ] Test in portrait orientation
- [ ] Test in landscape orientation
- [ ] Verify all animations are smooth
- [ ] Check all touch targets are accessible
- [ ] Verify text is readable in all states
- [ ] Test pull-to-refresh functionality
- [ ] Verify tab switching works correctly

---

**The admin panel now perfectly matches your app's Discord-style design!** 🎨✨

