"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, Column } from "@/types/data-dictionary";
import { ColumnForm, ColumnFormRef } from "./ColumnForm";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface TableFormRef {
  forceSave: () => Promise<void>;
}

interface TableFormProps {
  table: Table;
  onUpdate: (id: string, updatedTable: Table) => void;
  onRemove: (id: string) => void;
  availableTableNames: string[];
}

const tableSchema = z.object({
  tableName: z.string().min(1, "Table Name is required 表名为必填项"),
});

function TableFormImpl({ table, onUpdate, onRemove, availableTableNames }: TableFormProps, ref: React.Ref<TableFormRef>) {
  const { register, watch, reset, getValues, handleSubmit, trigger, formState: { errors } } = useForm<Omit<Table, 'columns' | 'id'>>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      tableName: table.tableName,
    },
    // Removed mode: "onChange" to prevent immediate validation
  });

  // Use a ref to hold the mutable columns array for synchronous updates
  const columnsRef = React.useRef<Column[]>(table.columns);
  // Use state to trigger re-renders when columns change, but data is in ref
  const [, setColumnsTrigger] = React.useState(0); 
  const columnRefs = React.useRef<Record<string, ColumnFormRef | null>>({});

  React.useEffect(() => {
    reset({
      tableName: table.tableName,
    });
    columnsRef.current = table.columns; // Initialize ref with prop columns
    setColumnsTrigger(prev => prev + 1); // Trigger re-render to reflect initial columns
  }, [table, reset]);

  const handleAddColumn = React.useCallback(() => {
    const newColumn: Column = {
      id: crypto.randomUUID(),
      columnName: "",
      dataType: "VARCHAR",
      size: null,
      isPrimaryKey: false,
      isForeignKey: false,
      isOptional: "No",
      isAuto: false,
      defaultValue: null,
      referencesTable: null,
      referencesColumn: null,
      columnDescription: "",
    };
    columnsRef.current = [...columnsRef.current, newColumn];
    setColumnsTrigger(prev => prev + 1); // Trigger re-render
  }, []);

  const handleUpdateColumn = React.useCallback((id: string, updatedColumn: Column) => {
    columnsRef.current = columnsRef.current.map((col) =>
      col.id === id ? { ...updatedColumn, id } : col
    );
    setColumnsTrigger(prev => prev + 1); // Trigger re-render
  }, []);

  const handleRemoveColumn = React.useCallback((id: string) => {
    columnsRef.current = columnsRef.current.filter((col) => col.id !== id);
    setColumnsTrigger(prev => prev + 1); // Trigger re-render
  }, []);

  const currentTableName = watch("tableName");

  React.useImperativeHandle(ref, () => ({
    forceSave: () => new Promise<void>(async (resolve) => {
      // First, force save and validate all child columns
      const columnSavePromises = Object.values(columnRefs.current)
        .filter((colRef): colRef is ColumnFormRef => colRef !== null)
        .map(colRef => colRef.forceSave());
      await Promise.all(columnSavePromises);

      // Then, validate the table's own fields
      const isValid = await trigger();
      if (isValid) {
        // After all child saves, columnsRef.current should be fully updated
        // Now, save the table's own state
        requestAnimationFrame(() => {
          const currentFormValues = getValues();
          const currentTableData = {
            tableName: currentFormValues.tableName,
            columns: columnsRef.current, // Use the latest columns from the ref
          };
          onUpdate(table.id, { ...currentTableData, id: table.id });
          resolve();
        });
      } else {
        // If table validation fails, still resolve but don't propagate potentially invalid data
        resolve();
      }
    }),
  }));

  // The auto-save useEffect needs to use columnsRef.current as well
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const currentFormValues = getValues();
      const currentTableData = {
        tableName: currentFormValues.tableName,
        columns: columnsRef.current, // Use columnsRef.current here
      };

      if (
        currentTableData.tableName !== table.tableName ||
        JSON.stringify(currentTableData.columns) !== JSON.stringify(table.columns)
      ) {
        // Only propagate if there's a change, without triggering validation errors on the form
        onUpdate(table.id, { ...currentTableData, id: table.id });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentTableName, columnsRef.current, onUpdate, table.id, table.tableName, getValues]);


  return (
    <div className="border p-6 rounded-lg shadow-sm space-y-6 bg-card">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Table: {currentTableName || "New Table"}</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Table
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove the table "{currentTableName || "New Table"}" and all its columns.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(table.id)}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`tableName-${table.id}`}>Table Name</Label>
          <Input
            id={`tableName-${table.id}`}
            {...register("tableName")}
            className="mt-1"
          />
          {errors.tableName && <p className="text-red-500 text-sm">{errors.tableName.message}</p>}
        </div>
      </div>

      <Separator />

      <h4 className="text-lg font-medium">Columns 列</h4>
      <div className="space-y-4">
        {columnsRef.current.map((column) => ( // Render from ref
          <ColumnForm
            key={column.id}
            column={column}
            onUpdate={handleUpdateColumn}
            onRemove={handleRemoveColumn}
            ref={(el) => (columnRefs.current[column.id] = el)}
          />
        ))}
      </div>

      <Button onClick={handleAddColumn} className="w-full">
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Column 添加列
      </Button>
    </div>
  );
}

export const TableForm = React.forwardRef(TableFormImpl);