/**
 * Standard JSON yanıt yardımcıları
 */

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendSuccess(res, data, statusCode = 200) {
  sendJSON(res, statusCode, { success: true, ...data });
}

function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { success: false, message });
}

module.exports = { sendJSON, sendSuccess, sendError };
