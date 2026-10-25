(function () {
  "use strict";
  const keys = { company: "hcm_company", users: "hcm_users", attendance: "hcm_attendance", leaves: "hcm_leaves", session: "hcm_session", announcements: "hcm_announcements" };
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.error("Could not read HCM data:", error);
      return fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { console.error("Could not save HCM data:", error); throw new Error("Your browser could not save this change. Check available storage."); }
  }
  window.HCM = {
    keys,
    company: () => read(keys.company, null),
    setCompany: value => write(keys.company, value),
    users: () => read(keys.users, []),
    setUsers: value => write(keys.users, value),
    attendance: () => read(keys.attendance, []),
    setAttendance: value => write(keys.attendance, value),
    leaves: () => read(keys.leaves, []),
    setLeaves: value => write(keys.leaves, value),
    session: () => read(keys.session, null),
    setSession: value => write(keys.session, value),
    announcements: () => read(keys.announcements, []),
    setAnnouncements: value => write(keys.announcements, value)
  };
})();
