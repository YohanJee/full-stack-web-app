document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("attendee-container");
  const sortField = document.getElementById("sort-field");
  let sortOrder = "asc";
  let currentFilter = "all";

  async function loadAttendees(
    filter = "all",
    sortBy = "first_name",
    order = "asc",
  ) {
    try {
      const res = await fetch("/api/attendees");
      let attendees = await res.json();

      attendees = attendees.filter(
        (a) => filter === "all" || a.status === filter,
      );

      attendees.sort((a, b) => {
        if (a[sortBy] < b[sortBy]) return order === "asc" ? -1 : 1;
        if (a[sortBy] > b[sortBy]) return order === "asc" ? 1 : -1;
        return 0;
      });

      container.innerHTML = "";

      attendees.forEach((a) => {
        const div = document.createElement("div");
        div.className = "attendee-card";

        div.innerHTML = `
          <p><strong>${a.first_name} ${a.last_name}</strong></p>
          <p>${a.city}, ${a.state}, ${a.country}</p>
          <p>Email: ${a.email}</p>
          <p>Phone: ${a.phone}</p>
          <p>League ID: ${a.league_id}</p>
          <p>Rank: ${a.league_rank}</p>
          <p>Preferred Position: ${a.preferred_position}</p>
          <p>Status: <span class="status">${a.status}</span></p>
          <button class="status-btn" data-id="${a.id}" data-status="confirmed">Confirm</button>
          <button class="status-btn" data-id="${a.id}" data-status="in progress">In Progress</button>
          <button class="delete-btn" data-id="${a.id}">Delete</button>
          <button class="edit-btn" onclick="window.location.href='/edit-attendee/${a.id}'">Edit</button>
        `;

        container.appendChild(div);
      });

      document.querySelectorAll(".status-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const status = btn.dataset.status;
          await fetch(`/api/attendees/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          loadAttendees(currentFilter, sortField.value, sortOrder);
        });
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          if (confirm("Are you sure you want to delete this attendee?")) {
            await fetch(`/api/attendees/${id}`, { method: "DELETE" });
            loadAttendees(currentFilter, sortField.value, sortOrder);
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  document.querySelectorAll("#filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.status;
      loadAttendees(currentFilter, sortField.value, sortOrder);
    });
  });

  document.getElementById("sort-asc").addEventListener("click", () => {
    sortOrder = "asc";
    loadAttendees(currentFilter, sortField.value, sortOrder);
  });

  document.getElementById("sort-desc").addEventListener("click", () => {
    sortOrder = "desc";
    loadAttendees(currentFilter, sortField.value, sortOrder);
  });

  loadAttendees();
});
