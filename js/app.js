(function () {
  "use strict";
  const H = window.HCM;
  const page = document.body.dataset.page;
  const current = window.HCM_CURRENT_USER;
  if (!current) return;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const money = value => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value) || 0);
  const today = () => new Date().toISOString().slice(0, 10);
  const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const statusBadge = value => `<span class="badge-soft status-${esc(value).toLowerCase().replace(/\s/g, "-")}">${esc(value)}</span>`;
  function workDaysBetween(from, to) {
    const settings = H.company();
    const perWeek = Number(settings.workDays) || 5;
    let count = 0;
    const start = new Date(`${from}T12:00:00`), end = new Date(`${to}T12:00:00`);
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (perWeek === 7 || (perWeek === 6 && day !== 0) || (perWeek === 5 && day !== 0 && day !== 6)) count++;
    }
    return count;
  }
  function setStatus(record) {
    const [startHour, startMinute] = H.company().officeStart.split(":").map(Number);
    const [inHour, inMinute] = record.checkIn.split(":").map(Number);
    const lateBy = (inHour * 60 + inMinute) - (startHour * 60 + startMinute);
    record.status = lateBy > Number(H.company().graceMinutes) ? "late" : "present";
  }
  function commonNav() {
    const admin = current.role === "admin";
    const links = admin ? [["admin.html","Dashboard"],["employees.html","Employees"],["leaves.html","Leaves"],["settings.html","Settings"],["payslip.html","Payslip"]] : [["employee.html","My workspace"],["payslip.html","Payslip"]];
    $("#app-shell").innerHTML = `<nav class="app-nav"><div class="nav-inner"><a class="brand-mark" href="${admin ? "admin.html" : "employee.html"}"><span class="brand-icon">H</span><span>HCM <b>Lite</b></span></a><div class="nav-links">${links.map(([href,label]) => `<a class="nav-link ${page === href.replace(".html","") ? "active" : ""}" href="${href}">${label}</a>`).join("")}</div><span class="nav-user d-none d-sm-inline">${esc(current.name)}</span></div></nav>`;
  }
  if (current) commonNav();
  if (page === "admin") dashboard();
  if (page === "employees") employeeManagement();
  if (page === "leaves") leaveManagement();
  if (page === "settings") settingsPage();
  if (page === "employee") employeePage();
  if (page === "payslip") payslipPage();

  function dashboard() {
    $("#today-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    const employees = H.users().filter(user => user.role === "employee");
    const records = H.attendance().filter(record => record.date === today());
    const leaves = H.leaves();
    const onLeave = leaves.filter(item => item.status === "approved" && item.from <= today() && item.to >= today());
    const late = records.filter(record => record.status === "late").length;
    $("#stat-cards").innerHTML = [[employees.length,"Employees","Team members", "👥"],[records.filter(r=>r.status==="present"||r.status==="late").length,"Present","Checked in today","✓"],[onLeave.length,"On leave","Approved today","↗"],[late,"Late","Beyond grace period","◷"]].map(([value,label,note,icon])=>`<div class="col-6 col-xl-3"><div class="card app-card stat-card"><div class="d-flex justify-content-between"><div><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div><span class="stat-icon">${icon}</span></div></div></div>`).join("");
    $("#attendance-table").innerHTML = records.length ? records.map(record=>{const person=employees.find(user=>String(user.id)===String(record.employeeId));return person?`<tr><td class="fw-semibold">${esc(person.name)}</td><td>${esc(person.department)}</td><td>${esc(record.checkIn)}</td><td>${statusBadge(record.status)}</td></tr>`:"";}).join("") : '<tr><td colspan="4" class="empty-state">No check-ins recorded today.</td></tr>';
    const pending = leaves.filter(item=>item.status==="pending").slice(0,4);
    $("#pending-leaves").innerHTML = pending.length ? pending.map(item=>{const person=employees.find(user=>String(user.id)===String(item.employeeId));return `<div class="request-row d-flex justify-content-between gap-2"><div><div class="fw-semibold">${esc(person?.name||"Former employee")}</div><div class="small text-secondary">${esc(item.type)} · ${dateLabel(item.from)} · ${item.days} day(s)</div></div>${statusBadge("pending")}</div>`;}).join("") : '<div class="empty-state">All caught up — no pending requests.</div>';
  }
  function employeeManagement() {
    const modal = bootstrap.Modal.getOrCreateInstance($("#employee-modal"));
    const form = $("#employee-form");
    const search = $("#employee-search"), filter = $("#department-filter");
    function render() {
      const people = H.users().filter(user=>user.role==="employee");
      const departments = [...new Set(people.map(user=>user.department).filter(Boolean))];
      const selected = filter.value;
      filter.innerHTML = '<option value="">All departments</option>'+departments.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join("");
      filter.value = selected;
      const term = search.value.trim().toLowerCase();
      const shown = people.filter(user=>(!selected||user.department===selected)&&(`${user.name} ${user.email}`.toLowerCase().includes(term)));
      $("#employee-table").innerHTML = shown.length ? shown.map(user=>`<tr><td class="fw-semibold">${esc(user.name)}</td><td>${esc(user.department)}</td><td>${esc(user.email)}</td><td>${money(user.salary)}</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary me-1" data-edit="${user.id}">Edit</button><button class="btn btn-sm btn-outline-danger" data-delete="${user.id}">Delete</button></td></tr>`).join("") : '<tr><td colspan="5" class="empty-state">No employees match your search.</td></tr>';
    }
    search.addEventListener("input",render); filter.addEventListener("change",render);
    $("#employee-table").addEventListener("click",event=>{
      const editId=event.target.dataset.edit, deleteId=event.target.dataset.delete;
      if(editId){const person=H.users().find(user=>String(user.id)===editId);$("#employee-modal-title").textContent="Edit employee";$("#employee-id").value=person.id;$("#employee-name").value=person.name;$("#employee-email").value=person.email;$("#employee-department").value=person.department;$("#employee-salary").value=person.salary;$("#employee-password").required=false;$("#employee-password-wrap").classList.add("d-none");$("#employee-password").value="";$("#employee-error").textContent="";modal.show();}
      if(deleteId && confirm("Delete this employee and their attendance and leave records?")){H.setUsers(H.users().filter(user=>String(user.id)!==deleteId));H.setAttendance(H.attendance().filter(record=>String(record.employeeId)!==deleteId));H.setLeaves(H.leaves().filter(item=>String(item.employeeId)!==deleteId));render();}
    });
    $("#employee-modal").addEventListener("hidden.bs.modal",()=>{form.reset();$("#employee-id").value="";$("#employee-modal-title").textContent="Add employee";$("#employee-password").required=true;$("#employee-password-wrap").classList.remove("d-none");$("#employee-error").textContent="";});
    form.addEventListener("submit",event=>{
      event.preventDefault();if(!form.reportValidity())return;
      const id=$("#employee-id").value;const users=H.users();const email=$("#employee-email").value.trim().toLowerCase();
      if(users.some(user=>user.email.toLowerCase()===email&&String(user.id)!==id)){$("#employee-error").textContent="That email address is already in use.";return;}
      const existing=users.find(user=>String(user.id)===id);
      const person={id:existing?existing.id:Date.now(),name:$("#employee-name").value.trim(),email,department:$("#employee-department").value.trim(),salary:Number($("#employee-salary").value),password:existing?existing.password:$("#employee-password").value,role:"employee"};
      H.setUsers(existing?users.map(user=>String(user.id)===id?person:user):[...users,person]);modal.hide();render();
    }); render();
  }
  function leaveManagement() {
    function render() {
      const people=H.users();const leaves=H.leaves().slice().sort((a,b)=>b.createdAt-a.createdAt);
      $("#leave-table").innerHTML=leaves.length?leaves.map(item=>{const person=people.find(user=>String(user.id)===String(item.employeeId));const controls=item.status==="pending"?`<div class="d-flex gap-2 flex-wrap"><input class="form-control form-control-sm" data-comment="${item.id}" placeholder="Comment (optional)" aria-label="Review comment"><button class="btn btn-sm btn-success" data-approve="${item.id}">Approve</button><button class="btn btn-sm btn-outline-danger" data-reject="${item.id}">Reject</button></div>`:`${statusBadge(item.status)}${item.comment?`<div class="small text-secondary mt-1">${esc(item.comment)}</div>`:""}`;
        return `<tr><td class="fw-semibold">${esc(person?.name||"Former employee")}</td><td>${esc(item.type)}</td><td>${dateLabel(item.from)} – ${dateLabel(item.to)}</td><td>${item.days}</td><td>${esc(item.reason)}</td><td style="min-width:220px">${controls}</td></tr>`;}).join(""):'<tr><td colspan="6" class="empty-state">No leave requests yet.</td></tr>';
    }
    $("#leave-table").addEventListener("click",event=>{
      const id=event.target.dataset.approve||event.target.dataset.reject;if(!id)return;
      const approve=Boolean(event.target.dataset.approve);const leaves=H.leaves();const request=leaves.find(item=>String(item.id)===id);
      if(approve){const used=leaves.filter(item=>String(item.employeeId)===String(request.employeeId)&&item.status==="approved").reduce((sum,item)=>sum+Number(item.days),0);if(used+Number(request.days)>Number(H.company().leaveQuota)){alert("Approving this request would exceed the employee’s leave quota.");return;}}
      request.status=approve?"approved":"rejected";request.comment=$(`[data-comment="${id}"]`)?.value.trim()||"";H.setLeaves(leaves);render();
    });render();
  }
  function settingsPage() {
    const company=H.company();$("#setting-company").value=company.name;$("#office-start").value=company.officeStart;$("#grace-minutes").value=company.graceMinutes;$("#leave-quota").value=company.leaveQuota;$("#work-days").value=String(company.workDays);
    $("#settings-form").addEventListener("submit",event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;H.setCompany({...company,name:$("#setting-company").value.trim(),officeStart:$("#office-start").value,graceMinutes:Number($("#grace-minutes").value),leaveQuota:Number($("#leave-quota").value),workDays:Number($("#work-days").value)});$("#settings-message").className="small mb-3 text-success";$("#settings-message").textContent="Settings saved.";});
    $("#password-form").addEventListener("submit",event=>{event.preventDefault();const users=H.users();const account=users.find(item=>String(item.id)===String(current.id));const message=$("#password-message");if(account.password!==$("#current-password").value){message.className="small mb-3 text-danger";message.textContent="Current password is incorrect.";return;}account.password=$("#new-password").value;H.setUsers(users);event.currentTarget.reset();message.className="small mb-3 text-success";message.textContent="Password changed.";});
  }
  function employeePage() {
    $("#today-label").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});$("#employee-greeting").textContent=`Hello, ${current.name.split(" ")[0]}`;
    const attendance=H.attendance();const record=attendance.find(item=>String(item.employeeId)===String(current.id)&&item.date===today());
    const leaves=H.leaves().filter(item=>String(item.employeeId)===String(current.id));const used=leaves.filter(item=>item.status==="approved").reduce((sum,item)=>sum+Number(item.days),0);
    $("#employee-stats").innerHTML=`<div class="col-6 col-xl-3"><div class="card app-card stat-card"><div class="stat-label">Department</div><div class="h5 mt-2 mb-0">${esc(current.department)}</div></div></div><div class="col-6 col-xl-3"><div class="card app-card stat-card"><div class="stat-label">Leave remaining</div><div class="stat-value">${Math.max(0,Number(H.company().leaveQuota)-used)}</div><div class="stat-note">approved days available</div></div></div><div class="col-6 col-xl-3"><div class="card app-card stat-card"><div class="stat-label">Today</div><div class="mt-2">${record?statusBadge(record.status):"Not checked in"}</div></div></div><div class="col-6 col-xl-3"><div class="card app-card stat-card"><div class="stat-label">Monthly salary</div><div class="h5 mt-2 mb-0">${money(current.salary)}</div></div></div>`;
    $("#check-in").disabled=Boolean(record);$("#check-out").disabled=!record||Boolean(record.checkOut);
    $("#attendance-status").textContent=record?`Attendance status: ${record.status.replace("-"," ")}.`:"No check-in recorded yet.";
    $("#attendance-times").textContent=record?`Check-in: ${record.checkIn}${record.checkOut?` · Check-out: ${record.checkOut}`:""}`:"";
    $("#check-in").addEventListener("click",()=>{const now=new Date();const entry={id:Date.now(),employeeId:current.id,date:today(),checkIn:now.toTimeString().slice(0,5),checkOut:"",status:"present"};setStatus(entry);attendance.push(entry);H.setAttendance(attendance);employeePage();});
    $("#check-out").addEventListener("click",()=>{const found=H.attendance().find(item=>String(item.employeeId)===String(current.id)&&item.date===today());if(!found||found.checkOut)return;found.checkOut=new Date().toTimeString().slice(0,5);const duration=(new Date(`${found.date}T${found.checkOut}`)-new Date(`${found.date}T${found.checkIn}`))/3600000;if(duration<5)found.status="half-day";H.setAttendance(H.attendance());employeePage();});
    const mine=H.attendance().filter(item=>String(item.employeeId)===String(current.id)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
    $("#my-attendance").innerHTML=mine.length?mine.map(item=>`<tr><td>${dateLabel(item.date)}</td><td>${esc(item.checkIn)}</td><td>${esc(item.checkOut||"—")}</td><td>${statusBadge(item.status)}</td></tr>`).join(""):'<tr><td colspan="4" class="empty-state">No attendance history yet.</td></tr>';
    $("#my-leaves").innerHTML=leaves.length?leaves.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,4).map(item=>`<div class="request-row d-flex justify-content-between"><div>${dateLabel(item.from)} – ${dateLabel(item.to)}<div class="small text-secondary">${esc(item.type)} · ${item.days} day(s)</div></div>${statusBadge(item.status)}</div>`).join(""):'<div class="empty-state">No leave requests yet.</div>';
    $("#leave-balance").textContent=`${Math.max(0,Number(H.company().leaveQuota)-used)} of ${H.company().leaveQuota} approved day(s) remaining`;
    $("#leave-form").addEventListener("submit",event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;const from=$("#leave-from").value,to=$("#leave-to").value;const message=$("#leave-message");if(from>to){message.textContent="The start date must be on or before the end date.";return;}const days=workDaysBetween(from,to);if(!days){message.textContent="The selected dates contain no working days.";return;}const overlapping=leaves.some(item=>item.status!=="rejected"&&from<=item.to&&to>=item.from);if(overlapping){message.textContent="This overlaps one of your existing requests.";return;}const reserved=leaves.filter(item=>item.status!=="rejected").reduce((sum,item)=>sum+Number(item.days),0);if(reserved+days>Number(H.company().leaveQuota)){message.textContent="This request exceeds your remaining leave quota.";return;}leaves.push({id:Date.now(),employeeId:current.id,type:$("#leave-type").value,from,to,days,reason:$("#leave-reason").value.trim(),status:"pending",comment:"",createdAt:Date.now()});H.setLeaves(leaves);employeePage();});
  }
  function payslipPage() {
    const employeeSelect=$("#payslip-employee");const employees=H.users().filter(user=>user.role==="employee");
    if(current.role==="employee"){$("#payslip-employee-wrap").classList.add("d-none");}
    else{employeeSelect.innerHTML=employees.map(user=>`<option value="${user.id}">${esc(user.name)}</option>`).join("");}
    const now=new Date();$("#payslip-month").value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    function render() {
      const person=current.role==="employee"?current:employees.find(user=>String(user.id)===employeeSelect.value)||employees[0];if(!person){$("#slip-name").textContent="No employees added yet.";return;}
      const [year,month]=($("#payslip-month").value||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`).split("-").map(Number);
      const daysInMonth=new Date(year,month,0).getDate();const monthStart=`${year}-${String(month).padStart(2,"0")}-01`;const monthEnd=`${year}-${String(month).padStart(2,"0")}-${String(daysInMonth).padStart(2,"0")}`;
      let workingDays=0;for(let day=1;day<=daysInMonth;day++){if(workDaysBetween(`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`))workingDays++;}
      const records=H.attendance().filter(item=>String(item.employeeId)===String(person.id)&&item.date>=monthStart&&item.date<=monthEnd);const half=records.filter(item=>item.status==="half-day").length;
      const presentDates=new Set(records.map(item=>item.date));const approvedLeaves=H.leaves().filter(item=>String(item.employeeId)===String(person.id)&&item.status==="approved");let absent=0;
      for(let day=1;day<=daysInMonth;day++){const date=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;if(date>today())continue;if(!workDaysBetween(date,date)||presentDates.has(date))continue;const onLeave=approvedLeaves.some(item=>item.from<=date&&item.to>=date);if(!onLeave)absent++;}
      const perDay=workingDays?Number(person.salary)/workingDays:0;const deduction=perDay*(absent+half*.5);const net=Math.max(0,Number(person.salary)-deduction);
      $("#slip-company").textContent=H.company().name;$("#slip-month-label").textContent=new Date(year,month-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});$("#slip-name").textContent=person.name;$("#slip-email").textContent=person.email;$("#slip-department").textContent=person.department;
      $("#slip-lines").innerHTML=`<tr><td>Monthly salary</td><td class="text-end">${money(person.salary)}</td></tr><tr><td>Working days in month</td><td class="text-end">${workingDays}</td></tr><tr><td>Daily rate</td><td class="text-end">${money(perDay)}</td></tr><tr><td>Absent days</td><td class="text-end">${absent}</td></tr><tr><td>Half days</td><td class="text-end">${half}</td></tr><tr><td>Attendance deduction</td><td class="text-end text-danger">− ${money(deduction)}</td></tr>`;
      $("#slip-net").textContent=money(net);
    }
    employeeSelect.addEventListener("change",render);$("#payslip-month").addEventListener("change",render);$("#print-slip").addEventListener("click",()=>window.print());render();
  }
})();
