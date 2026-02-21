import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/routes";
import { ThemeProvider } from "@/context/theme-provider";
import { AuthProvider } from "@/context/auth-provider";
import { seedMockData } from "@/data/mock-data";
import { Toaster } from "@/components/ui/sonner";

// Inițializează datele mock la prima încărcare
seedMockData();

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
