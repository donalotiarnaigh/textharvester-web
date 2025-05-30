/* eslint-disable quotes */
// clipboard.js

// Function to display copy success message
export function showCopySuccess() {
  const messageElement = document.getElementById("copyMessage");
  messageElement.textContent = "Copied to Clipboard!";
  messageElement.style.color = "green"; // Customize the message style

  setTimeout(function () {
    messageElement.textContent = "";
  }, 1500); // Adjust the duration as needed
}

// Function to initialize Clipboard.js for copying to clipboard
export function initializeClipboard(jsonDataElement) {
  const clipboard = new ClipboardJS("#copyButton", {
    text: function () {
      return jsonDataElement.textContent;
    },
  });

  clipboard.on("success", showCopySuccess);
}
