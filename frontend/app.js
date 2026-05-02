/* edumind-lms-performance-ui-v5 — if DevTools does not show this, the wrong app.js is being loaded */
const API_BASE = "http://localhost:8011/api";
const EDUMIND_ENGAGEMENT_API = "http://localhost:8005";
const EDUMIND_LEARNING_API = "http://localhost:8006";

let currentUser = null;
let courses = [];
let activeCourse = null;

const navbarUserEl = document.getElementById("navbar-user");
const btnSignout = document.getElementById("btn-signout");
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginInfoEl = document.getElementById("login-info");
const loginErrorEl = document.getElementById("login-error");
const statusEl = document.getElementById("status");
const coursesListEl = document.getElementById("courses-list");
const courseTitleEl = document.getElementById("course-title");
const courseDescriptionEl = document.getElementById("course-description");
const activitiesSectionEl = document.getElementById("activities-section");
const activitiesGridEl = document.getElementById("activities-grid");
const btnMyPerformance = document.getElementById("btn-my-performance");
const courseContentEl = document.getElementById("course-content");
const performanceViewEl = document.getElementById("performance-view");
const performanceGridEl = document.getElementById("performance-grid");
const perfLoadingEl = document.getElementById("perf-loading");
const perfErrorEl = document.getElementById("perf-error");

function setStatus(msg) {
  const time = new Date().toLocaleTimeString();
  statusEl.textContent = `[${time}] ${msg}`;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return res.json();
}

// ─── Login ─────────────────────────────────────────────────────────────

document.getElementById("btn-login").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginErrorEl.textContent = "";
  setStatus("");

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    currentUser = {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.display_name,
      edumindStudentId: data.edumind_student_id,
      instituteId: data.institute_id || "LMS_INST_B",
    };

    navbarUserEl.textContent =
      (currentUser.displayName || currentUser.username) +
      (currentUser.edumindStudentId ? ` (${currentUser.edumindStudentId})` : "");

    loginInfoEl.textContent =
      `Logged in as ${currentUser.displayName || currentUser.username} | EduMind: ${currentUser.edumindStudentId || "NONE"}`;

    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    if (btnSignout) btnSignout.classList.remove("hidden");

    if (currentUser.edumindStudentId) {
      btnMyPerformance.classList.remove("hidden");
    }

    setStatus("Login successful. Select a course.");
    await loadCourses();
  } catch (err) {
    loginErrorEl.textContent = "Login failed: " + err.message;
  }
});

// ─── Sign out ───────────────────────────────────────────────────────────

if (btnSignout) {
  btnSignout.addEventListener("click", () => {
    currentUser = null;
    courses = [];
    activeCourse = null;

    navbarUserEl.textContent = "Not logged in";
    loginInfoEl.textContent = "";
    loginErrorEl.textContent = "";
    statusEl.textContent = "";

    dashboardView.classList.add("hidden");
    loginView.classList.remove("hidden");
    btnMyPerformance.classList.add("hidden");
    btnSignout.classList.add("hidden");

    coursesListEl.innerHTML = "";
    activitiesGridEl.innerHTML = "";
    activitiesSectionEl.classList.add("hidden");
    courseTitleEl.textContent = "Select a course";
    courseDescriptionEl.textContent = "Choose a course from the left to see its content.";

    performanceViewEl.classList.add("hidden");
    courseContentEl.classList.remove("hidden");

    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  });
}

// ─── Courses ────────────────────────────────────────────────────────────

document.getElementById("btn-load-courses").addEventListener("click", async () => {
  await loadCourses();
});

async function loadCourses() {
  if (!currentUser) return;

  setStatus("Loading courses...");
  try {
    const data = await api("/courses/");
    courses = data.courses || [];
    renderCourseList();

    if (courses.length === 0) {
      courseTitleEl.textContent = "No courses yet";
      courseDescriptionEl.textContent = "No courses are currently assigned to your account.";
      activitiesSectionEl.classList.add("hidden");
    } else if (!activeCourse) {
      selectCourse(courses[0].id);
    }
    setStatus("Courses loaded.");
  } catch (err) {
    console.error("Failed to load courses", err);
    setStatus("Failed to load courses: " + err.message);
  }
}

function renderCourseList() {
  coursesListEl.innerHTML = "";
  courses.forEach((course) => {
    const div = document.createElement("div");
    div.className = "course-item" + (activeCourse?.id === course.id ? " active" : "");
    div.textContent = course.title;
    div.addEventListener("click", () => selectCourse(course.id));
    coursesListEl.appendChild(div);
  });
}

// ─── Course activities with real materials ───────────────────────────────

