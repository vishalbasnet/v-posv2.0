document.getElementById('agree-checkbox').addEventListener('change', function() {
    const agreeButton = document.getElementById('agree-button');
    agreeButton.disabled = !this.checked;
});

document.getElementById('agree-button').addEventListener('click', function() {
    window.location.href = 'redirect.html'; // Redirect to the next page
});