"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DDTeacherGrading = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">DD Teacher Grading</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            This is the placeholder page for Data Dictionary Teacher Grading.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DDTeacherGrading;