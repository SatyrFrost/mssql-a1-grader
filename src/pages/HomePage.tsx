"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const appLinks = [
    {
      title: "ERD Grader",
      description: "Upload your draw.io XML file for automatic ERD grading.",
      href: "/erd-grader",
      external: false,
      teacherOnly: true,
    },
    {
      title: "Data Dictionary Builder",
      description: "Build and manage your data dictionaries.",
      href: "https://assignmentoneddjinhua.great-site.net",
      external: true,
      teacherOnly: false,
    },
    {
      title: "DD Teacher Grading Page",
      description: "Access the Data Dictionary Teacher Grading interface.",
      href: "https://assignmentoneddjinhua.great-site.net/teacher-grader",
      external: true,
      teacherOnly: true,
    },
    {
      title: "SQL Grader for Teachers",
      description: "Grade SQL assignments for your students.",
      href: "https://assignmentonejinhuapartthreefour.great-site.net",
      external: true,
      teacherOnly: true,
    },
  ];

  return (
    <div className="container mx-auto p-4 py-12 min-h-[calc(100vh-4rem)]">
      <h1 className="text-4xl font-bold text-center mb-10">Welcome to the App Portal</h1>
      <p className="text-center text-lg text-gray-600 mb-12">
        Select an application to get started. Teacher-specific tools are available upon login.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {appLinks.map((app, index) => (
          (app.teacherOnly && !isAuthenticated) ? null : (
            <Card key={index} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-xl">{app.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{app.description}</p>
                {app.external ? (
                  <a href={app.href} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      Go to {app.title} <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to={app.href}>
                    <Button variant="outline" className="w-full">
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