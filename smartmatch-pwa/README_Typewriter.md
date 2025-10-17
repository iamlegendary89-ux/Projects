# Typewriter Component Documentation

## Overview
A React component that creates a classic typewriter effect by revealing text character-by-character in real-time with a blinking cursor.

## Features
- ✅ **Real-time character-by-character typing** (200ms default delay)
- ✅ **Blinking cursor effect** (500ms default duration)
- ✅ **Fully customizable** - colors, speeds, classes
- ✅ **SmartMatch PWA optimized** - Tailwind CSS, dark mode ready
- ✅ **No external dependencies** - Pure React with hooks
- ✅ **Memory safe** - Proper cleanup and timers management
- ✅ **Accessible** - responsive and screen reader friendly

## Usage

### Basic Example
```tsx
import Typewriter from './components/Typewriter';

// Simple usage
<Typewriter text="Hello world!" />
```

### iPhone Recommendation Example
```tsx
<Typewriter
  text="Find your dream iPhone 16 Pro Max - the ultimate flagship experience awaits..."
  className="justify-center"
  textColor="text-slate-400"
  cursorColor="bg-cyan-400"
  typingSpeed={200}
  cursorBlinkDuration={500}
/>
```

### Advanced Configuration
```tsx
<Typewriter
  text="Your custom text here..."
  className="text-center"
  cursorColor="bg-emerald-400"          // Green cursor
  textColor="text-purple-300"          // Purple text
  typingSpeed={150}                    // Faster typing
  cursorBlinkDuration={300}            // Faster blinking
/>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | - | **Required** - The text to display with typewriter effect |
| `className` | `string` | `""` | Additional Tailwind CSS classes for the container |
| `cursorColor` | `string` | `"bg-cyan-400"` | Tailwind background class for cursor color |
| `textColor` | `string` | `"text-slate-100"` | Tailwind text color class |
| `cursorBlinkDuration` | `number` | `500` | Cursor blink interval in milliseconds |
| `typingSpeed` | `number` | `200` | Delay between typing characters in milliseconds |

### Styling Classes

#### Predefined Color Options
```tsx
// Cursor colors (bg-*)
bg-cyan-400      // Default cyan
bg-green-400     // Green
bg-emerald-400   // Emerald
bg-blue-400      // Blue
bg-purple-400    // Purple
bg-pink-400      // Pink
bg-red-400       // Red

// Text colors (text-*)
text-slate-100   // Default light gray
text-white       // Pure white
text-slate-400   // Medium gray
text-cyan-300    // Light cyan
text-emerald-300 // Light emerald
```

#### Layout Classes
```tsx
// Center the typewriter
className="justify-center"

// Right alignment
className="justify-end"

// Full width
className="w-full"

// Custom spacing
className="mx-4 my-2 p-3"
```

## Implementation Details

### State Management
```tsx
const [displayText, setDisplayText] = useState('');      // Currently visible text
const [showCursor, setShowCursor] = useState(true);     // Cursor visibility
```

### Animation Logic
```tsx
// Character-by-character typing
setInterval(() => {
  currentIndexRef.current += 1;
  setDisplayText(text.slice(0, currentIndexRef.current));
}, typingSpeed);

// Cursor blinking
setInterval(() => {
  setShowCursor(prev => !prev);
}, cursorBlinkDuration);
```

### Memory Management
- **Automatic cleanup** when component unmounts
- **Timer references** properly cleared
- **State resets** on text prop changes

### Performance Optimizations
- **GPU acceleration** with `translateZ(0)`
- **Minimal re-renders** with efficient state updates
- **Zero bundle size impact** (no external libraries)

## Demo Examples

### SmartMatch PWA Integration Examples

#### Hero Title
```tsx
<Typewriter
  text="Welcome to SmartMatch - Find your perfect phone in seconds..."
  className="text-center mb-4"
  textColor="text-slate-400"
  cursorColor="bg-cyan-400"
/>
```

#### Product Recommendation
```tsx
<Typewriter
  text="Based on your preferences, the Samsung Galaxy S24 Ultra is your perfect match!"
  textColor="text-emerald-300"
  cursorColor="bg-green-400"
  typingSpeed={100}
/>
```

#### Loading States
```tsx
<Typewriter
  text="Analyzing your requirements..."
  textColor="text-cyan-300"
  cursorColor="bg-cyan-500"
  typingSpeed={150}
/>
```

## Testing

The component includes comprehensive testing patterns:

```typescript
// Test empty state
<Typewriter text="" />

// Test with long content
<Typewriter text="Very long text content for thorough testing..." />

// Test prop changes
// Component should restart animation when text prop changes

// Test accessibility
// Component should respond to prefers-reduced-motion
```

## Browser Compatibility

- ✅ **Modern browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **Mobile devices** (iOS Safari, Chrome Mobile)
- ✅ **Progressive Web Apps** (PWA ready)
- ✅ **Dark mode** compatible with all Tailwind schemes

## Installation

The component is ready to use in your SmartMatch PWA project:

```tsx
import Typewriter from './components/Typewriter';
```

No additional dependencies required - works with React 16+ and modern JavaScript.

## File Structure

```
components/
  └── Typewriter.tsx          # Main component file
```

## Summary

The Typewriter component provides a polished, performant character-by-character typing animation perfect for enhancing user experience in the SmartMatch PWA with compelling visual feedback and smooth performance across all devices.
