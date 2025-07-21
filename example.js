#!/usr/bin/env node

// ANSI escape codes for terminal control
const ANSI = {
  CLEAR_LINE: '\x1b[2K',
  CURSOR_UP: (n) => `\x1b[${n}A`,
  CURSOR_DOWN: (n) => `\x1b[${n}B`,
  CURSOR_TO_COLUMN: (n) => `\x1b[${n}G`,
  CURSOR_SAVE: '\x1b[s',
  CURSOR_RESTORE: '\x1b[u',
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  BLUE: '\x1b[34m',
  GRAY: '\x1b[90m'
};

class DynamicStatusCLI {
  constructor() {
    this.lines = 10;
    this.tasks = [];
    this.isRunning = false;
    this.updateInterval = null;
    this.startTime = Date.now();
    
    // Initialize tasks with different types of status
    this.initializeTasks();
    
    // Handle graceful exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }
  
  initializeTasks() {
    const taskNames = [
      'Server startup',
      'Database connection',
      'Cache warming',
      'File processing',
      'Module loading',
      'Asset compilation',
      'Health checks',
      'Configuration',
      'Authentication',
      'Data migration'
    ];
    
    for (let i = 0; i < this.lines; i++) {
      if (i === 1) { // Second line (index 1) is the special deletion task
        this.tasks.push({
          name: taskNames[i],
          type: 'deletion',
          completed: false,
          deleted: false
        });
      } else {
        this.tasks.push({
          name: taskNames[i],
          type: 'percentage',
          max: 100,
          current: 0,
          completed: false
        });
      }
    }
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.statusColumnStart = 26; // Fixed position where status starts
    
    // Hide cursor and setup initial display
    process.stdout.write(ANSI.HIDE_CURSOR);
    
    // Draw initial lines with static labels
    for (let i = 0; i < this.lines; i++) {
      const task = this.tasks[i];
      const label = `${task.name}${' '.repeat(Math.max(0, 25 - task.name.length))}`;
      process.stdout.write(`${label} ${this.getStatusDisplay(task)}`);
      if (i < this.lines - 1) {
        process.stdout.write('\n');
      }
    }
    
    // Start update loop
    this.updateInterval = setInterval(() => {
      this.updateDisplay();
    }, 100);
  }
  
  getStatusDisplay(task) {
    if (task.type === 'deletion') {
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= 4000) { // 4 seconds have passed
        return `${ANSI.GRAY}deleted${ANSI.RESET}`;
      } else {
        return `${ANSI.YELLOW}deleting...${ANSI.RESET}`;
      }
    }
    
    const percent = Math.round((task.current / task.max) * 100);
    
    if (percent >= 100) {
      return `${ANSI.GREEN}${percent}%${ANSI.RESET}`;
    } else if (percent >= 70) {
      return `${ANSI.YELLOW}${percent}%${ANSI.RESET}`;
    } else {
      return `${ANSI.BLUE}${percent}%${ANSI.RESET}`;
    }
  }
  
  
  updateDisplay() {
    // Save current cursor position
    process.stdout.write(ANSI.CURSOR_SAVE);
    
    // Move cursor to the beginning of the first line we created
    process.stdout.write(ANSI.CURSOR_UP(this.lines - 1));
    
    // Update each line
    for (let i = 0; i < this.lines; i++) {
      const task = this.tasks[i];
      
      // Update task progress
      this.updateTask(task);
      
      // For deletion task, check if we need to dim the entire line
      if (task.type === 'deletion') {
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= 4000 && !task.deleted) {
          // Redraw entire line dimmed
          process.stdout.write('\r'); // Go to start of line
          process.stdout.write('\x1b[K'); // Clear entire line
          const label = `${task.name}${' '.repeat(Math.max(0, 25 - task.name.length))}`;
          process.stdout.write(`${ANSI.GRAY}${label} ${this.getStatusDisplay(task)}${ANSI.RESET}`);
          task.deleted = true;
          task.completed = true;
        } else {
          // Just update status column
          process.stdout.write(ANSI.CURSOR_TO_COLUMN(this.statusColumnStart));
          process.stdout.write('\x1b[K'); // Clear from cursor to end of line
          process.stdout.write(this.getStatusDisplay(task));
        }
      } else {
        // Regular percentage task - just update status column
        process.stdout.write(ANSI.CURSOR_TO_COLUMN(this.statusColumnStart));
        process.stdout.write('\x1b[K'); // Clear from cursor to end of line
        process.stdout.write(this.getStatusDisplay(task));
      }
      
      // Move to next line (except for the last one)
      if (i < this.lines - 1) {
        process.stdout.write(ANSI.CURSOR_DOWN(1));
      }
    }
    
    // Restore cursor position
    process.stdout.write(ANSI.CURSOR_RESTORE);
    
    // Check if all tasks are completed
    const allCompleted = this.tasks.every(task => task.completed);
    if (allCompleted) {
      setTimeout(() => this.cleanup(), 2000);
    }
  }
  
  updateTask(task) {
    if (task.completed) return;
    
    if (task.type === 'deletion') {
      // Deletion task completes automatically after 4 seconds
      const elapsed = Date.now() - this.startTime;
      if (elapsed >= 4000) {
        task.completed = true;
      }
    } else {
      // Regular percentage task
      task.current += Math.random() * 5;
      if (task.current >= task.max) {
        task.current = task.max;
        task.completed = true;
      }
    }
  }
  
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Show cursor and move to end
    process.stdout.write('\n');
    process.stdout.write(ANSI.SHOW_CURSOR);
    
    console.log('\n✅ All tasks completed! Exiting...');
    process.exit(0);
  }
}

// CLI usage
function main() {
  console.log('🚀 Starting dynamic status CLI with 10 lines...');
  console.log('Press Ctrl+C to exit\n');
  
  const cli = new DynamicStatusCLI();
  cli.start();
}

// Check if this file is being run directly (ES module equivalent of require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DynamicStatusCLI;