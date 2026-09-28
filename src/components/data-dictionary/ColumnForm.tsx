"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Column } from "@/types/data-dictionary";
import { XCircle } from "lucide-react";
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

export interface ColumnFormRef {
  forceSave: () => Promise<void>;
}

interface ColumnFormProps {
  column: Column;
  onUpdate: (id: string, updatedColumn: Column) => void;
  onRemove: (id: string) => void;
}

const columnSchema = z.object({
  columnName: z.string().min(1, "Column Name is required 列名为必填项"),
  dataType: z.string().min(1, "Data Type is required"),
  size: z.preprocess((val) => {
    const trimmedVal = String(val).trim();
    if (trimmedVal === "" || trimmedVal === "-") {
      return null;
    }
    const num = Number(trimmedVal);
    return isNaN(num) ? null : num; // If it's not a valid number, treat as null
  }, z.number().int().positive().nullable()),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  isOptional: z.enum(['Yes', 'No'], { required_error: "Optional status is required" }),
  isAuto: z.boolean(),
  defaultValue: z.string().nullable(),
  columnDescription: z.string().min(1, "Description is required 描述为必填项"),
});

const dataTypes = [
  "VARCHAR", "INT", "DATETIME", "MONEY"
];

type ColumnFormValues = {
  columnName: string;
  dataType: string;
  size: number | string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isOptional: 'Yes' | 'No';
  isAuto: boolean;
  defaultValue: string | null;
  columnDescription: string;
};

function ColumnFormImpl({ column, onUpdate, onRemove }: ColumnFormProps, ref: React.Ref<ColumnFormRef>) {
  const { register, control, watch, reset, getValues, handleSubmit, trigger, formState: { errors } } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnSchema),
    defaultValues: {
      ...column,
      size: column.size === null ? "" : column.size,
      defaultValue: column.defaultValue === null ? "" : column.defaultValue,
      isOptional: column.isOptional || 'No',
    },
    // Removed mode: "onChange" to prevent immediate validation
  });

  const allFields = watch(); // Watch all fields to detect changes for auto-save

  React.useEffect(() => {
    reset({
      ...column,
      size: column.size === null ? "" : column.size,
      defaultValue: column.defaultValue === null ? "" : column.defaultValue,
      isOptional: column.isOptional || 'No',
    });
  }, [column, reset]);

  const submitAndPropagate = React.useCallback((data: ColumnFormValues) => {
    const formattedData: Column = {
      ...data,
      id: column.id,
      size: data.size === "" || data.size === null ? null : Number(data.size),
      defaultValue: data.defaultValue,
      referencesTable: null,
      referencesColumn: null,
    };
    onUpdate(column.id, formattedData);
  }, [column.id, onUpdate]);

  React.useImperativeHandle(ref, () => ({
    forceSave: () => new Promise<void>(async (resolve) => {
      const isValid = await trigger(); // Manually trigger validation for all fields
      if (isValid) {
        handleSubmit((data) => {
          submitAndPropagate(data as unknown as ColumnFormValues);
          resolve();
        })();
      } else {
        // If validation fails, still resolve the promise but don't propagate potentially invalid data
        // The errors will be visible on the form.
        resolve();
      }
    }),
  }));

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const currentFormValues = getValues();
      // Create a normalized version of the prop `column` for comparison
      const normalizedPropColumn = {
        columnName: column.columnName,
        dataType: column.dataType,
        size: column.size,
        isPrimaryKey: column.isPrimaryKey,
        isForeignKey: column.isForeignKey,
        isOptional: column.isOptional,
        isAuto: column.isAuto,
        defaultValue: column.defaultValue,
        columnDescription: column.columnDescription,
      };

      // `currentFormValues` from getValues() needs to be normalized for comparison
      const currentDataForComparison = {
        columnName: currentFormValues.columnName,
        dataType: currentFormValues.dataType,
        size: currentFormValues.size === "" || currentFormValues.size === null ? null : Number(currentFormValues.size),
        isPrimaryKey: currentFormValues.isPrimaryKey,
        isForeignKey: currentFormValues.isForeignKey,
        isOptional: currentFormValues.isOptional,
        isAuto: currentFormValues.isAuto,
        defaultValue: currentFormValues.defaultValue === "" ? null : currentFormValues.defaultValue,
        columnDescription: currentFormValues.columnDescription,
      };

      // Compare the current data with the normalized prop data
      if (JSON.stringify(currentDataForComparison) !== JSON.stringify(normalizedPropColumn)) {
        // Only propagate if there's a change, without triggering validation errors on the form
        submitAndPropagate(currentFormValues as ColumnFormValues);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [allFields, column, submitAndPropagate, getValues]);


  return (
    <div className="relative border p-4 rounded-md space-y-4" style={{ backgroundColor: 'hsl(210 36.85% 88.1% / 90%)' }}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-5 w-5" />
            <span className="sr-only">Remove Column</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the column "{column.columnName || "New Column"}" from your table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(column.id)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`columnName-${column.id}`}>Column Name 列名</Label>
          <Input
            id={`columnName-${column.id}`}
            {...register("columnName")}
            className="mt-1"
          />
          {errors.columnName && <p className="text-red-500 text-sm">{errors.columnName.message}</p>}
        </div>
        <div>
          <Label htmlFor={`dataType-${column.id}`}>Data Type 数据类型</Label>
          <Controller
            name="dataType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a data type" />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.dataType && <p className="text-red-500 text-sm">{errors.dataType.message}</p>}
        </div>
        <div>
          <Label htmlFor={`size-${column.id}`}>Size (optional) 大小（可选）</Label>
          <Input
            id={`size-${column.id}`}
            type="text"
            {...register("size")}
            className="mt-1"
            placeholder="e.g., 255 for VARCHAR"
          />
          {errors.size && <p className="text-red-500 text-sm">{errors.size.message}</p>}
        </div>
        <div>
          <Label htmlFor={`defaultValue-${column.id}`}>Values (optional) 值（可选）</Label>
          <Input
            id={`defaultValue-${column.id}`}
            {...register("defaultValue")}
            className="mt-1"
            placeholder="For example, DEFAULT"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <Controller
            name="isPrimaryKey"
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`isPrimaryKey-${column.id}`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor={`isPrimaryKey-${column.id}`}>Primary Key 主键</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            name="isForeignKey"
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`isForeignKey-${column.id}`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor={`isForeignKey-${column.id}`}>Foreign Key 外键</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            name="isOptional"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-[100px] mt-1">
                  <SelectValue placeholder="Optional?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <Label htmlFor={`isOptional-${column.id}`}>Optional 可为空</Label>
          {errors.isOptional && <p className="text-red-500 text-sm">{errors.isOptional.message}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <Controller
            name="isAuto"
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`isAuto-${column.id}`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor={`isAuto-${column.id}`}>Auto 自动递增</Label>
        </div>
      </div>

      <div>
        <Label htmlFor={`columnDescription-${column.id}`}>Column Description 列描述</Label>
        <Textarea
          id={`columnDescription-${column.id}`}
          {...register("columnDescription")}
          className="mt-1"
          placeholder="A brief description of what this column stores"
        />
        {errors.columnDescription && <p className="text-red-500 text-sm">{errors.columnDescription.message}</p>}
      </div>
    </div>
  );
}

export const ColumnForm = React.forwardRef(ColumnFormImpl);