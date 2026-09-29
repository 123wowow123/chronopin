// Imported first by the MCP server: its stdout is the protocol, so anything
// the app's modules print (log.info, "DB connection closed") goes to stderr.
console.log = console.error;
console.info = console.error;
console.debug = console.error;
