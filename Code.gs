const SHEET_NAME = "slots";
const ACCESS_CODE = "0525";

function doGet(e) {
  const accessCode = e.parameter.accessCode;
  const start = e.parameter.start; // "yyyy-MM-dd" inclusive (optional)
  const end = e.parameter.end;     // "yyyy-MM-dd" exclusive (optional)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  const tz = Session.getScriptTimeZone();

  const allSlots = rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const val = row[i];
      try {
        if (h === 'Date') {
          obj[h] = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        } else if (h === 'Start Time' || h === 'End Time') {
          obj[h] = Utilities.formatDate(val, tz, "HH:mm");
        } else {
          obj[h] = val;
        }
      } catch (err) {
        obj[h] = val;
      }
    });
    return obj;
  });

  if (accessCode) {
    if (accessCode !== ACCESS_CODE) {
      return jsonResponse({ success: false, message: "Access denied." });
    }
    const bookedSlots = allSlots.filter(slot => slot.Status === "Booked");
    return jsonResponse({ success: true, slots: bookedSlots });
  } else {
    let available = allSlots.filter(slot => slot.Status === "Available");
    // Optional week-range filter. Date is zero-padded "yyyy-MM-dd",
    // so lexicographic string comparison is a valid date comparison.
    if (start && end) {
      available = available.filter(slot => slot.Date >= start && slot.Date < end);
    }
    return jsonResponse(available);
  }
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const slotId = parseInt(body.id);
  const name = body.name;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf("ID");
  const statusCol = headers.indexOf("Status");
  const nameCol = headers.indexOf("Name");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === slotId) {
      sheet.getRange(i + 1, statusCol + 1).setValue("Booked");
      sheet.getRange(i + 1, nameCol + 1).setValue(name);
      return jsonResponse({ success: true });
    }
  }

  return jsonResponse({ success: false, message: "Slot not found." });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}