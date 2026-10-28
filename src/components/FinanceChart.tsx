"use client";

import Image from "next/image";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Jan",
    income: 8500000,
    expense: 6200000,
  },
  {
    name: "Feb",
    income: 8000000,
    expense: 7500000,
  },
  {
    name: "Mar",
    income: 9000000,
    expense: 6800000,
  },
  {
    name: "Apr",
    income: 12000000,
    expense: 8500000,
  },
  {
    name: "May",
    income: 8500000,
    expense: 9200000,
  },
  {
    name: "Jun",
    income: 9000000,
    expense: 7000000,
  },
  {
    name: "Jul",
    income: 8500000,
    expense: 7800000,
  },
  {
    name: "Aug",
    income: 10500000,
    expense: 6500000,
  },
  {
    name: "Sep",
    income: 9000000,
    expense: 6000000,
  },
  {
    name: "Okt",
    income: 9500000,
    expense: 7100000,
  },
  {
    name: "Nov",
    income: 11000000,
    expense: 8000000,
  },
  {
    name: "Des",
    income: 12500000,
    expense: 10500000,
  },
];

const formatNumber = (value: any): string => {
  const num = Number(value);

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} M`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")} Jt`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")} Rb`;
  }

  return String(num);
};

const FinanceChart = () => {
  return (
    <div className="bg-white rounded-xl w-full h-full p-4">
      {/* TITLE */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Finance</h1>
        <Image src="/moreDark.png" alt="dotsdark-icon" width={20} height={20} />
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#d1d5db" }}
            tickLine={false}
            tickFormatter={formatNumber}
            tickMargin={20}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              formatNumber(Number(value)),
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
          />
          <Legend
            align="center"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "10px", paddingBottom: "30px" }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#52B788"
            strokeWidth={5}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#D96B6B"
            strokeWidth={5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinanceChart;
