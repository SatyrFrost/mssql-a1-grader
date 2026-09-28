import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import ErdGrader from "./pages/ErdGrader";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import DataDictionaryBuilder from "./pages/DataDictionaryBuilder";
import TeacherGrader from "./pages/TeacherGrader";
import SqlGrader from "./pages/SqlGrader";
import ProtectedRoute from "./components/ProtectedRoute";
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
            <Route path="/" element={<HomePage />} />
            <Route path="/data-dictionary" element={<DataDictionaryBuilder />} />
            <Route path="/login" element={<Login />} />

            {/* Teacher Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/erd-grader" element={<ErdGrader />} />
              <Route path="/dd-teacher-grader" element={<TeacherGrader />} />
              <Route path="/sql-grader" element={<SqlGrader />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
