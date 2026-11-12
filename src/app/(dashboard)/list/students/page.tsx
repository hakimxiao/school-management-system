import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";
import { db } from "../../../../../prisma/db";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { and } from "@prisma/orm-postgres/orm-client";

// Query ini menentukan relasi yang dibutuhkan setiap baris tabel.
const getStudentsQuery = () => db.orm.public.Student.include("class");

type StudentListItem = ResultType<ReturnType<typeof getStudentsQuery>>;

const renderRow = (item: StudentListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      <Image
        src={item.img || "/noAvatar.png"}
        alt=""
        width={40}
        height={40}
        className="md:hidden xl:block size-10 rounded-full object-cover"
      />
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-xs text-gray-500">{item.class.name}</p>
      </div>
    </td>
    <td className="hidden md:table-cell">{item.username}</td>
    <td className="hidden md:table-cell">{item.class.name[0]}</td>
    <td className="hidden lg:table-cell">{item.phone}</td>
    <td className="hidden lg:table-cell">{item.address}</td>
    <td>
      <div className="flex items-center gap-2">
        <Link href={`/list/students/${item.id}`}>
          <button className="size-7 flex items-center justify-center rounded-full bg-lamaSky">
            <Image src="/view.png" alt="" width={16} height={16} />
          </button>
        </Link>
        {role === "admin" && (
          <FormModal table="student" type="delete" id={item.id} />
        )}
      </div>
    </td>
  </tr>
);

const StudentsListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;

  const columns = [
    { header: "Info", accessor: "info" },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin"
      ? [{ header: "Actions", accessor: "actions" }]
      : []),
  ];

  // Baca dan validasi filter dari URL.
  let teacherId: string | undefined;
  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "teacherId":
        teacherId = value;
        break;
      case "search":
        search = value.trim() || undefined;
        break;
      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const students = tx.orm.public.Student;

    // Cari kelas yang memiliki lesson dari teacher ini.
    // Setelah itu, gunakan ID kelas untuk memfilter Student.
    const matchingClasses =
      teacherId === undefined
        ? undefined
        : await tx.orm.public.Class
            .where((classRow) =>
              classRow.lessons.some((lesson) =>
                lesson.teacherId.eq(teacherId),
              ),
            )
            .select("id")
            .all();

    const classIds = matchingClasses?.map((classRow) => classRow.id);

    // Jika tidak ada kelas yang cocok, tidak ada Student yang cocok.
    if (classIds?.length === 0) {
      const noStudents: StudentListItem[] = [];
      return [noStudents, 0] as const;
    }

    // Gunakan filter yang sama untuk mengambil data dan menghitung totalnya.
    const studentQuery =
      classIds !== undefined && search !== undefined
        ? students.where((student) =>
            and(
              student.classId.in(classIds),
              student.name.ilike(`%${search}%`),
            ),
          )
        : classIds !== undefined
          ? students.where((student) => student.classId.in(classIds))
          : search !== undefined
            ? students.where((student) =>
                student.name.ilike(`%${search}%`),
              )
            : students;

    const data = await studentQuery
      .include("class")
      .orderBy((student) => student.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (currentPage - 1))
      .all();

    const countResult = await studentQuery.aggregate((aggregate) => ({
      totalStudents: aggregate.count(),
    }));

    return [data, countResult.totalStudents] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Students</h1>
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
            {role === "admin" && <FormModal table="student" type="create" />}
          </div>
        </div>
      </div>

      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={currentPage} count={count} />
    </div>
  );
};

export default StudentsListPage;
