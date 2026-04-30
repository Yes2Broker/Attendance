const API_URL = "https://script.google.com/macros/s/AKfycbyqVFkw8isonJ5DXa-Fd0f5J8ULmSpkvYwlsaTUNJTiOZNhl5d-oGjPTCcDe751qaLp/exec";

/* ======================================================
   LOGIN
====================================================== */

async function loginUser() {

    const code = document.getElementById("code")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const error = document.getElementById("loginError");

    if (!code || !password) {
        if (error) error.innerText = "Please enter Code & Password";
        return;
    }

    if (error) error.innerText = "Checking...";

    try {

        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "login",
                code,
                password
            })
        });

        const data = await res.json();

        if (data.success) {

            localStorage.setItem("user", JSON.stringify(data.user));

            if (data.user.role === "Admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "employee.html";
            }

        } else {
            if (error) error.innerText = "Invalid Code or Password";
        }

    } catch (err) {
        if (error) error.innerText = "Server Error";
        console.error(err);
    }
}


/* ======================================================
   LOGOUT
====================================================== */

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

/* ======================================================
   LOAD EMPLOYEES (Dropdown)
====================================================== */

async function loadEmployees() {

    const select = document.getElementById("employeeSelect");
    if (!select) return;

    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getEmployees" })
    });

    const data = await res.json();

    if (data.success) {

        select.innerHTML = '<option value="">Select Employee</option>';

        data.employees.forEach(emp => {
            const option = document.createElement("option");
            option.value = emp.code;
            option.textContent = emp.name + " (" + emp.code + ")";
            select.appendChild(option);
        });

    }
}

/* ======================================================
   ADD ATTENDANCE (attendance.html)
====================================================== */

const attendanceForm = document.getElementById("attendanceForm");

if (attendanceForm) {

    attendanceForm.addEventListener("submit", async (e) => {

        const submitBtn = attendanceForm.querySelector("button[type='submit']");

        if (submitBtn.disabled) return;

        submitBtn.disabled = true;
        submitBtn.innerText = "Saving...";

        if (!attendanceForm.checkValidity()) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Save Attendance";
            return;
        }

        e.preventDefault();

        const date = document.getElementById("attDate").value;
        const employeeCode = document.getElementById("employeeSelect").value;
        const status = document.getElementById("attStatus").value;
        const inTime = document.getElementById("inTime").value;
        const outTime = document.getElementById("outTime").value;
        const remark = document.getElementById("remark").value;

        if (!date || !employeeCode || !status) {
            alert("Please fill required fields");
            return;
        }

        if (status === "Paid Leave" && !remark) {
            alert("Please enter remark for paid leave");
            return;
        }

        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "addAttendance",
                date,
                employeeCode,
                inTime: status === "Present" ? inTime : "",
                outTime: status === "Present" ? outTime : "",
                status,
                remark: status === "Paid Leave" ? remark : ""
            })
        });

        const data = await res.json();

        if (data.success) {

            document.getElementById("successMsg").style.display = "block";
            attendanceForm.reset();
            document.getElementById("timeFields").style.display = "none";
            document.getElementById("remarkField").style.display = "none";

            submitBtn.innerText = "Saved ✓";

        } else {
            alert(data.message || "Failed to save attendance");
            submitBtn.disabled = false;
            submitBtn.innerText = "Save Attendance";
        }
    });

}

/* ======================================================
   LOAD ADMIN TABLE (admin.html)
====================================================== */

function formatHours(value) {

    if (!value) return "-";

    // If it is already correct format like 08:25
    if (typeof value === "string" && value.includes(":") && !value.includes("GMT")) {
        return value;
    }

    // If it's a Date object string like 1899
    const d = new Date(value);

    if (!isNaN(d)) {

        const totalMinutes =
            d.getHours() * 60 + d.getMinutes();

        const hrs = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
        const mins = String(totalMinutes % 60).padStart(2, "0");

        return hrs + ":" + mins;
    }

    return value;
}


let allAttendance = [];

