"use client";

import { Fragment } from "react";
import { Cell, flexRender, HeaderGroup, Row } from "@tanstack/react-table";
import { useDataGrid } from "./data-grid";
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from "./data-grid-table-parts";

function DataGridTable<TData>() {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table
          .getHeaderGroups()
          .map((headerGroup: HeaderGroup<TData>, index) => {
            return (
              <DataGridTableHeadRow headerGroup={headerGroup} key={index}>
                {headerGroup.headers.map((header, index) => {
                  const { column } = header;

                  return (
                    <DataGridTableHeadRowCell header={header} key={index}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {props.tableLayout?.columnsResizable &&
                        column.getCanResize() && (
                          <DataGridTableHeadRowCellResize header={header} />
                        )}
                    </DataGridTableHeadRowCell>
                  );
                })}
              </DataGridTableHeadRow>
            );
          })}
      </DataGridTableHead>

      {(props.tableLayout?.stripped || !props.tableLayout?.rowBorder) && (
        <DataGridTableRowSpacer />
      )}

      <DataGridTableBody>
        {isLoading &&
        props.loadingMode === "skeleton" &&
        pagination?.pageSize ? (
          Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
            <DataGridTableBodyRowSkeleton key={rowIndex}>
              {table.getVisibleFlatColumns().map((column, colIndex) => {
                return (
                  <DataGridTableBodyRowSkeletonCell
                    column={column}
                    key={colIndex}
                  >
                    {column.columnDef.meta?.skeleton}
                  </DataGridTableBodyRowSkeletonCell>
                );
              })}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : isLoading && props.loadingMode === "spinner" ? (
          <tr>
            <td
              colSpan={table.getVisibleFlatColumns().length}
              className="p-8"
            >
              <div className="flex items-center justify-center">
                <svg
                  className="text-muted-foreground mr-3 -ml-1 h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {props.loadingMessage || "Loading..."}
              </div>
            </td>
          </tr>
        ) : table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row: Row<TData>, index) => {
            return (
              <Fragment key={row.id}>
                <DataGridTableBodyRow row={row} key={index}>
                  {row
                    .getVisibleCells()
                    .map((cell: Cell<TData, unknown>, colIndex) => {
                      return (
                        <DataGridTableBodyRowCell cell={cell} key={colIndex}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </DataGridTableBodyRowCell>
                      );
                    })}
                </DataGridTableBodyRow>
                {row.getIsExpanded() && (
                  <DataGridTableBodyRowExpandded row={row} />
                )}
              </Fragment>
            );
          })
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

export { DataGridTable };
export {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
} from "./data-grid-table-parts";
