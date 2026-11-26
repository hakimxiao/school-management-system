import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { role } from "@/lib/data";
import Image from "next/image";
import React from "react";
import { db } from "../../../../../prisma/db";
import { ResultType } from "@prisma/orm-postgres/components";
import { getPageNumber, ITEM_PER_PAGE } from "@/lib/settings";
import { and } from "@prisma/orm-postgres/orm-client";

const COLUMNS = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Class",
    accessor: "class",
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

const getAnnouncementsQuery = () => db.orm.public.Announcement.include("class");

type AnnouncementsListItem = ResultType<
  ReturnType<typeof getAnnouncementsQuery>
>;

const renderRow = (item: AnnouncementsListItem) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    <td>{item.class?.name || "-"}</td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("id-ID").format(item.date)}
    </td>

    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormModal table="announcement" type="delete" data={item} />
            <FormModal table="announcement" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const AnnouncementsListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) => {
  const { page, ...queryParams } = await searchParams;
  const currentPage = getPageNumber(page);

  let search: string | undefined;

  for (const [key, value] of Object.entries(queryParams)) {
    if (value === undefined || value === "") continue;

    switch (key) {
      case "search": {
        search = value.trim() || undefined;

        break;
      }

      default:
        break;
    }
  }

  const [data, count] = await db.transaction(async (tx) => {
    const announcements = tx.orm.public.Announcement;
    const hasFilters = search !== undefined;

    const announcementsQuery = hasFilters
      ? announcements.where((announcement) => {
          const filters = [];

          if (search !== undefined) {
            filters.push(announcement.title.ilike(`%${search}%`));
          }

          if (filters.length === 1) {
            return filters[0];
          }

          return and(...filters);
        })
      : announcements;

    const data = await announcementsQuery
      .include("class")
      .orderBy((announcecment) => announcecment.id.asc())
      .limit(ITEM_PER_PAGE)
      .offset(ITEM_PER_PAGE * (currentPage - 1))
      .all();

    const countAnnouncements = await announcementsQuery.aggregate(
      (agregate) => ({
        countAnnouncements: agregate.count(),
      }),
    );

    return [data, countAnnouncements.countAnnouncements] as const;
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
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
            {role === "admin" && (
              <FormModal table="announcement" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* LIST */}
      <Table columns={COLUMNS} renderRow={renderRow} data={data} />

      {/* PAGINATION*/}
      <Pagination page={currentPage} count={count} />
    </div>
  );
};

export default AnnouncementsListPage;
