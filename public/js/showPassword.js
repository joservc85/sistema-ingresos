document.addEventListener('DOMContentLoaded', () => {
    const togglePasswordButtons = document.querySelectorAll('[data-toggle-password]');

    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetInputId = button.dataset.togglePassword;
            const passwordInput = document.getElementById(targetInputId);
            const icon = button.querySelector('i');

            if (passwordInput && icon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
});