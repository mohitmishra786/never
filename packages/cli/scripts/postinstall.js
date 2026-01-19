#!/usr/bin/env node

/**
 * Post-install script for @mohitmishra7/never-cli
 * Displays a success message after global installation
 */

const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

console.log(`
${GREEN}✓${RESET} ${BOLD}Never CLI installed successfully!${RESET}

${CYAN}Quick Start:${RESET}
  1. Navigate to your project directory
  2. Run: ${BOLD}never init${RESET}
  3. Run: ${BOLD}never sync${RESET}

${CYAN}Commands:${RESET}
  never init     Initialize Never in your project
  never sync     Sync rules to AI agent files
  never scan     Auto-detect stack and suggest rules
  never list     List available rule sets
  never doctor   Diagnose common issues
  never --help   Show all options

${CYAN}Documentation:${RESET} https://github.com/mohitmishra786/never
`);
