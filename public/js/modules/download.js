/* eslint-disable quotes */
// download.js

// Function to trigger downloads with dynamic filenames
export function triggerDownload(href, filename) {
  console.log("Triggering download with URL:", href, "and filename:", filename); // Log the URL and filename
  const downloadLink = document.createElement("a");
  downloadLink.href = href;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Function to validate filename input in real-time
export function validateFilenameInput(filenameInput) {
  filenameInput.addEventListener("input", function () {
    const isValidFilename = /^[a-zA-Z0-9_-]*$/.test(this.value);
    document.getElementById("downloadButton").disabled =
      !isValidFilename || !this.value;
    document.getElementById("downloadCsvButton").disabled =
      !isValidFilename || !this.value;

    if (isValidFilename || this.value === "") {
      this.classList.remove("is-invalid");
      this.classList.add("is-valid");
    } else {
      this.classList.remove("is-valid");
      this.classList.add("is-invalid");
    }
  });
}

// Function to download JSON results
export function downloadJsonResults(filenameInput) {
  const filename = filenameInput.value || "results";
  triggerDownload("/download-json?filename=" + filename, filename + ".json");
}

// Function to download CSV results
export function downloadCsvResults(filenameInput) {
  const filename = filenameInput.value || "results";
  const downloadUrl = `/download-csv?filename=${filename}`;
  triggerDownload(downloadUrl, filename + ".csv");
}
