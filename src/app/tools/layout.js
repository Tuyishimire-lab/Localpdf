import ToolErrorBoundary from '../components/ToolErrorBoundary';

/**
 * tools/layout.js — shared layout for all PDF tool pages.
 *
 * Wraps every route under /tools/* with ToolErrorBoundary so any
 * tool crash is caught gracefully without touching each page individually.
 *
 * This is a Server Component; ToolErrorBoundary is a Client Component
 * ('use client' class) so React handles the boundary correctly.
 */
export default function ToolsLayout({ children }) {
  return (
    <ToolErrorBoundary toolName="PDF Tool">
      {children}
    </ToolErrorBoundary>
  );
}