async function loadEmployeesFilter() {

    const select = document.getElementById("employeeFilter");
    if (!select) return;

    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getEmployees" })
    });

    const data = await res.json();

    select.innerHTML = '<option value="">All Employees</option>';

    data.employees.forEach(emp => {
        const option = document.createElement("option");
        option.value = emp.name + " (" + emp.code + ")";
        option.dataset.salary = emp.salary;
        option.dataset.weekoff = emp.weekoff;
        option.textContent = emp.name + " (" + emp.code + ")";
        select.appendChild(option);
    });
}

async function loadAttendanceData() {

    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action: "getAttendance" })
    });

    const data = await res.json();

    console.log("Attendance Data:", data); // 👈 ADD THIS

    if (data.success) {
        allAttendance = data.attendance;
    }
}

function applyFilters() {

    const empFilter = document.getElementById("employeeFilter")?.value;
    const monthFilter = document.getElementById("monthFilter")?.value;
    const advancedFilter = document.getElementById("advancedFilter")?.value;

    let filtered = [...allAttendance];

    if (empFilter) {
        filtered = filtered.filter(r => r.code === empFilter);
    }

    if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        filtered = filtered.filter(r => {
            const parts = r.date.split("/");
            return parts[1] === month && parts[2] === year;
        });
    }

    if (advancedFilter) {

        filtered = filtered.filter(r => {

            // Normal status filters
            if (
                advancedFilter === "Present" ||
                advancedFilter === "Absent" ||
                advancedFilter === "Paid Leave" ||
                advancedFilter === "Weekoff"
            ) {
                return r.status === advancedFilter;
            }

            // Late filter
            if (advancedFilter === "Late") {
                return r.late === "Yes";
            }

            // Late Half filter
            if (advancedFilter === "Late Half") {
                return r.half === "Yes";
            }

            // Short Day filter
            if (advancedFilter === "Short Day") {
                return r.half === "Short Day";
            }

            return true;
        });
    }

    renderTable(filtered);
    updateCards(filtered);
}

function applyEmployeeFilters() {

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    const monthFilter = document.getElementById("monthFilter")?.value;
    const advancedFilter = document.getElementById("advancedFilter")?.value;

    let filtered = [...allAttendance];

    // ONLY current employee data
    filtered = filtered.filter(r =>
        r.code.includes(user.code)
    );

    // Month filter
    if (monthFilter) {
        const [year, month] = monthFilter.split("-");
        filtered = filtered.filter(r => {
            const parts = r.date.split("/");
            return parts[1] === month && parts[2] === year;
        });
    }

    // Advanced filter
    if (advancedFilter) {

        filtered = filtered.filter(r => {

            if (
                advancedFilter === "Present" ||
                advancedFilter === "Absent" ||
                advancedFilter === "Paid Leave" ||
                advancedFilter === "Weekoff"
            ) {
                return r.status === advancedFilter;
            }

            if (advancedFilter === "Late") {
                return r.late === "Yes";
            }

            if (advancedFilter === "Late Half") {
                return r.half === "Yes";
            }

            if (advancedFilter === "Short Day") {
                return r.half === "Short Day";
            }

            return true;
        });
    }

    renderEmployeeTable(filtered);
    updateCards(filtered);
}

function renderTable(data) {

    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach(row => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
      <td>${row.date}</td>
      <td>${row.code}</td>
      <td>${row.inTime}</td>
      <td>${row.outTime}</td>
      <td>${formatHours(row.hours)}</td>
      <td>${row.status}</td>
      <td>${row.half}</td>
      <td>${row.late}</td>
    `;

        tbody.appendChild(tr);
    });
}

function renderEmployeeTable(data) {

    const tbody = document.getElementById("tableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    data.forEach(row => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.inTime}</td>
            <td>${row.outTime}</td>
            <td>${formatHours(row.hours)}</td>
            <td>${row.status}</td>
            <td>${row.half}</td>
            <td>${row.late}</td>
        `;

        tbody.appendChild(tr);
    });
}