const VARK_ACTIVITIES = [
  {
    id: "intro-video",
    type: "Video",
    vark: "auditory",
    title: "Introduction to Machine Learning",
    description: "Watch this lecture to learn core machine learning concepts.",
    content: `
      <div class="content-panel">
        <h4>Video: Introduction to Machine Learning</h4>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/ukzFI9rgwfU?rel=0" allowfullscreen></iframe>
        </div>
        <p class="small" style="margin-top:0.75rem;">3Blue1Brown – Neural Networks (YouTube)</p>
        <button class="primary" data-role="video-complete" style="margin-top:0.75rem;">Mark video as completed</button>
      </div>
    `,
    actions: [
      { label: "Play video", eventType: "video_play" },
      { label: "Complete video", eventType: "video_complete" },
    ],
  },
  {
    id: "ml-article",
    type: "Article",
    vark: "reading",
    title: "What is Machine Learning?",
    description: "Read this article on machine learning fundamentals.",
    content: `
      <div class="content-panel">
        <h4>What is Machine Learning?</h4>
        <div class="article-content">
          <p><strong>Machine learning (ML)</strong> is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.</p>
          <p>The process begins with observations or data, such as examples, direct experience, or instruction, to look for patterns in data and make better decisions in the future. The primary aim is to allow computers to learn automatically without human intervention.</p>
          <p><strong>Types of ML:</strong> Supervised learning (labeled data), unsupervised learning (unlabeled data), and reinforcement learning (reward-based). Common applications include recommendation systems, image recognition, natural language processing, and autonomous vehicles.</p>
        </div>
      </div>
    `,
    actions: [
      { label: "Read page", eventType: "page_view" },
    ],
  },
  {
    id: "ml-diagram",
    type: "Diagram",
    vark: "visual",
    title: "Neural Network Architecture",
    description: "Review this diagram showing a simple neural network.",
    content: `
      <div class="content-panel">
        <h4>Neural Network Architecture</h4>
        <div class="diagram-container">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">
            <defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#8b5cf6"/><stop offset="100%" style="stop-color:#6366f1"/></linearGradient></defs>
            <circle cx="50" cy="50" r="12" fill="url(#g1)" opacity="0.8"/><circle cx="50" cy="100" r="12" fill="url(#g1)" opacity="0.8"/><circle cx="50" cy="150" r="12" fill="url(#g1)" opacity="0.8"/>
            <circle cx="200" cy="60" r="12" fill="#06b6d4" opacity="0.8"/><circle cx="200" cy="100" r="12" fill="#06b6d4" opacity="0.8"/><circle cx="200" cy="140" r="12" fill="#06b6d4" opacity="0.8"/>
            <circle cx="350" cy="100" r="12" fill="#10b981" opacity="0.8"/>
            <line x1="62" y1="50" x2="188" y2="60" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="62" y1="100" x2="188" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="62" y1="150" x2="188" y2="140" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="60" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="100" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="140" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <text x="50" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Input</text>
            <text x="200" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Hidden</text>
            <text x="350" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Output</text>
          </svg>
        </div>
        <p class="small" style="margin-top:0.75rem;">Input layer → Hidden layers → Output layer</p>
      </div>
    `,
    actions: [
      { label: "View diagram", eventType: "resource_download" },
    ],
  },
  {
    id: "ml-quiz",
    type: "Quiz",
    vark: "kinesthetic",
    title: "ML Basics Quiz",
    description: "Test your knowledge with this short interactive quiz.",
    content: `
      <div class="content-panel">
        <h4>ML Basics Quiz</h4>
        <p>Which of the following is a type of machine learning?</p>
        <div class="quiz-options" id="quiz-options">
          <div class="quiz-option" data-value="a">Supervised learning</div>
          <div class="quiz-option" data-value="b">Unsupervised learning</div>
          <div class="quiz-option" data-value="c">Reinforcement learning</div>
          <div class="quiz-option" data-value="d">All of the above</div>
        </div>
        <button class="primary quiz-submit-btn" style="margin-top:0.75rem;">Submit answer</button>
        <div class="small quiz-feedback" style="margin-top:0.75rem;"></div>
      </div>
    `,
    actions: [],
  },
];

