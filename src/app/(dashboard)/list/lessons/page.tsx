import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import React from "react";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { db } from "../../../../../prisma/db";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";

const COLUMNS = [
  {
    header: "Subject Name",
    accessor: "subject",
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
    header: "Actions",
    accessor: "actions",
  },
];

const getLessonsQuery = () =>
  db.orm.public.Lesson.include("subject").include("class").include("teacher");

type LessonListItem = ResultType<ReturnType<typeof getLessonsQuery>>;

const renderRow = (item: LessonListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.subject.name}</td>
    <td>{item.class.name}</td>
    <td className="hidden md:table-cell">
      {item.teacher.name + " " + item.teacher.surname}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="lesson" type="update" data={item} />
            <FormModal table="lesson" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const LessonsListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) => {
  const { page, ...queryParams } = searchParams;
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
    const lessons = tx.orm.public.Lesson;
    const hasFilters =
      classId !== undefined || teacherId !== undefined || search !== undefined;

    const lessonQuery = hasFilters
      ? lessons.where((lesson) => {
          const filters = [];

          if (classId !== undefined) {
            filters.push(lesson.class.some((c) => c.id.eq(classId)));
          }

          if (teacherId !== undefined) {
            filters.push(lesson.teacher.some((t) => t.id.eq(teacherId)));
          }

          if (search !== undefined) {
            filters.push(
              or(
                lesson.name.ilike(`%${search}%`),
                lesson.subject.some((subject) =>
                  subject.name.ilike(`%${search}%`),
                ),
                lesson.teacher.some((teacher) =>
                  or(
                    teacher.name.ilike(`%${search}%`),
                    teacher.surname.ilike(`%${search}%`),
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
      : lessons;

    const data = await lessonQuery
      .include("subject")
      .include("class")
      .include("teacher")
      .orderBy((l) => l.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await lessonQuery.aggregate((aggregate) => ({
      totalLesson: aggregate.count(),
    }));

    return [data, countResult.totalLesson] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Lessons</h1>
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
            {role === "admin" && <FormModal table="lesson" type="create" />}
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

export default LessonsListPage;