function updateCards(data) {

    let weekoffWorking = 0;
    let shortHours = 0;

    const monthFilter = document.getElementById("monthFilter")?.value;

    if (!monthFilter) return;

    const [year, month] = monthFilter.split("-");
    const totalMonthDays = new Date(year, month, 0).getDate();

    let present = 0;
    let weekoff = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;
    let late = 0;

    const employeeSelect = document.getElementById("employeeFilter");
    let empWeekoff = null;
    let selectedOption = null;

    if (employeeSelect && employeeSelect.selectedOptions.length > 0) {

        selectedOption = employeeSelect.selectedOptions[0];
        empWeekoff = selectedOption.dataset.weekoff?.toLowerCase();

    } else {

        // Employee panel
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.weekoff) {
            empWeekoff = user.weekoff.toLowerCase();
        }

    }

    data.forEach(r => {

        if (r.status === "Present") present++;
        if (r.status === "Weekoff") weekoff++;
        if (r.status === "Paid Leave") paidLeave++;
        if (r.status === "Absent") unpaidLeave++;
        if (r.late === "Yes") late++;

        // ===== WEEKOFF WORKING LOGIC =====
        if (empWeekoff) {

            const parts = r.date.split("/");
            const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);

            const dayName = dateObj
                .toLocaleDateString("en-US", { weekday: "long" })
                .toLowerCase();

            if (r.status === "Present" && dayName === empWeekoff) {
                weekoffWorking++;
            }
        }

        // ===== SHORT WORKING LOGIC (Based on Half Day flag) =====
        if (r.status === "Present" && r.half === "Short Day") {
            shortHours++;
        }

    });

    // ===== ADJUST WEEKOFF WORKING BASED ON ABSENT =====
    if (weekoffWorking > unpaidLeave) {
        weekoffWorking = unpaidLeave;
    }

    // ===== Late Deduction Logic =====
    let lateDeduction = 0;

    let effectiveLate = late - shortHours; // remove overlap

    if (effectiveLate > 2) {
        lateDeduction = (effectiveLate - 2) * 0.5;
    }

    // ===== Net Payable Formula =====
    const netPayable =
        (present + weekoff + paidLeave + weekoffWorking)
        - (lateDeduction + (shortHours * 0.5));

    // ===== Salary Calculation =====
    let finalSalary = 0;

    if (selectedOption && selectedOption.dataset.salary) {

        const monthlySalary = parseFloat(selectedOption.dataset.salary);

        if (!isNaN(monthlySalary) && totalMonthDays > 0) {

            const perDaySalary = monthlySalary / totalMonthDays;
            finalSalary = perDaySalary * netPayable;
        }
    }

    // ===== Update UI =====
    document.getElementById("monthDays").innerText = totalMonthDays;
    document.getElementById("presentCount").innerText = present;
    document.getElementById("weekoffCount").innerText = weekoff;
    document.getElementById("paidLeaveCount").innerText = paidLeave;
    // Adjust unpaid leave by subtracting weekoff working
    let finalUnpaidLeave = unpaidLeave - weekoffWorking;

    // Prevent negative values
    if (finalUnpaidLeave < 0) finalUnpaidLeave = 0;

    document.getElementById("unpaidLeaveCount").innerText = finalUnpaidLeave;
    document.getElementById("lateCount").innerText = late;
    document.getElementById("lateDeduction").innerText = lateDeduction.toFixed(1);
    document.getElementById("netPayableDays").innerText = netPayable.toFixed(1);
    const salaryEl = document.getElementById("finalSalary");
    if (salaryEl) salaryEl.innerText = finalSalary.toFixed(0);
    document.getElementById("weekoffWorking").innerText = weekoffWorking;
    document.getElementById("shortWorking").innerText = shortHours;
}

