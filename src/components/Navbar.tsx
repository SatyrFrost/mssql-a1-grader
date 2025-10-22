"use client";

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { MenuIcon, LogOut, LogIn } from 'lucide-react';

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to home or login page after logout
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="text-lg font-bold">
          ERD Grader
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {isAuthenticated && (
            <Link to="/" className="text-sm font-medium hover:underline">
              ERD Grader
            </Link>
          )}
          <a
            href="https://assignmentoneddjinhua.great-site.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
          >
            Data Dictionary Builder
          </a>
          {isAuthenticated && (
            <>
              <Link to="/teacher-grader" className="text-sm font-medium hover:underline">
                DD Teacher Grading
              </Link>
              <a
                href="https://assignmentonejinhuapartthreefour.great-site.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
              >
                SQL Grader
              </a>
              <Button variant="ghost" onClick={handleLogout} className="text-sm font-medium">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </>
          )}
          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="ghost" className="text-sm font-medium">
                <LogIn className="h-4 w-4 mr-2" /> Teacher Login
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 py-6">
              {isAuthenticated && (
                <SheetClose asChild>
                  <Link to="/" className="text-lg font-semibold">
                    ERD Grader
                  </Link>
                </SheetClose>
              )}
              <SheetClose asChild>
                <a
                  href="https://assignmentoneddjinhua.great-site.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold"
                >
                  Data Dictionary Builder
                </a>
              </SheetClose>
              {isAuthenticated && (
                <>
                  <SheetClose asChild>
                    <Link to="/teacher-grader" className="text-lg font-semibold">
                      DD Teacher Grading
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <a
                      href="https://assignmentonejinhuapartthreefour.great-site.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold"
                    >
                      SQL Grader
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" onClick={handleLogout} className="text-lg font-semibold justify-start">
                      <LogOut className="h-5 w-5 mr-2" /> Logout
                    </Button>
                  </SheetClose>
                </>
              )}
              {!isAuthenticated && (
                <SheetClose asChild>
                  <Link to="/login">
                    <Button variant="ghost" className="text-lg font-semibold justify-start">
                      <LogIn className="h-5 w-5 mr-2" /> Teacher Login
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