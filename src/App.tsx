import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
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
        <HashRouter>
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
        </HashRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
