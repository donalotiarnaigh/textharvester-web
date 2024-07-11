/* eslint-disable quotes */
// conversionStatus.js

// Function to show the conversion status message and spinner
const showConversionStatus = (message) => {
  const conversionStatusElement = document.getElementById("conversionStatus");
  const conversionMessageElement = document.getElementById("conversionMessage");

  if (conversionStatusElement && conversionMessageElement) {
    conversionMessageElement.textContent = message;
    conversionStatusElement.style.display = "block";
  }
};

// Function to hide the conversion status message and spinner
const hideConversionStatus = () => {
  const conversionStatusElement = document.getElementById("conversionStatus");

  if (conversionStatusElement) {
    conversionStatusElement.style.display = "none";
  }
};

export { showConversionStatus, hideConversionStatus };
