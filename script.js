
    document.querySelector('.read-more-button').addEventListener('click', function () {
        var extendedIntro = document.querySelector('.extended-intro');
        if (extendedIntro.style.display === 'none') {
            extendedIntro.style.display = 'block';
            this.innerText = 'Read Less';
        } else {
            extendedIntro.style.display = 'none';
            this.innerText = 'Read More';
        }
    });


function smoothScroll(target, duration) {
    var targetSection = document.querySelector(target);
    var targetPosition = targetSection.offsetTop;
    var startPosition = window.pageYOffset;
    var distance = targetPosition - startPosition;
    var startTime = null;
  
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      var timeElapsed = currentTime - startTime;
      var run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }
  
    // Easing function
    function ease(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return (c / 2) * t * t + b;
      t--;
      return (-c / 2) * (t * (t - 2) - 1) + b;
    }
  
    requestAnimationFrame(animation);
  }
  
  // Add click event listeners to navbar links
  var navLinks = document.querySelectorAll('.navbar ul li a');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var target = link.getAttribute('href');
      smoothScroll(target, 1000);
  
      // Add active class to the clicked link and remove it from others
      navLinks.forEach(function (navLink) {
        navLink.classList.remove('active');
      });
      link.classList.add('active');
    });
  });
  