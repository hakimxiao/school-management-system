"use client";

import Image from "next/image";
import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

const events = [
  {
    id: 1,
    title: "Rapat wali kelas",
    time: "12.00–14.00 WIB",
    description: "Pembahasan perkembangan belajar dan kehadiran siswa.",
  },
  {
    id: 2,
    title: "Pengumpulan tugas IPA",
    time: "10.00–12.00 WIB",
    description: "Batas pengumpulan tugas melalui wali kelas.",
  },
  {
    id: 3,
    title: "Upacara bendera",
    time: "08.00–10.00 WIB",
    description: "Upacara rutin di lapangan sekolah. Siswa hadir tepat waktu.",
  },
];

const EventCalendar = () => {
  const [value, onChange] = useState<Value>(new Date());
  return (
    <div className="bg-white p-4 rounded-lg">
      <Calendar locale="id-ID" onChange={onChange} value={value} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold my-4">Agenda</h1>
        <Image src="/moreDark.png" alt="triple-dot" width={20} height={20} />
      </div>

      <div className="flex flex-col gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="p-5 rounded-md border-2 border-x-gray-100 border-t-4 odd:border-t-lamaSky even:border-t-lamaPurple"
          >
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-600">{event.title}</h1>
              <span className="text-gray-300 text-xs">{event.time}</span>
            </div>
            <p className="mt-2 text-gray-400 text-xs">{event.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventCalendar;
