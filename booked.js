document.addEventListener("DOMContentLoaded", function () {
  const accessSection = document.getElementById("access-code-section");
  const calendarSection = document.getElementById("calendar-section");
  const verifyBtn = document.getElementById("verify-code-btn");
  const accessInput = document.getElementById("access-code");
  const accessError = document.getElementById("access-error");
  const calendarEl = document.getElementById("calendar");
  const statusMessage = document.getElementById("status-message");

  let calendar = null;
  let accessCode = "";

  verifyBtn.addEventListener("click", async function () {
    accessError.classList.add("hidden");
    accessCode = accessInput.value.trim();
    if (!accessCode) {
      accessError.textContent = "Please enter the access code.";
      accessError.classList.remove("hidden");
      return;
    }
    // Show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";
    try {
      const slots = await fetchBookedSlots(accessCode);
      if (slots && slots.length >= 0) {
        accessSection.style.display = "none";
        calendarSection.style.display = "block";
        renderCalendar(slots);
      } else {
        throw new Error("No data returned");
      }
    } catch (err) {
      accessError.textContent = err.message || "Invalid access code or failed to fetch data.";
      accessError.classList.remove("hidden");
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify";
    }
  });

  async function fetchBookedSlots(code) {
    const apiUrl = "https://script.google.com/macros/s/AKfycbxk1Q6Za5uNM9J6bXLAERBPvPNV40NiorV3A10MKlxOwUYOfJHEM08S_-2Um0g3kpEH/exec?accessCode=" + encodeURIComponent(code);
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Failed to fetch data from server.");
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Access denied.");
    return data.slots || [];
  }

  function renderCalendar(slots) {
    if (calendar) {
      calendar.destroy();
    }
    // Convert slots to FullCalendar events
    const events = slots.map(slot => {
      // Convert date to YYYY-MM-DD
      const dateStr = slot.Date.includes('T')
        ? new Date(slot.Date).toISOString().split('T')[0]
        : slot.Date;

      // Convert time to HH:MM (handles both plain "HH:MM" and legacy ISO strings)
      const pad = n => n.toString().padStart(2, '0');
      const parseTime = t => {
        if (/^\d{1,2}:\d{2}$/.test(t)) { const [h, m] = t.split(':'); return pad(parseInt(h)) + ':' + m; }
        const d = new Date(t); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
      };
      const startTime = parseTime(slot["Start Time"]);
      const endTime = parseTime(slot["End Time"]);

      return {
        id: slot.ID,
        title: slot.Name ? `${slot.Name}` : "Booked",
        start: `${dateStr}T${startTime}`,
        end: `${dateStr}T${endTime}`,
        color: '#e74c3c',
        extendedProps: {
          slotData: slot
        }
      };
    });
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "timeGridWeek",
      slotMinTime: "08:00:00",
      slotMaxTime: "22:00:00",
      allDaySlot: false,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay'
      },
      height: 'auto',
      events: events,
      eventClick: function(info) {
        const slot = info.event.extendedProps.slotData;
        const eventDate = new Date(slot.Date.includes('T') ? slot.Date : slot.Date + 'T12:00:00');
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const pad = n => n.toString().padStart(2, '0');
        const parseTime = t => {
          if (/^\d{1,2}:\d{2}$/.test(t)) { const [h, m] = t.split(':'); return pad(parseInt(h)) + ':' + m; }
          const d = new Date(t); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
        };
        const startTime = parseTime(slot["Start Time"]);
        const endTime = parseTime(slot["End Time"]);
        const name = slot.Name || "(No name)";
        // Show details in a popup
        alert(`Booked by: ${name}\nDate: ${formattedDate}\nTime: ${startTime} - ${endTime}`);
      },
      editable: false,
      selectable: false,
      eventStartEditable: false,
      eventDurationEditable: false,
      eventResizableFromStart: false
    });
    calendar.render();
    showStatusMessage(`Loaded ${events.length} booked slots`, 'success');
  }

  function showStatusMessage(message, type) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-yellow-100', 'text-yellow-800');
    switch(type) {
      case 'success':
        statusMessage.classList.add('bg-green-100', 'text-green-800');
        break;
      case 'error':
        statusMessage.classList.add('bg-red-100', 'text-red-800');
        break;
      case 'warning':
        statusMessage.classList.add('bg-yellow-100', 'text-yellow-800');
        break;
    }
    statusMessage.classList.remove('hidden');
    setTimeout(() => { statusMessage.classList.add('hidden'); }, 5000);
  }
}); 