function selectCourse(courseId) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;

  performanceViewEl.classList.add("hidden");
  courseContentEl.classList.remove("hidden");

  activeCourse = course;
  renderCourseList();

  courseTitleEl.textContent = course.title;
  courseDescriptionEl.textContent =
    course.description || "This course combines lecture, reading, visual summary, and quiz activities.";

  activitiesGridEl.innerHTML = "";

  const courseActivities = JSON.parse(JSON.stringify(VARK_ACTIVITIES));
  
  if (course.title === "Web Development Fundamentals") {
    const videoAct = courseActivities.find(a => a.id === "intro-video");
    if (videoAct) {
      videoAct.title = "Introduction to Web Development";
      videoAct.description = "Watch this lecture to learn core web development concepts.";
      videoAct.content = `
      <div class="content-panel">
        <h4>Video: Introduction to Web Development</h4>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/hJHvdBlSxug?rel=0" allowfullscreen></iframe>
        </div>
        <p class="small" style="margin-top:0.75rem;">Web Development Fundamentals (YouTube)</p>
        <button class="primary" data-role="video-complete" style="margin-top:0.75rem;">Mark video as completed</button>
      </div>
      `;
    }
    
    const articleAct = courseActivities.find(a => a.id === "ml-article");
    if (articleAct) {
      articleAct.title = "What is Web Development?";
      articleAct.description = "Read this article on web fundamentals.";
      articleAct.content = `
      <div class="content-panel">
        <h4>What is Web Development?</h4>
        <div class="article-content">
          <p><strong>Web development</strong> refers to the creating, building, and maintaining of websites. It includes aspects such as web design, web publishing, web programming, and database management.</p>
          <p>It is the creation of an application that works over the internet i.e. websites. The word Web Development is made up of two words, that is:</p>
          <ul>
            <li><strong>Web:</strong> It refers to websites, web pages or anything that works over the internet.</li>
            <li><strong>Development:</strong> It refers to building the application from scratch.</li>
          </ul>
        </div>
      </div>
      `;
    }

    const diagramAct = courseActivities.find(a => a.id === "ml-diagram");
    if (diagramAct) {
      diagramAct.title = "Client-Server Architecture";
      diagramAct.description = "Review this diagram of how browsers and servers communicate.";
      diagramAct.content = `
      <div class="content-panel">
        <h4>Client-Server Architecture</h4>
        <div class="diagram-container">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">
            <defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#06b6d4"/><stop offset="100%" style="stop-color:#3b82f6"/></linearGradient></defs>
            <rect x="50" y="70" width="80" height="60" rx="8" fill="url(#g2)" />
            <rect x="270" y="70" width="80" height="60" rx="8" fill="#10b981" />
            <path d="M 140 90 L 260 90" stroke="#71717a" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrow)" />
            <path d="M 260 110 L 140 110" stroke="#71717a" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrow)" />
            <text x="90" y="105" text-anchor="middle" fill="#fff" font-size="12">Client</text>
            <text x="310" y="105" text-anchor="middle" fill="#fff" font-size="12">Server</text>
            <text x="200" y="80" text-anchor="middle" fill="#a1a1aa" font-size="10">Request (HTTP)</text>
            <text x="200" y="130" text-anchor="middle" fill="#a1a1aa" font-size="10">Response (HTML/JSON)</text>
          </svg>
        </div>
        <p class="small" style="margin-top:0.75rem;">Clients send requests to Servers, which return responses.</p>
      </div>
      `;
    }

    const quizAct = courseActivities.find(a => a.id === "ml-quiz");
    if (quizAct) {
      quizAct.title = "Web Basics Quiz";
      quizAct.description = "Test your knowledge on web foundations.";
      quizAct.content = `
      <div class="content-panel">
        <h4>Web Basics Quiz</h4>
        <p>What does HTML stand for?</p>
        <div class="quiz-options" id="quiz-options">
          <div class="quiz-option" data-value="a">Hyper Text Markup Language</div>
          <div class="quiz-option" data-value="b">High Tech Modern Language</div>
          <div class="quiz-option" data-value="c">Hyperlink and Text Markup Logic</div>
          <div class="quiz-option" data-value="d">Home Tool Markup Language</div>
        </div>
        <button class="primary quiz-submit-btn" style="margin-top:0.75rem;">Submit answer</button>
        <div class="small quiz-feedback" style="margin-top:0.75rem;"></div>
      </div>
      `;
    }
  } else if (course.title === "Computer Networks") {
    const videoAct = courseActivities.find(a => a.id === "intro-video");
    if (videoAct) {
      videoAct.title = "Introduction to Computer Networks";
      videoAct.description = "Watch this lecture to learn core networking concepts.";
      videoAct.content = `
      <div class="content-panel">
        <h4>Video: Introduction to Computer Networks</h4>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/tSodBEAJz9Y?rel=0" allowfullscreen></iframe>
        </div>
        <p class="small" style="margin-top:0.75rem;">Computer Networks Architecture (YouTube)</p>
        <button class="primary" data-role="video-complete" style="margin-top:0.75rem;">Mark video as completed</button>
      </div>
      `;
    }
    
    const articleAct = courseActivities.find(a => a.id === "ml-article");
    if (articleAct) {
      articleAct.title = "Understanding Networks";
      articleAct.description = "Read this overview of computer networking.";
      articleAct.content = `
      <div class="content-panel">
        <h4>Understanding Networks</h4>
        <div class="article-content">
          <p>A <strong>computer network</strong> is a set of computers sharing resources located on or provided by network nodes.</p>
          <p>The computers use common communication protocols over digital interconnections to communicate with each other. These interconnections are made up of telecommunication network technologies, based on physically wired, optical, and wireless radio-frequency methods.</p>
          <p>Keys concepts include <strong>LANs</strong> (Local Area Networks) and <strong>WANs</strong> (Wide Area Networks), as well as routing and switching devices that guide traffic.</p>
        </div>
      </div>
      `;
    }

    const diagramAct = courseActivities.find(a => a.id === "ml-diagram");
    if (diagramAct) {
      diagramAct.title = "OSI Model Layers";
      diagramAct.description = "Review the 7 layers of the OSI model.";
      diagramAct.content = `
      <div class="content-panel">
        <h4>OSI Model Layers</h4>
        <div class="diagram-container" style="background:var(--bg-elevated); padding:2rem; border-radius:12px;">
          <div style="display:flex; flex-direction:column; gap:0.5rem; max-width:250px; margin:0 auto;">
            <div style="background:#ef4444; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">7. Application</div>
            <div style="background:#f97316; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">6. Presentation</div>
            <div style="background:#f59e0b; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">5. Session</div>
            <div style="background:#10b981; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">4. Transport</div>
            <div style="background:#06b6d4; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">3. Network</div>
            <div style="background:#3b82f6; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">2. Data Link</div>
            <div style="background:#8b5cf6; color:white; padding:0.5rem; border-radius:4px; font-weight:bold;">1. Physical</div>
          </div>
        </div>
        <p class="small" style="margin-top:0.75rem;">Theoretical model for understanding network interactions.</p>
      </div>
      `;
    }

    const quizAct = courseActivities.find(a => a.id === "ml-quiz");
    if (quizAct) {
      quizAct.title = "Networking Quiz";
      quizAct.description = "Test your knowledge on network concepts.";
      quizAct.content = `
      <div class="content-panel">
        <h4>Networking Quiz</h4>
        <p>Which layer of the OSI model is responsible for routing (IP)?</p>
        <div class="quiz-options" id="quiz-options">
          <div class="quiz-option" data-value="a">Transport Layer</div>
          <div class="quiz-option" data-value="b">Data Link Layer</div>
          <div class="quiz-option" data-value="c">Network Layer</div>
          <div class="quiz-option" data-value="d">Application Layer</div>
        </div>
        <button class="primary quiz-submit-btn" style="margin-top:0.75rem;">Submit answer</button>
        <div class="small quiz-feedback" style="margin-top:0.75rem;"></div>
      </div>
      `;
    }
  } else if (course.title === "Software Engineering") {
    const videoAct = courseActivities.find(a => a.id === "intro-video");
    if (videoAct) {
      videoAct.title = "Introduction to Software Engineering";
      videoAct.description = "Watch this lecture to learn core software engineering concepts.";
      videoAct.content = `
      <div class="content-panel">
        <h4>Video: Introduction to Software Engineering</h4>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/Fi3_BjVzpqk?rel=0" allowfullscreen></iframe>
        </div>
        <p class="small" style="margin-top:0.75rem;">Software Engineering Principles (YouTube)</p>
        <button class="primary" data-role="video-complete" style="margin-top:0.75rem;">Mark video as completed</button>
      </div>
      `;
    }
    
    const articleAct = courseActivities.find(a => a.id === "ml-article");
    if (articleAct) {
      articleAct.title = "Engineering Software";
      articleAct.description = "Read about software development processes.";
      articleAct.content = `
      <div class="content-panel">
        <h4>Engineering Software</h4>
        <div class="article-content">
          <p><strong>Software engineering</strong> is the systematic application of engineering approaches to the development of software.</p>
          <p>It involves the disciplined application of proven methodologies to create reliable, efficient, and scalable software systems. The <strong>Software Development Life Cycle (SDLC)</strong> is a framework defining tasks performed at each step in the software development process.</p>
          <p>Popular methodologies include Agile, Waterfall, and DevOps practices.</p>
        </div>
      </div>
      `;
    }

    const diagramAct = courseActivities.find(a => a.id === "ml-diagram");
    if (diagramAct) {
      diagramAct.title = "SDLC Diagram";
      diagramAct.description = "Review the phases of the Software Development Life Cycle.";
      diagramAct.content = `
      <div class="content-panel">
        <h4>SDLC Phases</h4>
        <div class="diagram-container" style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap; padding:2rem; background:var(--bg-elevated); border-radius:12px;">
             <div style="background:#3b82f6; padding:1rem; border-radius:8px; color:white;">Planning</div>
             <div style="color:var(--text-muted); padding:1rem;">➔</div>
             <div style="background:#10b981; padding:1rem; border-radius:8px; color:white;">Design</div>
             <div style="color:var(--text-muted); padding:1rem;">➔</div>
             <div style="background:#f59e0b; padding:1rem; border-radius:8px; color:white;">Development</div>
             <div style="color:var(--text-muted); padding:1rem;">➔</div>
             <div style="background:#8b5cf6; padding:1rem; border-radius:8px; color:white;">Testing</div>
             <div style="color:var(--text-muted); padding:1rem;">➔</div>
             <div style="background:#ec4899; padding:1rem; border-radius:8px; color:white;">Deployment</div>
        </div>
        <p class="small" style="margin-top:0.75rem;">Standard flow of software implementation.</p>
      </div>
      `;
    }

    const quizAct = courseActivities.find(a => a.id === "ml-quiz");
    if (quizAct) {
      quizAct.title = "SDLC Quiz";
      quizAct.description = "Test your knowledge on software engineering.";
      quizAct.content = `
      <div class="content-panel">
        <h4>SDLC Quiz</h4>
        <p>Which phase immediately follows "Design" in a standard SDLC?</p>
        <div class="quiz-options" id="quiz-options">
          <div class="quiz-option" data-value="a">Planning</div>
          <div class="quiz-option" data-value="b">Development / Implementation</div>
          <div class="quiz-option" data-value="c">Testing</div>
          <div class="quiz-option" data-value="d">Deployment</div>
        </div>
        <button class="primary quiz-submit-btn" style="margin-top:0.75rem;">Submit answer</button>
        <div class="small quiz-feedback" style="margin-top:0.75rem;"></div>
      </div>
      `;
    }
  }

  courseActivities.forEach((act) => {
    const card = document.createElement("div");
    card.className = `activity-card vark-${act.vark}`;
    card.innerHTML = `
      <div class="activity-type">${act.type}</div>
      <h4>${act.title}</h4>
      <p class="small">${act.description}</p>
      <div class="activity-actions"></div>
      <div class="activity-content-area" style="margin-top:1rem;"></div>
    `;

    const actionsDiv = card.querySelector(".activity-actions");
    const contentArea = card.querySelector(".activity-content-area");

    // Open button to show content
    const openBtn = document.createElement("button");
    openBtn.className = "outline";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      if (contentArea.innerHTML) {
        contentArea.innerHTML = "";
        openBtn.textContent = "Open";
      } else {
        contentArea.innerHTML = act.content;
        openBtn.textContent = "Close";

        // Natural interactions trigger events
        if (act.id === "intro-video") {
          // Opening the video counts as a play
          sendEventForCourse("video_play", course, act);
          const completeBtn = contentArea.querySelector("[data-role='video-complete']");
          if (completeBtn) {
            completeBtn.addEventListener("click", () => {
              sendEventForCourse("video_complete", course, act);
            });
          }
        } else if (act.id === "ml-article") {
          // Opening the article counts as a page view
          sendEventForCourse("page_view", course, act);
        } else if (act.id === "ml-diagram") {
          // Opening the diagram counts as viewing / downloading the resource
          sendEventForCourse("resource_download", course, act);
        } else if (act.id === "ml-quiz") {
          // First time opening the quiz counts as quiz_start
          if (!contentArea.dataset.quizStarted) {
            sendEventForCourse("quiz_start", course, act);
            contentArea.dataset.quizStarted = "true";
          }
          // Quiz option selection
          contentArea.querySelectorAll(".quiz-option").forEach((opt) => {
            opt.addEventListener("click", () => {
              contentArea.querySelectorAll(".quiz-option").forEach((o) => o.classList.remove("selected"));
              opt.classList.add("selected");
            });
          });
          // Quiz submission with feedback
          const submitBtn = contentArea.querySelector(".quiz-submit-btn");
          const feedbackEl = contentArea.querySelector(".quiz-feedback");
          if (submitBtn && feedbackEl) {
            submitBtn.addEventListener("click", () => {
              const selected = contentArea.querySelector(".quiz-option.selected");
              if (!selected) {
                feedbackEl.textContent = "Please choose an answer before submitting.";
                return;
              }
              const value = selected.dataset.value;
              const correct = value === "d";
              if (correct) {
                feedbackEl.textContent = "Correct! All of these are types of machine learning.";
              } else {
                feedbackEl.textContent = "Not quite. The correct answer is: All of the above.";
              }
              sendEventForCourse("quiz_submit", course, act);
            });
          }
        }
      }
    });
    actionsDiv.appendChild(openBtn);

    activitiesGridEl.appendChild(card);
  });

  activitiesSectionEl.classList.remove("hidden");
  setStatus(`Selected course ${course.title}. Natural interactions will trigger events.`);
}

