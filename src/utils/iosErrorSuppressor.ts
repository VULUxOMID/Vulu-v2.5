/**
 * iOS Error Suppressor
 * Suppresses known iOS system/simulator errors that are harmless
 * These errors come from iOS itself, not from our app code
 */

import { Platform } from 'react-native';

// Patterns for iOS system errors that can be safely ignored
const IGNORED_IOS_ERRORS = [
  // iOS Sandbox/System errors (simulator limitations)
  /personaAttributesForPersonaType/,
  /RBSServiceErrorDomain/,
  /elapsedCPUTimeForFrontBoard/,
  /usermanagerd/,
  /sandbox.*deny/,
  /sandbox.*violation/,
  
  // Keyboard autocorrection errors
  /Could not find cached accumulator/,
  /TUIKeyboardCandidateMultiplexer/,
  /keyboard.*autocorrection/,
  /TextInput.*autocorrect/,
  
  // UIManager binding errors
  /UIManagerBinding.*null/,
  /instanceHandle.*null/,
  /topWillDisappear/,
  /topMomentumScrollEnd/,
  
  // AsyncStorage manifest warnings (intentional - we skip manifest writes)
  /AsyncStorage.*manifest.*changed/,
  /AsyncStorage.*SKIPPING.*manifest/,
  
  // Network errors (expected in dev when server not running)
  /nw_socket_handle_socket_event/,
  /TCP Conn.*Failed/,
  /Connection refused/,
];

// Patterns for warnings that should be downgraded to debug logs
const WARNINGS_TO_DEBUG = [
  /AsyncStorage.*manifest/,
  /Network.*connection/,
];

let isSuppressionEnabled = true;
let suppressedCount = 0;
const MAX_SUPPRESSED_LOG = 10; // Only log suppression stats occasionally

/**
 * Check if an error message should be suppressed
 */
export function shouldSuppressError(message: string): boolean {
  if (!isSuppressionEnabled || Platform.OS !== 'ios') {
    return false;
  }

  const messageStr = String(message || '').toLowerCase();
  
  return IGNORED_IOS_ERRORS.some(pattern => {
    try {
      return pattern.test(messageStr);
    } catch {
      return false;
    }
  });
}

/**
 * Check if a warning should be downgraded to debug
 */
export function shouldDowngradeWarning(message: string): boolean {
  if (!isSuppressionEnabled || Platform.OS !== 'ios') {
    return false;
  }

  const messageStr = String(message || '').toLowerCase();
  
  return WARNINGS_TO_DEBUG.some(pattern => {
    try {
      return pattern.test(messageStr);
    } catch {
      return false;
    }
  });
}

/**
 * Setup console error/warn suppression for iOS
 */
export function setupIOSErrorSuppression(): void {
  if (Platform.OS !== 'ios') {
    return;
  }

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Override console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    if (shouldSuppressError(message)) {
      suppressedCount++;
      // Only log suppression stats occasionally to avoid spam
      if (suppressedCount % MAX_SUPPRESSED_LOG === 0) {
        originalWarn(`[iOS Error Suppressor] Suppressed ${suppressedCount} iOS system errors (harmless)`);
      }
      return; // Suppress the error
    }
    
    // Call original error handler
    originalError.apply(console, args);
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    
    if (shouldSuppressError(message)) {
      suppressedCount++;
      if (suppressedCount % MAX_SUPPRESSED_LOG === 0) {
        originalWarn(`[iOS Error Suppressor] Suppressed ${suppressedCount} iOS system warnings (harmless)`);
      }
      return; // Suppress the warning
    }
    
    if (shouldDowngradeWarning(message)) {
      // Downgrade to debug log instead of warning
      if (__DEV__) {
        console.log('[iOS System]', ...args);
      }
      return;
    }
    
    // Call original warn handler
    originalWarn.apply(console, args);
  };

  if (__DEV__) {
    console.log('[iOS Error Suppressor] Enabled - suppressing harmless iOS system errors');
  }
}

/**
 * Disable error suppression (for debugging)
 */
export function disableIOSErrorSuppression(): void {
  isSuppressionEnabled = false;
}

/**
 * Enable error suppression
 */
export function enableIOSErrorSuppression(): void {
  isSuppressionEnabled = true;
}

/**
 * Get suppression statistics
 */
export function getSuppressionStats(): { suppressedCount: number; isEnabled: boolean } {
  return {
    suppressedCount,
    isEnabled: isSuppressionEnabled
  };
}

/**
 * Reset suppression statistics
 */
export function resetSuppressionStats(): void {
  suppressedCount = 0;
}

