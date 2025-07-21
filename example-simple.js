#!/usr/bin/env node

// ANSI escape codes for terminal control
const ANSI = {
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  CURSOR_UP: (n) => `\x1b[${n}A`,
  CURSOR_DOWN: (n) => `\x1b[${n}B`,
  CURSOR_TO_COLUMN: (n) => `\x1b[${n}G`,
  CLEAR_FROM_CURSOR: '\x1b[K',
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m'
};

// Configuration
const STATUS_COLUMN = 26;

// State tracking
let items = [];
let previousValues = [];
let isInitialized = false;

function formatValue(value, dimmed) {
  if (typeof value === 'number') {
    // Percentage formatting with color
    if (value >= 100) {
      return `${ANSI.GREEN}${value}%${ANSI.RESET}`;
    } else if (value >= 70) {
      return `${ANSI.YELLOW}${value}%${ANSI.RESET}`;
    } else {
      return `${ANSI.BLUE}${value}%${ANSI.RESET}`;
    }
  }
  
  // String values (like "deleting...", "deleted")
  if (dimmed) {
    return `${ANSI.GRAY}${value}${ANSI.RESET}`;
  } else if (value === 'deleting...') {
    return `${ANSI.YELLOW}${value}${ANSI.RESET}`;
  } else {
    return `${ANSI.GRAY}${value}${ANSI.RESET}`;
  }
}

function formatLabel(label, dimmed) {
  // Always pad to 25 characters based on the actual label length, not the formatted version
  const padding = ' '.repeat(Math.max(0, 25 - label.length));
  if (dimmed) {
    return `${ANSI.GRAY}${label}${padding}${ANSI.RESET}`;
  }
  return `${label}${padding}`;
}

function initializeDisplay() {
  if (isInitialized) return;
  
  process.stdout.write(ANSI.HIDE_CURSOR);
  
  // Draw initial lines
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = formatLabel(item.label, item.dimmed);
    const value = formatValue(item.value, item.dimmed);
    process.stdout.write(`${label} ${value}`);
    
    if (i < items.length - 1) {
      process.stdout.write('\n');
    }
  }
  
  // Store initial values for change detection
  previousValues = items.map(item => ({ 
    value: item.value, 
    dimmed: item.dimmed 
  }));
  
  isInitialized = true;
}

function updateDisplay() {
  if (!isInitialized) {
    initializeDisplay();
    return;
  }
  
  // Move cursor to first line
  if (items.length > 1) {
    process.stdout.write(ANSI.CURSOR_UP(items.length - 1));
  }
  
  // Check and update each line
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prev = previousValues[i];
    
    // Check if this item has changed
    const hasChanged = prev.value !== item.value || prev.dimmed !== item.dimmed;
    
    if (hasChanged) {
      if (item.dimmed && !prev.dimmed) {
        // Item became dimmed - redraw entire line
        process.stdout.write('\r'); // Go to start of line
        process.stdout.write(ANSI.CLEAR_FROM_CURSOR);
        const label = formatLabel(item.label, item.dimmed);
        const value = formatValue(item.value, item.dimmed);
        process.stdout.write(`${label} ${value}`);
      } else {
        // Just update the value part
        process.stdout.write(ANSI.CURSOR_TO_COLUMN(STATUS_COLUMN));
        process.stdout.write(ANSI.CLEAR_FROM_CURSOR);
        const value = formatValue(item.value, item.dimmed);
        process.stdout.write(value);
      }
      
      // Update tracking
      previousValues[i] = { value: item.value, dimmed: item.dimmed };
    }
    
    // Move to next line (except for the last one)
    if (i < items.length - 1) {
      process.stdout.write(ANSI.CURSOR_DOWN(1));
    }
  }
}

function cleanup() {
  process.stdout.write('\n');
  process.stdout.write(ANSI.SHOW_CURSOR);
  console.log('\n✅ Demo completed!');
  process.exit(0);
}

// Utility function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Demo function
async function runDemo() {
  console.log('🚀 Starting simple dynamic status demo...');
  console.log('Press Ctrl+C to exit\n');
  
  // Handle graceful exit
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  // Initialize items array
  items = [
    { label: 'Server startup', value: 0, dimmed: false },
    { label: 'Database connection', value: 'connecting...', dimmed: false },
    { label: 'Cache warming', value: 0, dimmed: false },
    { label: 'File processing', value: 0, dimmed: false },
    { label: 'Module loading', value: 0, dimmed: false }
  ];
  
  // Initial display
  updateDisplay();
  
  // Demo sequence with various updates
  await sleep(300);
  items[0].value = 15;
  updateDisplay();
  
  await sleep(200);
  items[2].value = 8;
  items[3].value = 12;
  updateDisplay();
  
  await sleep(300);
  items[0].value = 32;
  items[4].value = 5;
  updateDisplay();
  
  await sleep(400);
  items[1].value = 'deleting...';
  items[2].value = 23;
  updateDisplay();
  
  await sleep(250);
  items[0].value = 48;
  items[3].value = 35;
  updateDisplay();
  
  await sleep(350);
  items[2].value = 41;
  items[4].value = 28;
  updateDisplay();
  
  await sleep(400);
  items[0].value = 67;
  items[3].value = 52;
  updateDisplay();
  
  await sleep(300);
  // Database connection gets deleted and dimmed
  items[1].value = 'deleted';
  items[1].dimmed = true;
  updateDisplay();
  
  await sleep(200);
  items[2].value = 65;
  items[4].value = 44;
  updateDisplay();
  
  await sleep(350);
  items[0].value = 84;
  items[3].value = 73;
  updateDisplay();
  
  await sleep(300);
  items[2].value = 82;
  items[4].value = 61;
  updateDisplay();
  
  await sleep(250);
  items[0].value = 95;
  items[3].value = 89;
  updateDisplay();
  
  await sleep(400);
  items[2].value = 96;
  items[4].value = 78;
  updateDisplay();
  
  await sleep(300);
  items[0].value = 100;
  items[3].value = 100;
  updateDisplay();
  
  await sleep(250);
  items[2].value = 100;
  items[4].value = 95;
  updateDisplay();
  
  await sleep(200);
  items[4].value = 100;
  updateDisplay();
  
  // Hold final state for a moment
  await sleep(1500);
  
  cleanup();
}

// Export for use as module
export { items, updateDisplay, initializeDisplay, cleanup };

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}