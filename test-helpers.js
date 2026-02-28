const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Reads a file from the project root and returns its content as a string.
 */
function readFileContent(filePath) {
  return fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
}

/**
 * Reads an HTML file and returns a JSDOM document.
 */
function parseHTML(filePath) {
  const html = readFileContent(filePath);
  const dom = new JSDOM(html);
  return dom.window.document;
}

/**
 * Reads a JSON file and returns the parsed object.
 */
function parseJSON(filePath) {
  const content = readFileContent(filePath);
  return JSON.parse(content);
}

/**
 * Reads a CSS file and returns its content as a string.
 */
function readCSS(filePath) {
  return readFileContent(filePath);
}

module.exports = { readFileContent, parseHTML, parseJSON, readCSS };
