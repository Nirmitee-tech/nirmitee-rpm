# RaptorX Design System Guide

A comprehensive design system and component architecture guide for building enterprise fraud detection and risk management applications.

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Sizing](#spacing--sizing)
5. [Component Architecture](#component-architecture)
6. [Buttons](#buttons)
7. [Form Inputs](#form-inputs)
8. [Cards & Containers](#cards--containers)
9. [Tables](#tables)
10. [Status Chips & Badges](#status-chips--badges)
11. [Modals & Dialogs](#modals--dialogs)
12. [Navigation Patterns](#navigation-patterns)
13. [Gradients & Visual Effects](#gradients--visual-effects)
14. [Dark Mode](#dark-mode)
15. [Icons](#icons)
16. [Charts & Visualizations](#charts--visualizations)
17. [Layout Patterns](#layout-patterns)

---

## Technology Stack

### Core Framework
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.21.3",
  "vite": "^6.3.5"
}
```

### Styling
```json
{
  "tailwindcss": "3.4.14",
  "class-variance-authority": "^0.7.0",
  "tailwind-merge": "^2.5.4",
  "nightwind": "^1.1.13"
}
```

### UI Component Libraries
```json
{
  "@heroui/react": "^2.7.8",
  "@mui/material": "^5.15.7",
  "@mui/x-data-grid": "^7.24.1",
  "@radix-ui/react-select": "^2.2.6",
  "lucide-react": "^0.453.0"
}
```

### State Management & Forms
```json
{
  "zustand": "^5.0.6",
  "react-hook-form": "^7.53.0",
  "@tanstack/react-query": "^5.59.19",
  "@tanstack/react-table": "^8.20.5"
}
```

### Charts & Visualization
```json
{
  "@amcharts/amcharts4": "^4.10.38",
  "apexcharts": "^3.49.0",
  "react-apexcharts": "^1.4.1",
  "d3": "^7.9.0",
  "@xyflow/react": "^12.8.5"
}
```

---

## Color System

### Brand Colors

| Name | Light Mode | Dark Mode | CSS Class | Usage |
|------|------------|-----------|-----------|-------|
| **Primary/Brand** | `#745EE1` | `#745EE1` | `.text-brand`, `.bg-brand` | Primary actions, links, highlights |
| **Brand Light** | `#6d6e87` | `#6d6e87` | `text-brandLight` | Secondary brand elements |

### Background Colors

| Name | Light Mode | Dark Mode | CSS Class | Usage |
|------|------------|-----------|-----------|-------|
| **Primary BG** | `#F8F7FC` | `#000000` | `.background-primary` | Main page background |
| **White BG** | `#FFFFFF` | `#000000` | `.background-white` | Card backgrounds |
| **Secondary BG** | `#F4F4F4` | `#2D2D2F` | `.background-secondary` | Elevated surfaces |
| **Tertiary BG** | `#212630` | `#212630` | `.background-tertiary` | Dark panels |
| **Quaternary BG** | `#888888` | `#343434` | `.background-quaternary` | Disabled states |

### Text Colors

| Name | Light Mode | Dark Mode | CSS Class | Usage |
|------|------------|-----------|-----------|-------|
| **Primary Text** | `rgba(0,0,0,0.95)` | `#FFFFFF` | `.text-primary` | Body text |
| **Title Text** | `rgba(0,0,0,0.80)` | `#FFFFFF` | `.text-title` | Headings |
| **Secondary Text** | `rgba(0,0,0,0.60)` | `#b3b5b8` | `.text-secondary` | Descriptions, hints |
| **Gray Text** | `rgba(0,0,0,0.80)` | `#b3b5b8` | `.text-gray` | Muted content |
| **Brand Text** | `#745EE1` | `#745EE1` | `.text-brand-dark` | Highlighted text |

### Semantic/Status Colors

| Status | Color | CSS Class | Usage |
|--------|-------|-----------|-------|
| **Success** | `#5BCC56` / `#157B10` | `.text-success`, `.background-success-button` | Positive actions, approved |
| **Danger/Error** | `#FF4351` / `#FF524E` | `.text-danger`, `.background-danger-button` | Errors, delete, decline |
| **Warning** | Yellow-100/700 | `.chip-yellow` | Warnings, pending |
| **Info** | Blue-100/700 | `.chip-blue` | Information |

### Border Colors

| Name | Light Mode | Dark Mode | CSS Class |
|------|------------|-----------|-----------|
| **Primary Border** | `#D7D7D7` | `#212121` | `.border-primary` |
| **Secondary Border** | `#ffffff1a` | `#ffffff1a` | `.border-secondary` |
| **Tertiary Border** | `#B4B3B3` | `#4B4B4B` | `.border-tertiary` |
| **Brand Border** | `#745EE150` | `#745EE150` | `.border-brand` |
| **Brand Dark Border** | `#745EE1` | `#745EE1` | `.border-brand-dark` |

### Tailwind Config Extension

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: "#745EE1",
        brandLight: "#6d6e87",
        lightGrayDark: "#2d2d2f",
        danger: "#FF524E",
        grayInput: "#212121",
        borderGray: "#FCFCFC30",
        borderGray2: "#3F3B3B",
        safed: "#fff",
        sec: "#EAEAEA",
        ter: "#DADADA",
        primary: "#745EE1",
      },
    },
  },
};
```

---

## Typography

### Font Families

```css
/* Primary Font - Body Text */
font-family: "Public Sans", sans-serif;

/* Logo/Brand Font */
font-family: "Lexend", sans-serif;

/* Legacy/Alternative */
font-family: "Gilroy", sans-serif;

/* Code/Monospace */
font-family: "Fira Code", monospace;
```

### Font Import

```css
@import url("https://fonts.googleapis.com/css2?family=Lexend:wght@100;200;300;400;500;600;700;800;900&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900&display=swap");
```

### Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| 100 | `.font-thin` | Decorative only |
| 400 | `.font-regular` | Body text |
| 500 | `.font-medium`, `.font-med` | Emphasis |
| 600 | `.font-semi` | Subheadings |
| 700 | `.font-bold` | Headings |

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 24px | 700 | 1.4 |
| H2 | 18px | 600 | 1.4 |
| H3 | 16px | 600 | 1.4 |
| H4 | 14px | 600 | 1.4 |
| Body | 14px | 400 | normal |
| Small | 12px | 400 | normal |
| Caption | 10px | 400 | normal |

### CSS Classes

```css
/* Headings */
.heading3 {
  @apply text-sm font-semibold;
}

/* Utility Classes */
.graySmall {
  @apply text-[#807E7E] text-sm font-regular;
}

.whiteMedium {
  @apply text-[#fff] text-sm;
}

.textWhiteMedium {
  @apply text-base text-[#fff];
}
```

---

## Spacing & Sizing

### Base Unit
- Base: `4px`
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Common Spacing Patterns

| Context | Value | Tailwind Class |
|---------|-------|----------------|
| Card padding | 16px | `p-4` |
| Section gap | 20px | `gap-5` |
| Item spacing | 8-12px | `gap-2` to `gap-3` |
| Button padding | 10px 16px | `px-4 py-2.5` |
| Input height | 40-44px | `h-10` or `h-[44px]` |
| Icon size | 16-20px | `w-4 h-4` or `w-5 h-5` |

### Border Radius

| Size | Value | Usage |
|------|-------|-------|
| Small | 4px | Tags, small buttons |
| Medium | 6px | Cards, inputs |
| Large | 8px | Modals, panels |
| Full | 20px | Pills, nav tabs |

---

## Component Architecture

### File Structure Pattern

```
src/
├── components/           # Legacy/shared components
│   ├── UtilityComponents/
│   │   ├── Buttons/
│   │   ├── TabMenu/
│   │   ├── ConfirmModal/
│   │   └── BreadCrumb/
│   └── [Feature]Components/
│       ├── [Feature].jsx
│       └── [feature].css
├── micro/                # Modern micro-frontend architecture
│   ├── components/
│   │   ├── ui/          # Primitive UI components
│   │   │   ├── Button.jsx
│   │   │   ├── input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── badge.jsx
│   │   │   └── checkbox.jsx
│   │   ├── FormComponents/
│   │   └── entity/
│   ├── features/        # Feature modules
│   ├── pages/           # Page components
│   └── utils/           # Utilities
└── services/            # API services
```

### Component Pattern (CVA - Class Variance Authority)

```jsx
import { cva } from "class-variance-authority";
import { cn } from "../../utils/utils";

const componentVariants = cva(
  // Base styles
  "base-classes here",
  {
    variants: {
      variant: {
        default: "variant-default-classes",
        secondary: "variant-secondary-classes",
      },
      size: {
        default: "size-default-classes",
        sm: "size-sm-classes",
        lg: "size-lg-classes",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Component = ({ className, variant, size, ...props }) => {
  return (
    <div className={cn(componentVariants({ variant, size, className }))} {...props} />
  );
};
```

### Utility Function (cn)

```javascript
// utils/utils.js
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

---

## Buttons

### Button Variants

```jsx
const buttonVariants = cva(
  "inline-flex items-center mx-1 justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-semibold text-sm",
  {
    variants: {
      variant: {
        default: "background-primary-button hover:text-white text-primary-foreground hover:background-secondary-button text-white dark:text-black",
        white: "background-white hover:background-white text-black",
        success: "background-success-button text-primary hover:background-success-button",
        outlineSuccess: "border-brand-dark background-transparent hover:bg-success dark:hover:bg-success text-success dark:hover:text-black hover:text-white",
        gray: "bg-gray-200 text-primary hover:bg-gray-300",
        danger: "bg-white border-danger-button text-danger hover:bg-[#FF4351] hover:text-white dark:hover:text-black",
        destructive: "background-danger-button text-white dark:text-black hover:background-danger-button",
        outline: "border-brand-dark background-transparent hover:bg-[#745EE1] dark:hover:bg-[#745EE1] text-brand-dark dark:hover:text-black hover:text-white",
        secondary: "background-secondary-button text-secondary-foreground hover:background-secondary-button",
        ghost: "hover:background-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1.5 text-sm sm:h-10 sm:px-4 sm:py-2",
        xs: "h-6 px-2 py-1 text-xs sm:h-7 sm:px-2",
        sm: "h-7 px-2 py-1 text-sm sm:h-9 sm:px-3 sm:py-1.5",
        lg: "h-9 px-4 py-2 text-sm sm:h-11 sm:px-8 sm:text-base",
        icon: "h-8 w-8 sm:h-10 sm:w-10",
      },
    },
  }
);
```

### Button Usage

```jsx
// Primary Button
<Button variant="default">Save Changes</Button>

// Outline Button
<Button variant="outline">Cancel</Button>

// Danger Button
<Button variant="destructive">Delete</Button>

// Success Button
<Button variant="success">Approve</Button>

// With Link
<Button variant="default" to="/dashboard">Go to Dashboard</Button>

// Icon Button
<Button variant="ghost" size="icon">
  <SearchIcon />
</Button>
```

### CSS Button Classes

```css
/* Primary Button Background */
.background-primary-button {
  @apply bg-[#745EE1] dark:bg-[#745EE1];
}

/* Secondary Button Background */
.background-secondary-button {
  @apply bg-[#E2DCFF] dark:bg-[#E2DCFF]/15;
}

/* Success Button Background */
.background-success-button {
  @apply bg-[#5BCC56] dark:bg-[#5BCC56];
}

/* Danger Button Background */
.background-danger-button {
  @apply bg-[#FF4351] dark:bg-[#FF4351];
}
.background-danger-button:hover {
  @apply bg-[#FF4351]/80 dark:bg-[#FF4351]/80;
}

/* Default Button Base */
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 10px;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: border-color 0.25s;
}
```

---

## Form Inputs

### Input Component

```jsx
const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
```

### Form Input with Label (React Hook Form)

```jsx
const FormInput = ({
  control,
  name,
  label,
  type = "text",
  required = false,
  placeholder = "",
  errors,
  className = "",
  disabled = false,
  validation = {},
  ...props
}) => (
  <div className={`mb-1 ${className}`}>
    <div className="font-regular text-base mb-1 text-primary">
      {label} {required && <span className="text-red-500">*</span>}
    </div>
    <Controller
      name={name}
      control={control}
      rules={validation}
      render={({ field }) => (
        <>
          <input
            {...field}
            type={type}
            disabled={disabled}
            className={`w-full h-[44px] box-border font-regular text-sm border ${
              errors[name] ? "border-red-500" : "border-gray-300"
            } rounded-md p-3 text-primary ${
              disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
            }`}
            placeholder={placeholder}
          />
          {errors[name] && (
            <p className="mt-1 text-sm text-red-500">{errors[name].message}</p>
          )}
        </>
      )}
    />
  </div>
);
```

### Focus Styles

```css
.custom-input-focus-style {
  @apply focus:outline-none focus:ring-1 focus:ring-[#745ee1] focus:border-[#745ee1];
  @apply dark:focus:ring-[#745ee1] dark:focus:border-[#745ee1];
}
```

### Select Component (Radix UI)

```jsx
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </SelectPrimitive.Trigger>
));
```

---

## Cards & Containers

### Base Container

```jsx
const Container = ({ children, className = "" }) => {
  return (
    <div className={cn("p-4 w-full bg-[#F8F7FC] dark:bg-white rounded box-border", className)}>
      {children}
    </div>
  );
};
```

### Card Pattern

```css
/* Dashboard Card */
.dashboard-transaction-details-box {
  background-color: #1b2129;
  border-radius: 4px;
  padding: 10px;
  min-width: 320px;
  border: 1px solid #ffffff1a;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
}

/* Statistics Card */
.dashborad-statistics-item {
  flex: 1 1 20%;
  background-color: #151f28;
  border: 1px solid #202b39;
  padding: 10px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Light Mode Card (Settings) */
.settings-section {
  margin-bottom: 20px;
  padding: 20px;
  border-radius: 10px;
  background-color: white;
  font-weight: 500;
}
```

### Card with Item Background

```css
/* Purple tinted card background */
.background-item-card {
  @apply bg-[#7E82FF]/10 dark:bg-[#7E82FF]/15;
}
```

### Gradient Border Card

```css
.purpleBoxGradient {
  background: radial-gradient(
    108.22% 216.39% at 100% -13.89%,
    rgba(116, 94, 225, 0.3) 0%,
    rgba(22, 22, 24, 0) 100%
  );
  border-radius: 10px;
  border: 1px solid transparent;
  border-image: linear-gradient(
    180deg,
    rgba(116, 94, 225, 0.5) 0%,
    rgba(74, 51, 153, 0.4) 100%
  );
}
```

---

## Tables

### Table Styling

```css
/* Applied Table (Light Theme) */
.appliedTable td,
.appliedTable th {
  @apply text-left py-3 text-sm px-1;
}

.appliedTable th {
  @apply text-nowrap font-bold;
}

.appliedTable tbody td {
  @apply font-regular;
}

/* Custom Table - Remove Last Row Border */
.customTable tr:last-child td {
  border-bottom: none;
  padding-bottom: 0px;
}
```

### Using MUI DataGrid

```jsx
import { DataGrid } from "@mui/x-data-grid";

const columns = [
  { field: "id", headerName: "ID", width: 90 },
  { field: "name", headerName: "Name", flex: 1 },
  { field: "status", headerName: "Status", width: 120 },
];

<DataGrid
  rows={data}
  columns={columns}
  pageSize={10}
  checkboxSelection
  disableSelectionOnClick
/>
```

### Using TanStack Table

```jsx
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});
```

---

## Status Chips & Badges

### Chip Classes

```css
/* Brand/Primary Chip */
.chip-alert {
  @apply bg-[#dbd4fd] dark:bg-[#745EE1]/20 text-[#6B4EFF];
}

/* Gray Chip */
.chip-alert-gray {
  @apply bg-[#E5E5E5] text-[#4B4B4B] dark:text-black dark:bg-[#E5E5E5]/15;
}

/* Success/Green Chip */
.chip-green {
  @apply bg-[#D1FADF] text-[#027A48] dark:bg-[#D1FADF]/15;
}

/* Danger/Red Chip */
.chip-red {
  @apply bg-[#FF4351]/15 text-[#FF4351] dark:text-[#FF4351] dark:bg-[#FF4351]/15;
}

/* Table Green Chip */
.chip-table-green {
  @apply bg-[#5BCC56]/20 text-[#3DBD38] dark:text-[#3DBD38] dark:bg-[#5BCC56]/15;
}

/* Table Red Chip */
.chip-table-red {
  @apply bg-[#FF4351]/15 text-[#FF4351] dark:text-[#FF4351] dark:bg-[#FF4351]/30;
}

/* Warning/Yellow Chip */
.chip-yellow {
  @apply bg-yellow-100 text-yellow-700;
}

/* Info/Blue Chip */
.chip-blue {
  @apply bg-blue-100 text-blue-700;
}

/* Cyan Chip */
.chip-cyan {
  @apply bg-cyan-100 text-cyan-700;
}

/* Purple Chip */
.chip-purple {
  @apply bg-purple-100 text-purple-700;
}

/* Pink Chip */
.chip-pink {
  @apply bg-pink-100 text-pink-700;
}
```

### Badge Component

```jsx
const badgeVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground border border-input bg-background hover:bg-accent",
};

function Badge({ className = "", variant = "default", ...props }) {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${badgeVariants[variant]} ${className}`}
      {...props}
    />
  );
}
```

### Tag Component

```css
.tag {
  border: 1px solid #47446c;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
  min-width: 70px;
  margin: 0px 5px;
  align-items: center;
  display: flex;
}
```

---

## Modals & Dialogs

### Dialog Component (Context-Based)

```jsx
const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext);
  return (
    <div
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
});

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6",
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </DialogPortal>
  );
});

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
));
```

### Usage

```jsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure you want to proceed?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Navigation Patterns

### Sidebar Navigation

```css
.logo-menu-container {
  height: calc(-60px + 100vh);
  overflow-x: hidden;
  overflow-y: auto;
  width: 202px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
}

/* Hide scrollbar */
.logo-menu-container::-webkit-scrollbar {
  display: none;
}
.logo-menu-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

### Tab Navigation

```jsx
const TabsButtonComponent = ({ active, title, ...props }) => {
  return (
    <button
      className={`
        capitalize bg-transparent text-black rounded-none rounded-t-md
        font-medium py-2 px-4 text-sm transition-all duration-300 ease-in-out
        text-nowrap border-0 hover:bg-[#E2DCFF] dark:hover:bg-neutral-100
        ${active ? "text-brand font-bold border-b-2 border-solid border-[#745ee1]" : ""}
      `}
      {...props}
    >
      {title}
    </button>
  );
};
```

### Dashboard Nav Tab

```css
.dashboard-nav-tab {
  font-weight: 500;
  letter-spacing: 0.3px;
  padding: 5px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  background-color: #11171f;
  border: 1px solid #202a37;
}
```

### Breadcrumb

```jsx
const Breadcrum = ({ menu, children }) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-x-3 pb-4">
        <KeyboardBackspace className="cursor-pointer text-black" onClick={() => window.history.back()} />
        {menu.map((item, index) => (
          <React.Fragment key={index}>
            {item.path ? (
              <Link to={item.path} className="flex items-center text-black hover:text-black/70">
                <span className="mr-1 font-regular text-black text-sm">{item.name}</span>
                {index !== menu.length - 1 && <KeyboardArrowRight fontSize="small" />}
              </Link>
            ) : (
              <div className="flex items-center text-black">
                <span className="mr-1 font-regular text-black text-sm">{item.name}</span>
                {index !== menu.length - 1 && <KeyboardArrowRight fontSize="small" />}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      {children}
    </div>
  );
};
```

---

## Gradients & Visual Effects

### Background Gradients

```css
/* Brand Gradient */
.background-brand-gradient {
  background-image: radial-gradient(
    217.37% 132.16% at 100% -13.89%,
    rgba(116, 94, 225, 0.3) 0%,
    rgba(22, 22, 24, 0) 100%
  );
}

/* Green Gradient (Success) */
.gradientGreen {
  background: radial-gradient(
    60% 80% at top right,
    rgba(19, 217, 179, 0.21) 0%,
    rgba(22, 22, 24, 0) 100%
  );
}

/* Yellow Gradient (Warning) */
.gradientYellow {
  background: radial-gradient(
    60% 80% at top right,
    rgba(164, 217, 19, 0.21) 0%,
    rgba(22, 22, 24, 0) 100%
  );
}

/* Purple Gradient (Info) */
.gradientPurple {
  background: radial-gradient(
    60% 80% at top right,
    rgba(72, 132, 223, 0.3) 0%,
    rgba(22, 22, 24, 0) 100%
  );
}

/* Blue/Brand Gradient */
.gradientBlue {
  background: radial-gradient(
    80% 100% at top right,
    rgb(117 94 226 / 35%) 0%,
    rgba(22, 22, 24, 0) 100%
  );
}
```

### Border Gradients

```css
.borderGradientBlue {
  background: linear-gradient(136.02deg, #925ac43b 0%, #755ee28f 98.28%);
}

.borderGradientPurple {
  background: linear-gradient(
    180deg,
    rgba(124, 85, 255, 0.5) 0%,
    rgba(74, 51, 153, 0.4) 100%
  );
}
```

### Button Gradient

```css
.btnGradient {
  background: linear-gradient(
    311.93deg,
    rgba(63, 59, 59, 0.5) -69.56%,
    rgba(22, 22, 24, 0.5) 73.66%
  );
}
```

### Shadows

```css
.shadow-brand-gradient {
  box-shadow: 0px 2px 5px 0px rgba(116, 94, 225, 0.2);
}
```

### Blur Effect / Overlay

```css
.overlay {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: rgba(31, 41, 55, 0.3);
  backdrop-filter: blur(12px);
  align-items: center;
  justify-content: center;
}

/* Blur wrapper for loading states */
.blur-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.blur-background {
  position: absolute;
  inset: 0;
  filter: blur(8px);
  pointer-events: none;
  z-index: 1;
}
```

---

## Dark Mode

### Implementation with Nightwind + Tailwind

```javascript
// tailwind.config.js
import nightwind from "nightwind";

export default {
  darkMode: "class",
  plugins: [nightwind],
};
```

### Toggle Pattern

```jsx
// Add 'dark' class to html element
document.documentElement.classList.toggle('dark');
```

### Dark Mode Color Mappings

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#F8F7FC` | `#000000` |
| Surface | `#FFFFFF` | `#000000` |
| Secondary BG | `#F4F4F4` | `#2D2D2F` |
| Primary Text | `rgba(0,0,0,0.95)` | `#FFFFFF` |
| Secondary Text | `rgba(0,0,0,0.60)` | `#b3b5b8` |
| Border | `#D7D7D7` | `#212121` |

### Dark Mode Classes

```css
/* Example dual-mode class */
.background-primary {
  @apply bg-[#F8F7FC] dark:bg-[#000000];
}

.text-primary {
  @apply text-[#000000]/95 dark:text-[#ffffff];
}

.border-primary {
  @apply border rounded-lg border-[#D7D7D7] dark:border-[#212121];
}
```

---

## Icons

### Icon Libraries Used

1. **Lucide React** (Primary)
```jsx
import { Search, Plus, X, ChevronDown, Check } from "lucide-react";
```

2. **MUI Icons**
```jsx
import { KeyboardBackspace, KeyboardArrowRight } from "@mui/icons-material";
```

3. **React Icons**
```jsx
import { FaSearch, FaPlus } from "react-icons/fa";
```

### Icon Sizing

| Size | Dimensions | Usage |
|------|------------|-------|
| XS | 12x12 | Inline with small text |
| SM | 16x16 | Buttons, inputs |
| MD | 20x20 | Default |
| LG | 24x24 | Standalone |
| XL | 32x32 | Featured |

### Icon Button Pattern

```jsx
<button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
  <Search className="h-4 w-4 text-gray-600" />
</button>
```

---

## Charts & Visualizations

### ApexCharts Theme

```jsx
const chartOptions = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
  },
  colors: ['#745EE1', '#5BCC56', '#FF4351', '#35ADF4'],
  theme: {
    mode: 'dark', // or 'light'
  },
  grid: {
    borderColor: '#2D2D2F',
  },
  xaxis: {
    labels: {
      style: { colors: '#b3b5b8' }
    }
  },
  yaxis: {
    labels: {
      style: { colors: '#b3b5b8' }
    }
  }
};
```

### Chart Color Palette

| Index | Color | Usage |
|-------|-------|-------|
| 1 | `#745EE1` | Primary data |
| 2 | `#5BCC56` | Success/positive |
| 3 | `#FF4351` | Danger/negative |
| 4 | `#35ADF4` | Info/secondary |
| 5 | `#FFB800` | Warning |
| 6 | `#00D4BD` | Teal/alternative |

---

## Layout Patterns

### Main Layout Structure

```jsx
// Layout with sidebar
<div className="flex h-screen w-screen">
  {/* Sidebar */}
  <aside className="w-[210px] h-full bg-black flex flex-col">
    {/* Logo */}
    <div className="logo-container">{/* Logo */}</div>
    {/* Navigation */}
    <nav className="logo-menu-container">{/* Nav items */}</nav>
  </aside>

  {/* Main Content */}
  <main className="flex-1 flex flex-col overflow-hidden">
    {/* Header */}
    <header className="h-[60px] border-b border-primary">{/* Header content */}</header>

    {/* Content Area */}
    <div className="flex-1 overflow-auto background-primary p-4">
      {children}
    </div>
  </main>
</div>
```

### Page Container Pattern

```jsx
const PageContainer = ({ children, title, breadcrumb, actions }) => {
  return (
    <div className="background-primary min-h-full p-4">
      {/* Breadcrumb */}
      {breadcrumb && <Breadcrum menu={breadcrumb}>{actions}</Breadcrum>}

      {/* Page Title */}
      {title && <h1 className="text-xl font-semibold text-primary mb-4">{title}</h1>}

      {/* Content */}
      <div className="background-white rounded-lg border-primary p-4">
        {children}
      </div>
    </div>
  );
};
```

### Responsive Grid

```css
/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* Flex Grid Pattern */
.flex-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.flex-grid-item {
  flex: 1 1 20%;
  min-width: 280px;
}
```

### Scrollbar Styling

```css
/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #2e2e2e;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(190, 190, 190, 0.2);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Dropdown Scrollbar (Light) */
.custom-dropdown-scroll::-webkit-scrollbar {
  width: 6px;
}

.custom-dropdown-scroll::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 10px;
}

.custom-dropdown-scroll::-webkit-scrollbar-thumb {
  background: #d1d1d1;
  border-radius: 10px;
}

/* Hide Scrollbar */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Healthcare Application Adaptation

### Recommended Color Palette Changes

For a healthcare application, consider these color adaptations:

| Purpose | Finance (Current) | Healthcare (Suggested) |
|---------|-------------------|------------------------|
| Primary/Brand | `#745EE1` (Purple) | `#0077B6` (Medical Blue) or `#2A9D8F` (Teal) |
| Success | `#5BCC56` | `#40916C` (Healthcare Green) |
| Danger/Alert | `#FF4351` | `#E63946` |
| Warning | `#FFB800` | `#F77F00` |
| Info | `#35ADF4` | `#4361EE` |

### Healthcare-Specific Components to Add

1. **Patient Status Indicators**
2. **Medical Record Cards**
3. **Appointment Timeline**
4. **Vital Signs Dashboard**
5. **Lab Results Display**
6. **Medication Lists**
7. **HIPAA-Compliant Data Masking**

### Accessibility Considerations

- Ensure WCAG 2.1 AA compliance
- Color contrast ratio minimum 4.5:1 for text
- Screen reader compatibility
- Keyboard navigation support
- Focus indicators

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `Button.jsx`, `FormInput.jsx` |
| CSS Files | kebab-case or camelCase | `dashboard.css`, `alertDetail.css` |
| Utilities | camelCase | `utils.js`, `formatDate.js` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS.js` |
| Types | PascalCase | `UserTypes.ts` |

---

## Best Practices Summary

1. **Use CVA for variant-based components** - Ensures consistent styling patterns
2. **Leverage Tailwind utility classes** - For rapid prototyping and maintainability
3. **Create CSS utility classes for repeated patterns** - DRY principle
4. **Support dark mode from the start** - Use `dark:` prefix consistently
5. **Use semantic color names** - `background-primary` vs `bg-[#F8F7FC]`
6. **Component composition over configuration** - Build complex UIs from simple parts
7. **Responsive design by default** - Mobile-first approach with breakpoints
8. **Consistent spacing scale** - Stick to the 4px base unit

---

*This design system guide was extracted from the RaptorX Frontend codebase for reference in building similar enterprise applications.*
