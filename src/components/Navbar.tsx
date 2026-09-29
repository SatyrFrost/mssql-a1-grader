"use client";

import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  MenuIcon,
  LogOut,
  LogIn,
  Home,
  Database,
  BookOpen,
  CheckSquare,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path;
    return cn(
      "inline-flex items-center px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all duration-150 border",
      isActive
        ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 dark:text-slate-300 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800"
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-900 shadow-xs">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Brand Title */}
        <Link
          to="/"
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white hover:text-blue-600 transition-colors shrink-0"
        >
          Data Modelling and SQL - Assignment 1
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          <Link to="/" className={navItemClass("/")}>
            <Home className="h-3.5 w-3.5 mr-1.5" />
            Home
          </Link>

          {isAuthenticated && (
            <Link to="/erd-grader" className={navItemClass("/erd-grader")}>
              <Network className="h-3.5 w-3.5 mr-1.5" />
              ERD Grader
            </Link>
          )}

          <Link to="/data-dictionary" className={navItemClass("/data-dictionary")}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Data Dictionary Builder
          </Link>

          {isAuthenticated && (
            <>
              <Link to="/dd-teacher-grader" className={navItemClass("/dd-teacher-grader")}>
                <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                DD Teacher Grading
              </Link>
              <Link to="/sql-grader" className={navItemClass("/sql-grader")}>
                <Database className="h-3.5 w-3.5 mr-1.5" />
                SQL Grader
              </Link>
            </>
          )}

          {/* Vertical Divider */}
          <div className="h-5 w-px bg-slate-200 dark:bg-gray-700 mx-1" />

          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs lg:text-sm font-medium border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button
                variant="outline"
                size="sm"
                className="text-xs lg:text-sm font-medium border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Teacher Login
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon" className="shrink-0">
              <MenuIcon className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-3 py-6">
              <div className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2">
                Navigation
              </div>
              <SheetClose asChild>
                <Link to="/" className={navItemClass("/")}>
                  <Home className="h-4 w-4 mr-2" /> Home
                </Link>
              </SheetClose>
              {isAuthenticated && (
                <SheetClose asChild>
                  <Link to="/erd-grader" className={navItemClass("/erd-grader")}>
                    <Network className="h-4 w-4 mr-2" /> ERD Grader
                  </Link>
                </SheetClose>
              )}
              <SheetClose asChild>
                <Link to="/data-dictionary" className={navItemClass("/data-dictionary")}>
                  <BookOpen className="h-4 w-4 mr-2" /> Data Dictionary Builder
                </Link>
              </SheetClose>
              {isAuthenticated && (
                <>
                  <SheetClose asChild>
                    <Link to="/dd-teacher-grader" className={navItemClass("/dd-teacher-grader")}>
                      <CheckSquare className="h-4 w-4 mr-2" /> DD Teacher Grading
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/sql-grader" className={navItemClass("/sql-grader")}>
                      <Database className="h-4 w-4 mr-2" /> SQL Grader
                    </Link>
                  </SheetClose>
                </>
              )}

              <hr className="my-3 border-slate-200 dark:border-gray-800" />

              {isAuthenticated ? (
                <SheetClose asChild>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full justify-start text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </SheetClose>
              ) : (
                <SheetClose asChild>
                  <Link to="/login" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-blue-700 border-blue-200 hover:bg-blue-50"
                    >
                      <LogIn className="h-4 w-4 mr-2" /> Teacher Login
                    </Button>
                  </Link>
                </SheetClose>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
