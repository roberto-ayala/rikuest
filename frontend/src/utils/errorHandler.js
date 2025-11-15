/**
 * Error handler utility for capturing and reporting frontend errors
 */

export const captureError = (error, errorInfo = null) => {
  // Generate stack trace
  let stackTrace = '';
  
  if (error.stack) {
    stackTrace = error.stack;
  } else if (errorInfo && errorInfo.componentStack) {
    stackTrace = errorInfo.componentStack;
  } else {
    // Fallback: try to get stack from Error object
    try {
      throw new Error();
    } catch (e) {
      stackTrace = e.stack || '';
    }
  }

  // Enhanced error information
  const errorMessage = error.message || String(error);
  
  // Log to console for debugging
  console.error('Error captured:', {
    message: errorMessage,
    stack: stackTrace,
    errorInfo,
  });

  // Return error details for reporting
  return {
    message: errorMessage,
    stack: stackTrace,
    errorInfo,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Report error to backend telemetry service
 */
export const reportError = async (error, errorInfo = null) => {
  try {
    const errorDetails = captureError(error, errorInfo);
    
    // Import telemetry store dynamically to avoid circular dependencies
    const { useTelemetryStore } = await import('../stores/telemetryStore.js');
    const { reportError: reportErrorToBackend } = useTelemetryStore.getState();
    
    await reportErrorToBackend(
      errorDetails.message,
      errorDetails.stack
    );
  } catch (err) {
    // Silently fail - don't disrupt error handling
    console.error('Failed to report error to telemetry:', err);
  }
};

/**
 * Setup global error handlers
 */
export const setupErrorHandlers = () => {
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    reportError(event.reason);
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    reportError(event.error);
  });
};

