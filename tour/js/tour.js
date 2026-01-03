// Tour navigation and interactivity

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const lessons = document.querySelectorAll('.lesson');

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            showLesson(targetId);

            // Update active state in nav
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update URL hash without jumping
            history.pushState(null, null, `#${targetId}`);
        });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'welcome';
        showLesson(hash);
        updateActiveNavLink(hash);
    });

    // Handle initial load with hash
    const initialHash = window.location.hash.substring(1) || 'welcome';
    if (initialHash !== 'welcome') {
        showLesson(initialHash);
        updateActiveNavLink(initialHash);
    }

    // Show a specific lesson
    function showLesson(lessonId) {
        lessons.forEach(lesson => {
            if (lesson.id === lessonId) {
                lesson.classList.add('active');
            } else {
                lesson.classList.remove('active');
            }
        });

        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active nav link
    function updateActiveNavLink(lessonId) {
        navLinks.forEach(link => {
            const href = link.getAttribute('href').substring(1);
            if (href === lessonId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
});
