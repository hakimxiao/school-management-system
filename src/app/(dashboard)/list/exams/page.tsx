import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import React from "react";
import { and, or } from "@prisma/orm-postgres/orm-client";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { db } from "../../../../../prisma/db";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";

const COLUMNS = [
  {
    header: "Exam",
    accessor: "exam",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "actions",
  },
];

const getExamsQuery = () =>
  db.orm.public.Exam.include("lesson", (lesson) =>
    lesson.include("teacher").include("subject").include("class"),
  );

type ExamListItem = ResultType<ReturnType<typeof getExamsQuery>>;

const renderRow = (item: ExamListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      {item.title}
    </td>
    <td>{item.lesson?.class.name ?? "—"}</td>
    <td className="hidden md:table-cell">
      {item.lesson ? `${item.lesson.teacher.name} ${item.lesson.teacher.surname}` : "-"}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("id-ID").format(item.startTime)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="exam" type="update" data={item} />
            <FormModal table="exam" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const ExamsListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { page, ...queryParams } = await searchParams;
  const p = getPageNumber(page);

  let classId: number | undefined;
  let teacherId: string | undefined;
  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "classId": {
        const parsed = Number(value);

        if (Number.isInteger(parsed)) classId = parsed;
        break;
      }

      case "teacherId": {
        teacherId = value.trim() || undefined;
        break;
      }
      case "search": {
        search = value.trim() || undefined;
        break;
      }

      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const exams = tx.orm.public.Exam;
    const hasFilters =
      classId !== undefined || teacherId !== undefined || search !== undefined;

    const examQuery = hasFilters
      ? exams.where((exam) => {
          const filters = [];

          if (classId !== undefined) {
            filters.push(exam.lesson.some((c) => c.classId.eq(classId)));
          }

          if (teacherId !== undefined) {
            filters.push(exam.lesson.some((t) => t.teacherId.eq(teacherId)));
          }

          if (search !== undefined) {
            filters.push(
              or(
                exam.title.ilike(`%${search}%`),
                exam.lesson.some((lesson) =>
                  lesson.subject.some((subject) =>
                    subject.name.ilike(`%${search}%`),
                  ),
                ),
              ),
            );
          }

          if (filters.length === 1) {
            return filters[0];
          }

          return and(...filters);
        })
      : exams;

    const data = await examQuery
      .include("lesson", (lesson) =>
        lesson.include("teacher").include("subject").include("class"),
      )
      .orderBy((l) => l.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await examQuery.aggregate((aggregate) => ({
      totalExam: aggregate.count(),
    }));

    return [data, countResult.totalExam] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Exams</h1>
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
            {role === "admin" && <FormModal table="exam" type="create" />}
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

export default ExamsListPage;
