import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { db } from "../../../../../prisma/db";
import type { ResultType } from "@prisma/orm-postgres/components/runtime";
import { ITEM_PER_PAGE } from "@/lib/settings";

const COLUMNS = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Teacher ID",
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
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
  {
    header: "Actions",
    accessor: "actions",
  },
];

// Teacher.subjects berisi baris penghubung TeacherSubject.
// Setiap baris penghubung menunjuk ke satu Subject, jadi Subject perlu di-include
// di dalam subjects agar kita bisa membaca subject.name.
const getTeachersQuery = () =>
  db.orm.public.Teacher.include("subjects", (teacherSubjects) =>
    teacherSubjects.include("subject"),
  )
    // Kelas adalah relasi langsung dari Teacher.
    .include("classes");

// Tipe satu baris data, mengikuti relasi yang di-include di atas.
type TeacherListItem = ResultType<ReturnType<typeof getTeachersQuery>>;

const renderRow = (item: TeacherListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      <Image
        src={item.img || "/noAvatar.png"}
        alt="teacher-photo"
        width={40}
        height={40}
        className="md:hidden xl:block size-10 rounded-full object-cover"
      />
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-sm text-gray-500">{item?.email}</p>
      </div>
    </td>
    <td className="hidden md:table-cell">{item.username}</td>
    <td className="hidden md:table-cell">
      {item.subjects.map((s) => s.subject.name).join(",")}
    </td>
    <td className="hidden md:table-cell">
      {item.classes.map((c) => c.name).join(",")}
    </td>
    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>
    <td>
      <div className="flex items-center gap-2">
        <Link href={`/list/teachers/${item.id}`}>
          <button className="size-7 flex items-center justify-center rounded-full bg-lamaSky">
            <Image src="/view.png" alt="view-logo" width={16} height={16} />
          </button>
        </Link>
        {role === "admin" && <FormModal table="teacher" type="delete" />}
      </div>
    </td>
  </tr>
);

const TeachersListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  // Prisma 8 memakai callback transaction. Ambil halaman dan total count
  // dalam satu transaksi; count dibuat dengan aggregate().
  const [data, count] = await db.transaction(async (tx) => {
    const data = await tx.orm.public.Teacher.include(
      "subjects",
      (teacherSubjects) => teacherSubjects.include("subject"),
    )
      .include("classes")
      .orderBy((teacher) => teacher.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (p - 1))
      .all();

    const countResult = await tx.orm.public.Teacher.aggregate((aggregate) => ({
      totalTeachers: aggregate.count(),
    }));

    return [data, countResult.totalTeachers] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Teachers</h1>
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
            {role === "admin" && <FormModal table="teacher" type="create" />}
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

export default TeachersListPage;
