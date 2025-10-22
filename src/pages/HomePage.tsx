"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Import cn for conditional class merging

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const appLinks = [
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
      description: "Build and manage your data dictionaries.",
      href: "https://assignmentoneddjinhua.great-site.net",
      external: true,
      teacherOnly: false,
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-800 dark:text-green-200",
      buttonVariant: "default",
    },
    {
      title: "DD Teacher Grading Page",
      description: "Access the Data Dictionary Teacher Grading interface.",
      href: "https://assignmentoneddjinhua.great-site.net/teacher-grader",
      external: true,
      teacherOnly: true,
      bgColor: "bg-purple-50 dark:bg-purple-950",
      textColor: "text-purple-800 dark:text-purple-200",
      buttonVariant: "default",
    },
    {
      title: "SQL Grader for Teachers",
      description: "Grade SQL assignments for your students.",
      href: "https://assignmentonejinhuapartthreefour.great-site.net",
      external: true,
      teacherOnly: true,
      bgColor: "bg-red-50 dark:bg-red-950",
      textColor: "text-red-800 dark:text-red-200",
      buttonVariant: "default",
    },
  ];

  return (
    <div className="container mx-auto p-4 py-12 min-h-[calc(100vh-4rem)]">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-900 dark:text-gray-50">Welcome to the App Portal</h1>
      <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-12">
        Select an application to get started. Teacher-specific tools are available upon login.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appLinks.map((app, index) => (
          (app.teacherOnly && !isAuthenticated) ? null : (
            <Card
              key={index}
              className={cn(
                "flex flex-col justify-between p-6 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl",
                app.bgColor,
                app.textColor
              )}
            >
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-2xl font-semibold">
                  {app.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                <p className="mb-6 text-base min-h-[3rem]"> {/* Added min-h-[3rem] here */}
                  {app.description}
                </p>
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
        ))}
      </div>
    </div>
  );
};

export default HomePage;