document.addEventListener("DOMContentLoaded", async () => {

    const user = JSON.parse(localStorage.getItem("user"));
    const path = window.location.pathname;

    // ===== ADMIN PAGE =====
    if (path.includes("admin.html")) {

        if (!user || user.role !== "Admin") {
            window.location.href = "index.html";
            return;
        }

        populateMonthFilter();        // 👈 ADD THIS LINE

        await loadEmployeesFilter();
        await loadAttendanceData();
        applyFilters();

        document.getElementById("employeeFilter")
            ?.addEventListener("change", applyFilters);

        document.getElementById("monthFilter")
            ?.addEventListener("change", applyFilters);

        document.getElementById("advancedFilter")
            ?.addEventListener("change", applyFilters);
    }

    // ===== EMPLOYEE PAGE =====
    if (path.includes("employee.html")) {

        if (!user || user.role !== "Employee") {
            window.location.href = "index.html";
            return;
        }

        document.getElementById("employeeName").innerText =
            `${user.name} (${user.code})`;

        populateMonthFilter();

        await loadAttendanceData();

        applyEmployeeFilters();   // ✅ separate function

        document.getElementById("monthFilter")
            ?.addEventListener("change", applyEmployeeFilters);

        document.getElementById("advancedFilter")
            ?.addEventListener("change", applyEmployeeFilters);
    }

    // ===== ATTENDANCE PAGE =====
    if (path.includes("attendance.html")) {

        if (!user || user.role !== "Admin") {
            window.location.href = "index.html";
            return;
        }

        loadEmployees();

        // ===== Disable Future Dates =====
        const dateInput = document.getElementById("attDate");
        if (dateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const dd = String(today.getDate()).padStart(2, "0");

            dateInput.max = `${yyyy}-${mm}-${dd}`;
        }

        const statusSelect = document.getElementById("attStatus");
        const timeFields = document.getElementById("timeFields");
        const remarkField = document.getElementById("remarkField");
        const inTimeInput = document.getElementById("inTime");   // 👈 ADD
        const outTimeInput = document.getElementById("outTime"); // 👈 ADD
        const remarkInput = document.getElementById("remark");   // 👈 ADD


        statusSelect.addEventListener("change", () => {

            const value = statusSelect.value;

            if (value === "Present") {
                timeFields.style.display = "block";
                remarkField.style.display = "none";

                inTimeInput.required = true;      // 👈 ADD
                outTimeInput.required = true;     // 👈 ADD
                remarkInput.required = false;     // 👈 ADD

            }
            else if (value === "Paid Leave") {
                timeFields.style.display = "none";
                remarkField.style.display = "block";

                inTimeInput.required = false;     // 👈 ADD
                outTimeInput.required = false;    // 👈 ADD
                remarkInput.required = true;      // 👈 ADD


            }
            else {
                timeFields.style.display = "none";
                remarkField.style.display = "none";

                inTimeInput.required = false;     // 👈 ADD
                outTimeInput.required = false;    // 👈 ADD
                remarkInput.required = false;     // 👈 ADD
            }
        });
    }

});

function populateMonthFilter() {

    const select = document.getElementById("monthFilter");
    if (!select) return;

    const today = new Date();
    const currentYear = today.getFullYear();

    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    select.innerHTML = '<option value="">All Months</option>';

    for (let m = 0; m < 12; m++) {

        const monthNumber = String(m + 1).padStart(2, "0");

        const option = document.createElement("option");

        option.value = `${currentYear}-${monthNumber}`;
        option.textContent = `${monthNames[m]} ${currentYear}`;

        // 👇 AUTO SELECT CURRENT MONTH
        if (m === today.getMonth()) {
            option.selected = true;
        }

        select.appendChild(option);
    }
}

function resetFilters() {

    const path = window.location.pathname;

    const emp = document.getElementById("employeeFilter");
    const month = document.getElementById("monthFilter");
    const advanced = document.getElementById("advancedFilter");

    if (emp) emp.value = "";
    if (advanced) advanced.value = "";

    // Reset month to current month
    if (month) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
        month.value = `${currentYear}-${currentMonth}`;
    }

    // 🔥 IMPORTANT FIX
    if (path.includes("admin.html")) {
        applyFilters();
    }

    if (path.includes("employee.html")) {
        applyEmployeeFilters();
    }
}

function togglePassword() {
    const passwordInput = document.getElementById("password");
    const toggleText = document.querySelector(".toggle-password");

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleText.innerText = "Hide";
    } else {
        passwordInput.type = "password";
        toggleText.innerText = "Show";
    }
}
