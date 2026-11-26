import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import React from "react";
import { db } from "../../../../../prisma/db";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { and } from "@prisma/orm-postgres/orm-client";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";

const COLUMNS = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Supervisor",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "actions",
  },
];

const getClassesQuery = () =>
  db.orm.public.Class.include("grade").include("supervisor");

type ClassListItems = ResultType<ReturnType<typeof getClassesQuery>>;

const renderRow = (item: ClassListItems) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">{item.capacity}</td>
    <td className="hidden md:table-cell">{item.grade.level}</td>
    <td className="hidden md:table-cell">
      {item.supervisor.name + " " + item.supervisor.surname}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="class" type="update" data={item} />
            <FormModal table="class" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const ClassesListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { page, ...queryParams } = await searchParams;
  const p = getPageNumber(page);

  let supervisorId: string | undefined;
  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "supervisorId": {
        supervisorId = value.trim() || undefined;
        break;
      }

      case "search":
        search = value.trim() || undefined;
        break;

      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const classes = tx.orm.public.Class;
    const hasFilters = supervisorId !== undefined || search !== undefined;

    const classQuery = hasFilters
      ? classes.where((c) => {
          const filters = [];

          if (supervisorId !== undefined) {
            filters.push(
              c.supervisor.some((supervsr) => supervsr.id.eq(supervisorId)),
            );
          }

          if (search !== undefined) {
            filters.push(c.name.ilike(`%${search}%`));
          }

          if (filters.length === 1) {
            return filters[0];
          }

          return and(...filters);
        })
      : classes;

    const data = await classQuery
      .include("supervisor")
      .include("grade")
      .orderBy((c) => c.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await classQuery.aggregate((aggregate) => ({
      totalClasses: aggregate.count(),
    }));

    return [data, countResult.totalClasses] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image
                src="/filter.png"
                alt="filter-icon"
                width={14}
                height={14}
              />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="sort-icon" width={14} height={14} />
            </button>
            {role === "admin" && <FormModal table="class" type="create" />}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={COLUMNS} renderRow={renderRow} data={data} />

      {/* PAGINATION*/}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ClassesListPage;
