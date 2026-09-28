"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { TableForm, TableFormRef } from "@/components/data-dictionary/TableForm";
import { DataDictionary, Table } from "@/types/data-dictionary";
import { PlusCircle, Download, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DataDictionaryTableDisplay } from "@/components/data-dictionary/DataDictionaryTableDisplay";
import modelDataDictionary from "@/data/modelDataDictionary.json";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/context/AuthContext";

const DataDictionaryBuilder = () => {
  const [tables, setTables] = React.useState<Table[]>([]);
  const [expandedTableIds, setExpandedTableIds] = React.useState<string[]>([]);
  const tableRefs = React.useRef<Record<string, TableFormRef | null>>({});
  const { isAuthenticated } = useAuth();

  const ensureTableIds = (tables: Table[]): Table[] => {
    return tables.map((table) => ({
      ...table,
      id: table.id || crypto.randomUUID(),
      columns: table.columns.map((column) => ({
        ...column,
        id: column.id || crypto.randomUUID(),
      })),
    }));
  };

  const handleAddTable = React.useCallback((expandImmediately: boolean = false) => {
    const newTable: Table = {
      id: crypto.randomUUID(),
      tableName: `NewTable${tables.length + 1}`,
      columns: [],
    };
    setTables((prev) => [...prev, newTable]);
    if (expandImmediately) {
      setExpandedTableIds((prev) => [...prev, newTable.id]);
    }
  }, [tables.length]);

  React.useEffect(() => {
    const savedState = localStorage.getItem("dataDictionaryBuilderState");
    if (savedState) {
      try {
        const parsedState: DataDictionary = JSON.parse(savedState);
        const loadedTables = ensureTableIds(parsedState.tables || []);
        setTables(loadedTables);
        if (loadedTables.length > 0) {
          setExpandedTableIds([loadedTables[0].id]);
        }
        toast.info("Loaded data dictionary from local storage.");
      } catch (error) {
        console.error("Error parsing saved data dictionary from localStorage", error);
        toast.error("Failed to load saved data. Starting fresh.");
        handleAddTable(true);
      }
    } else {
      handleAddTable(true);
    }
  }, []);

  React.useEffect(() => {
    const dataToSave: DataDictionary = {
      tables,
    };
    localStorage.setItem("dataDictionaryBuilderState", JSON.stringify(dataToSave));
  }, [tables]);

  const handleUpdateTable = React.useCallback((id: string, updatedTable: Table) => {
    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...updatedTable, id } : table))
    );
  }, []);

  const handleRemoveTable = React.useCallback((id: string) => {
    setTables((prev) => prev.filter((table) => table.id !== id));
    setExpandedTableIds((prev) => prev.filter((tableId) => tableId !== id));
  }, []);

  const flushAllChanges = async () => {
    const tableSavePromises = Object.values(tableRefs.current)
      .filter((tableRef): tableRef is TableFormRef => tableRef !== null)
      .map((tableRef) => tableRef.forceSave());
    await Promise.all(tableSavePromises);
  };

  const generatedDataDictionary: DataDictionary = {
    tables,
  };

  const handleDownloadJson = async () => {
    await flushAllChanges();
    const jsonString = JSON.stringify(generatedDataDictionary, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;

    a.href = url;
    a.download = `DataDictionary-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Data dictionary downloaded as JSON!");
  };

  const handleSaveExplicitly = async () => {
    await flushAllChanges();
    localStorage.setItem("dataDictionaryBuilderState", JSON.stringify(generatedDataDictionary));
    toast.success("Data dictionary saved to local storage!");
  };

  const handleLoadFromLocalStorage = () => {
    const savedState = localStorage.getItem("dataDictionaryBuilderState");
    if (savedState) {
      try {
        const parsedState: DataDictionary = JSON.parse(savedState);
        const loadedTables = ensureTableIds(parsedState.tables || []);
        setTables(loadedTables);
        if (loadedTables.length > 0) {
          setExpandedTableIds([loadedTables[0].id]);
        } else {
          setExpandedTableIds([]);
        }
        toast.success("Data dictionary loaded from local storage!");
      } catch (error) {
        console.error("Failed to parse saved data dictionary from localStorage", error);
        toast.error("Failed to load saved data.");
      }
    } else {
      toast.info("No saved data found in local storage.");
    }
  };

  const handleLoadModelAnswer = () => {
    try {
      const loadedTables = ensureTableIds(modelDataDictionary.tables as Table[]);
      setTables(loadedTables);
      if (loadedTables.length > 0) {
        setExpandedTableIds([loadedTables[0].id]);
      } else {
        setExpandedTableIds([]);
      }
      toast.success("Model answer loaded successfully!");
    } catch (error) {
      console.error("Error loading model data dictionary", error);
      toast.error("Failed to load model answer.");
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setTables([]);
      setExpandedTableIds([]);
      localStorage.removeItem("dataDictionaryBuilderState");
      toast.success("Data dictionary cleared!");
      handleAddTable(true);
    }
  };

  const availableTableNames = tables.map((t) => t.tableName);

  return (
    <div className="container mx-auto py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl font-bold text-center">Data Dictionary Builder</h1>

      <div className="flex flex-wrap justify-end gap-2">
        {isAuthenticated && (
          <Button variant="outline" onClick={handleLoadModelAnswer}>
            <Upload className="h-4 w-4 mr-2" />
            Load Model Answer
          </Button>
        )}
        <Button variant="outline" onClick={handleLoadFromLocalStorage}>
          <Upload className="h-4 w-4 mr-2" />
          Load Saved
        </Button>
        <Button variant="outline" onClick={handleSaveExplicitly}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button onClick={handleDownloadJson}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="destructive" onClick={handleClearAll}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="space-y-6">
        <Accordion
          type="multiple"
          className="w-full"
          value={expandedTableIds}
          onValueChange={setExpandedTableIds}
        >
          {tables.map((table) => (
            <AccordionItem value={table.id} key={table.id} className="border rounded-lg shadow-sm bg-card mb-4">
              <AccordionTrigger className="px-6 py-4 text-xl font-semibold hover:no-underline">
                Table: {table.tableName || "New Table"}
              </AccordionTrigger>
              <AccordionContent className="p-6 pt-0">
                <TableForm
                  table={table}
                  onUpdate={handleUpdateTable}
                  onRemove={handleRemoveTable}
                  availableTableNames={availableTableNames}
                  ref={(el) => (tableRefs.current[table.id] = el)}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Button onClick={() => handleAddTable(true)} className="w-full">
        <PlusCircle className="h-4 w-4 mr-2" />
        Add New Table 添加表
      </Button>

      <div className="border p-6 rounded-lg shadow-sm bg-card space-y-4">
        <h2 className="text-2xl font-semibold">Formatted Data Dictionary Table View 格式化数据字典表视图</h2>
        <DataDictionaryTableDisplay dataDictionary={generatedDataDictionary} />
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-8">
        {isAuthenticated && (
          <Button variant="outline" onClick={handleLoadModelAnswer}>
            <Upload className="h-4 w-4 mr-2" />
            Load Model Answer
          </Button>
        )}
        <Button variant="outline" onClick={handleLoadFromLocalStorage}>
          <Upload className="h-4 w-4 mr-2" />
          Load Saved
        </Button>
        <Button variant="outline" onClick={handleSaveExplicitly}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button onClick={handleDownloadJson}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="destructive" onClick={handleClearAll}>
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
    </div>
  );
};

export default DataDictionaryBuilder;
