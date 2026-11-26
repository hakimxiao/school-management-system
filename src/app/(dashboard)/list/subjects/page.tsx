import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import React from "react";
import { db } from "../../../../../prisma/db";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";

const getSubjectQuery = () =>
  db.orm.public.Subject.include("teachers", (teacherSubject) =>
    teacherSubject.include("teacher"),
  );

type SubjectListItem = ResultType<ReturnType<typeof getSubjectQuery>>;

const COLUMNS = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Teachers",
    accessor: "teachers",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "actions",
  },
];

const renderRow = (item: SubjectListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">
      {item.teachers
        .map(
          (teacherSubject) =>
            `${teacherSubject.teacher.name} ${teacherSubject.teacher.surname}`,
        )
        .join(", ")}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="subject" type="update" data={item} />
            <FormModal table="subject" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const SubjectsListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { page, ...queryParams } = await searchParams;
  const p = getPageNumber(page);

  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "search":
        search = value.trim() || undefined;
        break;

      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const subjects = tx.orm.public.Subject;
    const hasFilter = search !== undefined;

    const subjectsQuery = hasFilter
      ? subjects.where((subject) => subject.name.ilike(`%${search}%`))
      : subjects;

    const data = await subjectsQuery
      .include("teachers", (teacherSubject) =>
        teacherSubject.include("teacher"),
      )
      .orderBy((subject) => subject.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await subjectsQuery.aggregate((aggregate) => ({
      totalSubjects: aggregate.count(),
    }));

    return [data, countResult.totalSubjects] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
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
            {role === "admin" && <FormModal table="subject" type="delete" />}
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

export default SubjectsListPage;
