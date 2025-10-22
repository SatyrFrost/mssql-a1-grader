import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ErdGrader from "./pages/ErdGrader";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage"; // Import the new HomePage component
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} /> {/* Set HomePage as the default route */}
            <Route path="/erd-grader" element={<ErdGrader />} /> {/* New route for ERD Grader */}
            <Route path="/login" element={<Login />} />
            {/* The DDTeacherGrading route is removed as it's now an external link */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;