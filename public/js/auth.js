document.addEventListener('DOMContentLoaded', function () {
  // Function to display messages
  function displayMessage(elementId, message, isSuccess = true) {
    const messageElement = document.getElementById(elementId);
    messageElement.style.display = 'block';
    messageElement.className = isSuccess
      ? 'alert alert-success mt-3'
      : 'alert alert-danger mt-3';
    messageElement.innerHTML = message;
  }

  // Hide messages initially
  function hideMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
  }

  // Registration Form
  const registrationForm = document.getElementById('registrationForm');
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideMessages();

      // Get form values
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // Validate inputs
      if (email && password.length >= 6) {
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (response.ok) {
            displayMessage(
              'successMessage',
              'Registration successful! Please <a href="login.html">login</a>.'
            );
          } else {
            displayMessage(
              'errorMessage',
              data.errors
                ? data.errors.map((err) => err.msg).join(', ')
                : data.msg,
              false
            );
          }
        } catch (error) {
          console.error('Registration error:', error); // Log the error
          displayMessage(
            'errorMessage',
            'An error occurred. Please try again.',
            false
          );
        }
      } else {
        displayMessage(
          'errorMessage',
          'Please provide a valid email and password (at least 6 characters).',
          false
        );
      }
    });
  }

  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideMessages();

      // Get form values
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // Validate inputs
      if (email && password) {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (response.ok) {
            displayMessage('successMessage', 'Login successful!');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 2000); // Redirect after 2 seconds
          } else {
            displayMessage(
              'errorMessage',
              data.errors
                ? data.errors.map((err) => err.msg).join(', ')
                : data.msg,
              false
            );
          }
        } catch (error) {
          console.error('Login error:', error); // Log the error
          displayMessage(
            'errorMessage',
            'An error occurred. Please try again.',
            false
          );
        }
      } else {
        displayMessage(
          'errorMessage',
          'Please provide a valid email and password.',
          false
        );
      }
    });
  }
});