// ─── Send event ─────────────────────────────────────────────────────────

async function sendEventForCourse(eventType, course, activity) {
  if (!currentUser) {
    setStatus("Please login first.");
    return;
  }

  const payload = {
    event_type: eventType,
    event_timestamp: new Date().toISOString(),
    lms_user_id: currentUser.id,
    session_id: "sess-" + currentUser.id,
    event_data: {
      course_id: course.id,
      course_title: course.title,
      activity_id: activity.id,
      activity_title: activity.title,
      activity_type: activity.type,
    },
  };

  try {
    setStatus(`Sending ${eventType} for ${activity.title}...`);
    const res = await api("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStatus(
      `Event sent: student_id=${res.student_id}, forwarded=${res.forwarded_to}`
    );
  } catch (err) {
    console.error("Failed to send event", err);
    setStatus("Failed to send event: " + err.message);
  }
}

// ─── My Performance ──────────────────────────────────────────────────────

btnMyPerformance.addEventListener("click", () => {
  courseContentEl.classList.add("hidden");
  performanceViewEl.classList.remove("hidden");
  activeCourse = null;
  renderCourseList();
  loadPerformance();
});

async function edumindFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try {
      const d = await res.json();
      detail = d.detail || "";
    } catch { }
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function loadPerformance() {
  if (!currentUser?.edumindStudentId) return;

  const sid = encodeURIComponent(currentUser.edumindStudentId);
  const iid = encodeURIComponent(currentUser.instituteId);

  perfLoadingEl.classList.remove("hidden");
  perfErrorEl.classList.add("hidden");
  performanceGridEl.innerHTML = "";
  setStatus("Loading performance data...");

  try {
    const [summary, dashboard, metrics, history30, analytics30, lsAnalytics, lsProfile] = await Promise.allSettled([
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/engagement/students/${sid}/summary`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/students/${sid}/dashboard?institute_id=${iid}`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/engagement/students/${sid}/metrics?days=7`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/engagement/students/${sid}/history?days=30`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/students/${sid}/analytics?days=30&institute_id=${iid}`),
      edumindFetch(`${EDUMIND_LEARNING_API}/api/v1/students/${sid}/analytics`),
      edumindFetch(`${EDUMIND_LEARNING_API}/api/v1/students/${sid}`),
    ]);

    perfLoadingEl.classList.add("hidden");

    const trendRows = pickEngagementTrendRows(val(analytics30), val(history30));

    performanceGridEl.innerHTML =
      renderEngagementCard(summary, metrics, dashboard, trendRows) +
      renderActivityGraphCard(metrics) +
      renderLearningStyleCard(lsAnalytics, lsProfile);
    setStatus("Performance data loaded.");
  } catch (err) {
    perfLoadingEl.classList.add("hidden");
    perfErrorEl.textContent = "Failed to load performance data: " + err.message;
    perfErrorEl.classList.remove("hidden");
    setStatus("Failed to load performance data.");
  }
}

function val(settled) {
  return settled.status === "fulfilled" ? settled.value : null;
}

/** Same series as EduMind /engagement: prefer institute-scoped analytics history, else raw score history. */
function pickEngagementTrendRows(analyticsPayload, historyArr) {
  const fromAnalytics =
    analyticsPayload &&
    Array.isArray(analyticsPayload.engagement_history) &&
    analyticsPayload.engagement_history.length > 0
      ? analyticsPayload.engagement_history
      : null;
  if (fromAnalytics) return fromAnalytics;
  if (historyArr && Array.isArray(historyArr) && historyArr.length > 0) return historyArr;
  return null;
}

function activityGraphSparkContent(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return `<p class="small">No daily metrics for this period.</p>`;
  }
  const vals = rows.map((d) =>
    (d.login_count || 0) * 3 +
    (d.page_views || 0) +
    (d.video_plays || 0) * 2 +
    (d.quiz_attempts || 0) * 4 +
    (d.assignments_submitted || 0) * 5 +
    (d.total_session_duration_minutes || 0) / 8 +
    ((d.forum_posts || 0) + (d.forum_replies || 0)) * 3
  );
  const max = Math.max(...vals, 1);
  const bars = rows.map((d, i) => {
    const h = Math.max(6, Math.round((vals[i] / max) * 100));
    const label = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `<div class="perf-spark-bar-wrap" title="${label}"><div class="perf-spark-bar" style="height:${h}%"></div></div>`;
  }).join("");
  return `<div class="perf-spark" aria-label="Daily relative activity">${bars}</div>
    <div class="perf-spark-caption">${rows.length} day window</div>`;
}

function renderActivityGraphCard(metricsSettled) {
  const rows = val(metricsSettled);
  return `<div class="perf-card">
    <div class="perf-card-title">Activity graph</div>
    ${activityGraphSparkContent(rows)}
  </div>`;
}

function riskBlockHtml(dashboardSettled) {
  const dash = val(dashboardSettled);
  if (!dash || !dash.current_status) {
    return `<div class="perf-eng-section">
      <div class="perf-subheading">Risk and disengagement</div>
      <p class="small">Risk data unavailable.</p>
    </div>`;
  }
  const status = dash.current_status;
  const riskLevel = status.risk_level || "Unknown";
  const atRisk = status.at_risk;
  const prob = status.risk_probability != null ? Math.round(status.risk_probability * 100) : null;
  const riskClass =
    riskLevel === "High" ? "risk-high" :
      riskLevel === "Medium" ? "risk-med" :
        riskLevel === "Low" ? "risk-low" : "risk-unknown";
  const riskIcon = atRisk ? "⚠" : "✓";
  return `<div class="perf-eng-section">
    <div class="perf-subheading">Risk status and disengagement probability</div>
    <div class="perf-risk-row">
      <span class="perf-risk-badge ${riskClass}">${riskIcon} ${riskLevel}</span>
      ${prob != null ? `<span class="perf-risk-prob">Disengagement probability: <strong>${prob}%</strong></span>` : ""}
    </div>
  </div>`;
}

function engagementTrend30EmbedHtml(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return `<div class="perf-eng-section">
      <div class="perf-subheading">Engagement Trend (Last 30 Days)</div>
      <p class="small">No engagement score history for this period.</p>
    </div>`;
  }

  const scores = rows.map((r) => Math.max(0, Math.min(100, Number(r.engagement_score) || 0)));
  const n = scores.length;
  const W = 720;
  const H = 220;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMin = 0;
  const yMax = 100;
  const xAt = (i) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (s) => padT + plotH - ((s - yMin) / (yMax - yMin)) * plotH;

  const linePts = scores.map((s, i) => `${xAt(i).toFixed(2)},${yAt(s).toFixed(2)}`).join(" ");
  const firstX = xAt(0).toFixed(2);
  const lastX = xAt(n - 1).toFixed(2);
  const baseY = (padT + plotH).toFixed(2);
  const areaD = `M ${firstX},${baseY} L ${scores.map((s, i) => `${xAt(i).toFixed(2)},${yAt(s).toFixed(2)}`).join(" L ")} L ${lastX},${baseY} Z`;

  const labelStart = new Date(rows[0].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const labelMid = n > 2
    ? new Date(rows[Math.floor(n / 2)].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const labelEnd = new Date(rows[n - 1].date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const yTicks = [0, 50, 100];
  const gridAndLabels = yTicks.map((t) => {
    const y = yAt(t).toFixed(2);
    return `<line class="perf-trend-grid" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" />
      <text class="perf-trend-y-label" x="${padL - 6}" y="${y}" dominant-baseline="middle" text-anchor="end">${t}</text>`;
  }).join("");

  const xLabelsInner = n > 2
    ? `<text class="perf-trend-x-label" x="${padL}" y="${H - 6}" text-anchor="start">${labelStart}</text>
       <text class="perf-trend-x-label" x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle">${labelMid}</text>
       <text class="perf-trend-x-label" x="${W - padR}" y="${H - 6}" text-anchor="end">${labelEnd}</text>`
    : `<text class="perf-trend-x-label" x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle">${labelStart}</text>`;

  return `<div class="perf-eng-section">
    <div class="perf-subheading">Engagement Trend (Last 30 Days)</div>
    <p class="perf-trend-caption">Daily engagement score (0–100)</p>
    <div class="perf-trend-chart-wrap">
      <svg class="perf-trend-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Engagement score over the last ${n} days">
        <defs>
          <linearGradient id="perfTrendFillEmbed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgb(37, 99, 235)" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="rgb(37, 99, 235)" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${gridAndLabels}
        <path class="perf-trend-area" d="${areaD}" fill="url(#perfTrendFillEmbed)" />
        <polyline class="perf-trend-line" fill="none" points="${linePts}" />
        ${scores.map((s, i) => `<circle class="perf-trend-dot" cx="${xAt(i).toFixed(2)}" cy="${yAt(s).toFixed(2)}" r="2.5" />`).join("")}
        ${xLabelsInner}
      </svg>
    </div>
  </div>`;
}

function renderEngagementCard(summarySettled, metricsSettled, dashboardSettled, trendRows) {
  const data = val(summarySettled);
  if (!data) {
    return `<div class="perf-card">
      <div class="perf-card-title">Engagement Summary</div>
      <p class="small">Could not load engagement data.</p>
    </div>`;
  }

  const score = Math.round(data.avg_engagement_score || 0);
  const days = data.days_tracked || 0;
  const scoreClass = score >= 70 ? "score-high" : score >= 40 ? "score-med" : "score-low";

  return `<div class="perf-card perf-card-wide">
    <div class="perf-card-title">Engagement Summary</div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Avg engagement</span>
      <span class="perf-stat-value perf-eng-avg"><span class="perf-score-badge-inline ${scoreClass}">${score}%</span></span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Days tracked</span>
      <span class="perf-stat-value">${days}</span>
    </div>
    ${riskBlockHtml(dashboardSettled)}
    ${engagementTrend30EmbedHtml(trendRows)}
  </div>`;
}

function renderLearningStyleCard(analyticsSettled, profileSettled) {
  const data = val(analyticsSettled);
  if (!data) {
    return `<div class="perf-card">
      <div class="perf-card-title">Learning Style</div>
      <p class="small">Could not load learning style data.</p>
    </div>`;
  }

  const profile = val(profileSettled);
  const style = data.learning_style || "Unknown";
  const trend = data.engagement_trend || "stable";
  const effectiveTypes = data.most_effective_resource_types || [];
  const probs = profile && typeof profile.style_probabilities === "object" && profile.style_probabilities
    ? profile.style_probabilities
    : {};

  const styleIcons = {
    Visual: "👁",
    Auditory: "🎧",
    Reading: "📖",
    Kinesthetic: "✋",
    Mixed: "🔄",
  };
  const icon = styleIcons[style] || "❓";

  const probEntries = Object.entries(probs)
    .map(([name, p]) => ({ name, pct: typeof p === "number" ? Math.round(p * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  let probsHtml = "";
  if (probEntries.length > 0) {
    const maxPct = Math.max(...probEntries.map((e) => e.pct), 1);
    probsHtml = `<div class="perf-eng-section">
      <div class="perf-subheading">All style estimates</div>
      ${probEntries.map(({ name, pct }) => {
      const isCurrent = name.toLowerCase() === String(style).toLowerCase();
      const barW = Math.round((pct / maxPct) * 100);
      return `<div class="perf-style-prob-row${isCurrent ? " perf-style-prob-row--current" : ""}">
          <span class="perf-style-prob-name">${name}</span>
          <div class="perf-style-prob-bar-bg"><div class="perf-style-prob-bar" style="width:${barW}%"></div></div>
          <span class="perf-style-prob-pct">${pct}%</span>
        </div>`;
    }).join("")}
    </div>`;
  } else {
    probsHtml = `<div class="perf-eng-section"><p class="small">Style percentages will appear when the learning-style profile includes model scores.</p></div>`;
  }

  const bestTypesLabel = effectiveTypes.length
    ? effectiveTypes.map((t) => (t.count != null ? `${t.resource_type} (${t.count})` : t.resource_type)).join(", ")
    : "—";

  const trendIcon = trend.toLowerCase().includes("improv") ? "↑" : trend.toLowerCase().includes("declin") ? "↓" : "•";
  const trendClass = trend.toLowerCase().includes("improv") ? "trend-up" : trend.toLowerCase().includes("declin") ? "trend-down" : "trend-stable";

  return `<div class="perf-card">
    <div class="perf-card-title">Learning Style</div>
    <div class="perf-style-row">
      <span class="perf-style-icon">${icon}</span>
      <div>
        <div class="perf-subheading" style="margin-bottom:0.25rem;">Current learning style</div>
        <div class="perf-style-name">${style}</div>
      </div>
    </div>
    ${probsHtml}
    <div class="perf-stat-row">
      <span class="perf-stat-label">Best resource types</span>
      <span class="perf-stat-value">${bestTypesLabel}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Engagement trend</span>
      <span class="perf-stat-value ${trendClass}">${trendIcon} ${trend}</span>
    </div>
  </div>`;
}