"use client";

import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, HelpCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLink {
  title: string;
  description: string;
  href: string;
  external: boolean;
  teacherOnly: boolean;
  bgColor: string;
  textColor: string;
  buttonVariant: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
}

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const appLinks: AppLink[] = [
    {
      title: "ERD Grader",
      description: "Upload your draw.io XML file for automatic ERD grading.",
      href: "/erd-grader",
      external: false,
      teacherOnly: true,
      bgColor: "bg-blue-50 dark:bg-blue-950",
      textColor: "text-blue-800 dark:text-blue-200",
      buttonVariant: "default",
    },
    {
      title: "Data Dictionary Builder",
      description: "Build and manage your data dictionaries with auto-save and export.",
      href: "/data-dictionary",
      external: false,
      teacherOnly: false,
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-800 dark:text-green-200",
      buttonVariant: "default",
    },
    {
      title: "DD Teacher Grading Page",
      description: "Access the Data Dictionary Teacher Grading interface for submitted JSON files.",
      href: "/dd-teacher-grader",
      external: false,
      teacherOnly: true,
      bgColor: "bg-purple-50 dark:bg-purple-950",
      textColor: "text-purple-800 dark:text-purple-200",
      buttonVariant: "default",
    },
    {
      title: "SQL Grader for Teachers",
      description: "Upload and automatically grade students' SQL scripts (.sql or .txt).",
      href: "/sql-grader",
      external: false,
      teacherOnly: true,
      bgColor: "bg-red-50 dark:bg-red-950",
      textColor: "text-red-800 dark:text-red-200",
      buttonVariant: "default",
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-gray-900 min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto p-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appLinks.map((app, index) =>
          app.teacherOnly && !isAuthenticated ? null : (
            <Card
              key={index}
              className={cn(
                "flex flex-col justify-between p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl",
                app.bgColor,
                app.textColor
              )}
            >
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-2xl font-semibold">{app.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                <p className="mb-6 text-base min-h-[3rem]">{app.description}</p>
                {app.external ? (
                  <a href={app.href} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant={app.buttonVariant} className="w-full">
                      Go to {app.title} <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to={app.href} className="block">
                    <Button variant={app.buttonVariant} className="w-full">
                      Go to {app.title} <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        )}
        {isAuthenticated && (
          <Card className="flex flex-col justify-between p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-semibold">Help File</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              <p className="mb-6 text-base min-h-[3rem]">
                Find detailed information and guidance on using all tools in the portal.
              </p>
              <a href="/Help.html" target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full">
                  <HelpCircleIcon className="h-4 w-4 mr-2" /> View Help
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
};

export default HomePage;
