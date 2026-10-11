import { createContext, useContext, useState } from "react";
import { todaySchedule } from "../data/mock.js";

const ScheduleCtx = createContext(null);

export function ScheduleProvider({ children }) {
  const [visits, setVisits] = useState(todaySchedule);

  function updateStatus(id, status) {
    setVisits((vs) => vs.map((v) => (v.id === id ? { ...v, status } : v)));
  }

  return (
    <ScheduleCtx.Provider value={{ visits, updateStatus }}>
      {children}
    </ScheduleCtx.Provider>
  );
}

export function useSchedule() {
  return useContext(ScheduleCtx);
}
