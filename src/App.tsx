import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ErdGrader from "./pages/ErdGrader";
import Login from "./pages/Login"; // Import the Login component
import DDTeacherGrading from "./pages/DDTeacherGrading"; // Import the DDTeacherGrading component
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider
import { Navbar } from "./components/Navbar"; // Import Navbar

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider> {/* Wrap the entire app with AuthProvider */}
        <BrowserRouter>
          <Navbar /> {/* Add the Navbar here */}
          <Routes>
            <Route path="/" element={<ErdGrader />} />
            <Route path="/login" element={<Login />} /> {/* Add Login route */}
            <Route path="/teacher-grader" element={<DDTeacherGrading />} /> {/* Add DD Teacher Grading route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;