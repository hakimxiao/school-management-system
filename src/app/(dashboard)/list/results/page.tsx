import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import { db } from "../../../../../prisma/db";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { and, or } from "@prisma/orm-postgres/orm-client";

const COLUMNS = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Student",
    accessor: "student",
  },
  {
    header: "Score",
    accessor: "score",
    className: "hidden md:table-cell",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "class",
    className: "hidden md:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
];

const getResultsQuery = () =>
  db.orm.public.Result.include("student")
    .include("exam", (exam) =>
      exam.include("lesson", (lesson) =>
        lesson.include("class").include("teacher"),
      ),
    )
    .include("assignment", (assignment) =>
      assignment.include("lesson", (lesson) =>
        lesson.include("class").include("teacher"),
      ),
    );

type ResultListItem = ResultType<ReturnType<typeof getResultsQuery>>;

const renderRow = (item: ResultListItem) => {
  const assessment = item.exam ?? item.assignment;
  const lesson = assessment?.lesson;
  const teacher = lesson?.teacher;
  const assessmentDate = item.exam?.startTime ?? item.assignment?.startDate;

  return (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        {assessment?.title ?? "—"}
      </td>
      <td>{item.student.name + " " + item.student.surname}</td>
      <td className="hidden md:table-cell">{item.score}</td>
      <td className="hidden md:table-cell">
        {teacher ? `${teacher.name} ${teacher.surname}` : "—"}
      </td>
      <td className="hidden md:table-cell">{lesson?.class.name ?? "—"}</td>
      <td className="hidden md:table-cell">
        {assessmentDate
          ? new Intl.DateTimeFormat("id-ID").format(assessmentDate)
          : "—"}
      </td>
    </tr>
  );
};

const ResultsListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { page, ...queryParams } = await searchParams;
  const currentPage = getPageNumber(page);

  let studentId: string | undefined;
  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "studentId":
        studentId = value.trim() || undefined;
        break;
      case "search":
        search = value.trim() || undefined;
        break;
      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const results = tx.orm.public.Result;
    const hasFilters = studentId !== undefined || search !== undefined;

    const resultsQuery = hasFilters
      ? results.where((result) => {
          const filters = [];

          if (studentId !== undefined) {
            filters.push(result.studentId.eq(studentId));
          }

          if (search !== undefined) {
            filters.push(
              or(
                result.exam.some((exam) => exam.title.ilike(`%${search}%`)),
                result.assignment.some((assignment) =>
                  assignment.title.ilike(`%${search}%`),
                ),
                result.student.some((student) =>
                  or(
                    student.name.ilike(`%${search}%`),
                    student.surname.ilike(`%${search}%`),
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
      : results;

    const data = await resultsQuery
      .include("student")
      .include("exam", (exam) =>
        exam.include("lesson", (lesson) =>
          lesson.include("class").include("teacher"),
        ),
      )
      .include("assignment", (assignment) =>
        assignment.include("lesson", (lesson) =>
          lesson.include("class").include("teacher"),
        ),
      )
      .orderBy((result) => result.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (currentPage - 1))
      .all();

    const countResults = await resultsQuery.aggregate((aggregate) => ({
      totalResults: aggregate.count(),
    }));

    return [data, countResults.totalResults] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Results</h1>
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
          </div>
        </div>
      </div>

      <Table columns={COLUMNS} renderRow={renderRow} data={data} />
      <Pagination page={currentPage} count={count} />
    </div>
  );
};

export default ResultsListPage;
