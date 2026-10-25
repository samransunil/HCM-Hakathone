(function () {
  "use strict";
  const H = window.HCM;
  const box = document.getElementById("helper-box");
  if (!box) return;
  box.innerHTML = '<form class="helper-form" id="helper-form"><input class="form-control" id="helper-question" placeholder="Try “Who was late today?”" aria-label="Ask a question" required><button class="btn btn-primary">Ask</button></form><div class="helper-answer" id="helper-answer" aria-live="polite">Ask a question about attendance, employees, or leave.</div>';
  document.getElementById("helper-form").addEventListener("submit", function (event) {
    event.preventDefault();
    const question = document.getElementById("helper-question").value.trim().toLowerCase();
    const current = window.HCM_CURRENT_USER;
    const employees = H.users().filter(user => user.role === "employee");
    const records = H.attendance();
    const leaves = H.leaves();
    const today = new Date().toISOString().slice(0, 10);
    let answer = "I can help with employee counts, today's leave or lateness, your leave balance, and your attendance hours.";
    if (current.role === "admin" && (question.includes("employee") || question.includes("team") || question.includes("staff"))) {
      answer = `There ${employees.length === 1 ? "is" : "are"} ${employees.length} employee${employees.length === 1 ? "" : "s"} in ${H.company().name}.`;
    } else if (question.includes("leave") && (question.includes("today") || question.includes("who"))) {
      const onLeave = leaves.filter(item => item.status === "approved" && item.from <= today && item.to >= today);
      const names = onLeave.map(item => employees.find(person => String(person.id) === String(item.employeeId))?.name).filter(Boolean);
      answer = names.length ? `On approved leave today: ${names.join(", ")}.` : "No approved leave is recorded for today.";
    } else if (current.role === "admin" && (question.includes("late") || question.includes("attendance"))) {
      const late = records.filter(record => record.date === today && record.status === "late");
      const names = late.map(item => employees.find(person => String(person.id) === String(item.employeeId))?.name).filter(Boolean);
      answer = names.length ? `Late today: ${names.join(", ")}.` : "No late check-ins are recorded today.";
    } else if (current.role === "employee" && question.includes("leave")) {
      const used = leaves.filter(item => String(item.employeeId) === String(current.id) && item.status === "approved").reduce((sum, item) => sum + Number(item.days), 0);
      answer = `You have ${Math.max(0, Number(H.company().leaveQuota) - used)} approved leave day(s) remaining this year.`;
    } else if (current.role === "employee" && (question.includes("late") || question.includes("today"))) {
      const record = records.find(item => String(item.employeeId) === String(current.id) && item.date === today);
      answer = record ? (record.status === "late" ? "Yes, your check-in was marked late today." : `You were marked ${record.status.replace("-", " ")} today.`) : "You have no attendance record for today.";
    } else if (current.role === "employee" && (question.includes("hour") || question.includes("week") || question.includes("work"))) {
      const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      const start = weekStart.toISOString().slice(0, 10);
      const hours = records.filter(item => String(item.employeeId) === String(current.id) && item.date >= start && item.checkOut).reduce((sum, item) => sum + Math.max(0, (new Date(`${item.date}T${item.checkOut}`) - new Date(`${item.date}T${item.checkIn}`)) / 3600000), 0);
      answer = `You have recorded ${hours.toFixed(1)} working hour(s) this week.`;
    }
    document.getElementById("helper-answer").textContent = answer;
  });
})();
