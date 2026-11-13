import { Toaster } from "react-hot-toast";

/**
 * Toast Provider Layout
 * Renders the toaster component for global notifications
 */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {children}
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#0f172a",
            fontSize: "14px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
            padding: "12px 14px",
            fontWeight: 500,
          },
          success: {
            duration: 3000,
            style: {
              borderColor: "#bbf7d0",
            },
          },
          error: {
            duration: 5000,
            style: {
              borderColor: "#fecaca",
            },
          },
        }}
      />
    </>
  );
};
