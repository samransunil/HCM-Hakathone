(function () {
  "use strict";
  const H = window.HCM;
  const page = document.body.dataset.page;
  let users = H.users();
  const session = H.session();
  let user = session && users.find(item => String(item.id) === String(session.id));

  if (!user) {
    user = users.find(item => item.role === "admin");
    if (!user) {
      if (!H.company()) {
        H.setCompany({ name: "My Company", officeStart: "09:00", graceMinutes: 15, leaveQuota: 20, workDays: 5 });
      }
      user = { id: Date.now(), name: "Administrator", email: "admin@localhost", password: "", role: "admin", department: "Administration", salary: 0 };
      users = [...users, user];
      H.setUsers(users);
    }
    H.setSession({ id: user.id });
  }

  const protectedPages = ["admin", "employees", "leaves", "settings", "employee", "payslip"];
  if (protectedPages.includes(page)) {
    if (user.role === "employee" && page !== "employee" && page !== "payslip") window.location.replace("employee.html");
    else if (user.role === "admin" && page === "employee") window.location.replace("admin.html");
  }

  window.HCM_CURRENT_USER = user;
  if (page === "home") window.location.replace(user.role === "admin" ? "admin.html" : "employee.html");
})();
