import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { db } from "../../../../../prisma/db";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";

const COLUMNS = [
  {
    header: "Assignment",
    accessor: "assignment",
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
    header: "Due Date",
    accessor: "dueDate",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "actions",
  },
];

const getAssignmentsQuery = () =>
  db.orm.public.Assignment.include("lesson", (lesson) =>
    lesson.include("subject").include("teacher").include("class"),
  );

type AssignmentListItem = ResultType<ReturnType<typeof getAssignmentsQuery>>;

const renderRow = (item: AssignmentListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    <td>{item.lesson?.class.name}</td>
    <td className="hidden md:table-cell">
      {item.lesson?.teacher.name + " " + item.lesson?.teacher.surname}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("id-ID").format(item.dueDate)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="assignment" type="update" data={item} />
            <FormModal table="assignment" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const AssignmentsListPage = async ({
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
    const assignments = tx.orm.public.Assignment;
    const hasFilters =
      classId !== undefined || teacherId !== undefined || search !== undefined;

    const assignmentQuery = hasFilters
      ? assignments.where((assignment) => {
          const filters = [];

          if (classId !== undefined) {
            filters.push(assignment.lesson.some((l) => l.classId.eq(classId)));
          }

          if (teacherId !== undefined) {
            filters.push(
              assignment.lesson.some((t) => t.teacherId.eq(teacherId)),
            );
          }

          if (search !== undefined) {
            filters.push(
              or(
                assignment.title.ilike(`%${search}%`),
                assignment.lesson.some((lesson) =>
                  lesson.name.ilike(`%${search}%`),
                ),
              ),
            );
          }

          if (filters.length === 1) {
            return filters[0];
          }

          return and(...filters);
        })
      : assignments;

    const data = await assignmentQuery
      .include("lesson", (lessonRelation) =>
        lessonRelation.include("subject").include("teacher").include("class"),
      )
      .orderBy((l) => l.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await assignmentQuery.aggregate((aggregate) => ({
      totalAssignments: aggregate.count(),
    }));

    return [data, countResult.totalAssignments] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Assignments
        </h1>
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
            {role === "admin" && <FormModal table="assignment" type="create" />}
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

export default AssignmentsListPage;
