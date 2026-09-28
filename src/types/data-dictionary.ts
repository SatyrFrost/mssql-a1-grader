export interface Column {
  id: string; // Added unique ID
  columnName: string;
  dataType: string;
  size: number | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isOptional: 'Yes' | 'No'; // Changed from isNullable: boolean
  isAuto: boolean; // Changed from isAutoIncrement: boolean
  defaultValue: string | null;
  referencesTable: string | null;
  referencesColumn: string | null;
  columnDescription: string;
}

export interface Table {
  id: string; // Added unique ID
  tableName: string;
  columns: Column[];
}

export interface DataDictionary {
  tables: Table[];
}
